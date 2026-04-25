import cors from "cors";
import mongoose from "mongoose";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import User from "./modals/user.js";
import Tweet from "./modals/tweet.js";
import Notification from "./modals/notification.js";
import Comment from "./modals/comment.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import Razorpay from "razorpay";
import twilio from "twilio";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// ─── Socket.IO Setup ─────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Map userId → socketId for targeted notifications
const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  }

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("sendMessage", (data) => {
    // data: { conversationId, senderId, text, senderName, senderAvatar }
    io.to(data.conversationId).emit("newMessage", {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });
});

// Helper: push a real-time notification to a user if online
function emitNotification(recipientId, notification) {
  const sid = onlineUsers.get(String(recipientId));
  if (sid) io.to(sid).emit("notification", notification);
}

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://192.168.23.1:3000", "http://192.168.23.1:3001"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("Firebase Admin Initialized ✅");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT is not set in .env!");
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.send("Twitter backend is running ✅"));

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to DB ✅");
    httpServer.once("error", (err) => {
      if (err?.code === "EADDRINUSE") {
        console.log(`Port ${port} is already in use. Another backend instance is already running.`);
        return;
      }
      console.error("Server startup error:", err);
    });
    httpServer.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.log("DB error:", err.message));

const otpStore = new Map();
const loginOtpStore = new Map();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ─── Subscription plan config ────────────────────────────────────────────────
const PLANS = {
  free:   { label: "Free",   priceINR: 0,    tweetLimit: 10,       unlimited: false },
  bronze: { label: "Bronze", priceINR: 100,  tweetLimit: 3,        unlimited: false },
  silver: { label: "Silver", priceINR: 200,  tweetLimit: 5,        unlimited: false },
  gold:   { label: "Gold",   priceINR: 300,  tweetLimit: Infinity, unlimited: true  },
};

function getISTHour() {
  const now = new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).getUTCHours();
}

function currentMonthYear() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

function parseClientContext(userAgent = "") {
  const ua = userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod/.test(ua);

  let browser = "Other";
  if (ua.includes("edg")) browser = "Microsoft Edge";
  else if (ua.includes("trident") || ua.includes("msie")) browser = "Internet Explorer";
  else if (ua.includes("chrome")) browser = "Google Chrome";
  else if (ua.includes("firefox")) browser = "Mozilla Firefox";
  else if (ua.includes("safari")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";

  // Refine device type: if it's a desktop OS, call it "Laptop/Desktop"
  let deviceType = isMobile ? "mobile" : "laptop/desktop";

  return {
    browser,
    os,
    deviceType,
    isChrome: browser === "Google Chrome",
    isMicrosoftBrowser: browser === "Microsoft Edge" || browser === "Internet Explorer",
  };
}

// Global Middleware to enforce Mobile Access Window (10 AM - 1 PM IST)
app.use((req, res, next) => {
  // Skip check for root or static files or system-critical routes
  if (
    req.path === "/" || 
    req.path.startsWith("/uploads") || 
    req.path.startsWith("/login-access") ||
    req.path === "/upload-image"
  ) {
    return next();
  }

  const ua = req.headers["user-agent"] || "";
  const context = parseClientContext(ua);
  
  if (context.deviceType === "mobile") {
    const istHour = getISTHour();
    if (istHour < 10 || istHour >= 13) {
      return res.status(403).send({ 
        error: "Mobile access is allowed only between 10:00 AM and 1:00 PM IST.",
        policyRestricted: true 
      });
    }
  }
  next();
});

async function addLoginHistory(email, details) {
  await User.findOneAndUpdate(
    { email },
    { $push: { loginHistory: { ...details, loginAt: new Date() } } },
    { returnDocument: "before" }
  );
}

// ─── Payment Routes ───────────────────────────────────────────────────────────
app.post("/create-order", async (req, res) => {
  try {
    const { email, plan } = req.body;
    if (!email || !plan) return res.status(400).send({ error: "Email and plan are required" });
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).send({ error: "Invalid plan" });
    if (plan === "free") return res.status(400).send({ error: "Free plan does not require payment" });

    const istHour = getISTHour();
    if (istHour < 10 || istHour >= 11) {
      return res.status(403).send({ error: "Payments are only allowed between 10:00 AM and 11:00 AM IST." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const order = await razorpay.orders.create({
      amount: planConfig.priceINR,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { email, plan },
    });

    return res.status(200).send({
      orderId: order.id, amount: order.amount, currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, plan, planLabel: planConfig.label,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).send({ error: "Failed to create order" });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, plan } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email || !plan)
      return res.status(400).send({ error: "Missing payment verification fields" });

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).send({ error: "Invalid payment signature" });

    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).send({ error: "Invalid plan" });

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { subscriptionPlan: plan, subscriptionExpiry: expiry, tweetsThisMonth: 0, tweetMonthYear: currentMonthYear() } },
      { returnDocument: "after" }
    );
    if (!user) return res.status(404).send({ error: "User not found" });

    const invoiceDate = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    const amountINR = (planConfig.priceINR / 100).toFixed(2);
    const tweetInfo = planConfig.unlimited ? "Unlimited tweets" : `${planConfig.tweetLimit} tweets/month`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"Twitter Clone" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `Invoice – ${planConfig.label} Plan Subscription`,
          html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#000;color:#fff;border-radius:12px;padding:32px;border:1px solid #333;"><h1 style="color:#1d9bf0">Twitter Clone</h1><p style="color:#888">Payment Invoice</p><hr style="border-color:#333"><table style="width:100%;margin:20px 0;font-size:15px;"><tr><td style="color:#888;padding:6px 0">Plan</td><td style="text-align:right;font-weight:bold">${planConfig.label}</td></tr><tr><td style="color:#888;padding:6px 0">Amount Paid</td><td style="text-align:right;font-weight:bold">₹${amountINR}</td></tr><tr><td style="color:#888;padding:6px 0">Tweet Allowance</td><td style="text-align:right">${tweetInfo}</td></tr><tr><td style="color:#888;padding:6px 0">Valid Until</td><td style="text-align:right">${expiry.toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"})}</td></tr><tr><td style="color:#888;padding:6px 0">Payment ID</td><td style="text-align:right;font-size:12px;color:#1d9bf0">${razorpay_payment_id}</td></tr><tr><td style="color:#888;padding:6px 0">Date</td><td style="text-align:right">${invoiceDate}</td></tr></table><hr style="border-color:#333"><p style="color:#888;font-size:13px;text-align:center">Thank you for subscribing! Happy tweeting 🐦</p></div>`,
        });
      } catch (emailErr) { console.error("Invoice email error:", emailErr); }
    }

    return res.status(200).send({ message: `Successfully upgraded to ${planConfig.label} plan.`, plan, expiry });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).send({ error: "Payment verification failed" });
  }
});

app.get("/subscription-status", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).send({ error: "Email required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const plan = user.subscriptionPlan || "free";
    const monthYear = currentMonthYear();
    let tweetsUsed = user.tweetsThisMonth || 0;
    if (user.tweetMonthYear !== monthYear) tweetsUsed = 0;

    let effectivePlan = plan;
    if (plan !== "free" && user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) {
      effectivePlan = "free";
      await User.findOneAndUpdate({ email }, { $set: { subscriptionPlan: "free", subscriptionExpiry: null } });
    }

    const effectiveConfig = PLANS[effectivePlan];
    const tweetsRemaining = effectiveConfig.unlimited ? Infinity : Math.max(0, effectiveConfig.tweetLimit - tweetsUsed);

    return res.status(200).send({
      plan: effectivePlan,
      planLabel: effectiveConfig.label,
      tweetLimit: effectiveConfig.unlimited ? "Unlimited" : effectiveConfig.tweetLimit,
      tweetsUsed,
      tweetsRemaining: effectiveConfig.unlimited ? "Unlimited" : tweetsRemaining,
      subscriptionExpiry: user.subscriptionExpiry,
      plans: Object.entries(PLANS).map(([key, cfg]) => ({
        key, label: cfg.label, priceINR: cfg.priceINR / 100, tweetLimit: cfg.unlimited ? "Unlimited" : cfg.tweetLimit,
      })),
    });
  } catch (error) {
    return res.status(500).send({ error: "Failed to fetch subscription status" });
  }
});

// ─── OTP Routes ───────────────────────────────────────────────────────────────
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email is required" });
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, verified: false });
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER, to: email,
        subject: "Your Twitter Clone Audio OTP",
        text: `Your OTP for posting an audio tweet is: ${otp}\nThis is valid for 10 minutes.`,
      });
    } else { console.log(`[TEST MODE] OTP for ${email}: ${otp}`); }
    return res.status(200).send({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).send({ error: "Failed to send OTP" });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).send({ error: "Email and OTP required" });
    const storedData = otpStore.get(email);
    if (!storedData) return res.status(400).send({ error: "No pending OTP request found" });
    if (Date.now() > storedData.expiresAt) { otpStore.delete(email); return res.status(400).send({ error: "OTP expired" }); }
    if (storedData.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });
    otpStore.set(email, { ...storedData, verified: true, expiresAt: Date.now() + 5 * 60 * 1000 });
    return res.status(200).send({ message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).send({ error: "Failed to verify OTP" });
  }
});

const signupOtpStore = new Map();

app.post("/send-signup-otp", async (req, res) => {
  try {
    const { email, phone, language } = req.body;
    if (!email) return res.status(400).send({ error: "Email is required" });
    if (language !== "fr" && !phone) return res.status(400).send({ error: "Phone number is required for non-French languages" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const identifier = language === "fr" ? email : phone;
    
    signupOtpStore.set(identifier, { otp, expiresAt: Date.now() + 10 * 60 * 1000, verified: false });

    if (language === "fr") {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Your Twitter Clone Signup OTP",
          text: `Your OTP for signup is: ${otp}\nThis is valid for 10 minutes.`,
        });
      } else {
        console.log(`[TEST MODE] Signup Email OTP for ${email}: ${otp}`);
      }
      return res.status(200).send({ message: "Email OTP sent successfully" });
    } else {
      // ── Always print to console for testing ────────────────────────────
      console.log(`\n========================================`);
      console.log(`[OTP TEST MODE] Phone: ${phone}`);
      console.log(`[OTP TEST MODE] Generated OTP: ${otp}`);
      console.log(`========================================\n`);
      // ──────────────────────────────────────────────────────────────────
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: `Your Twitter Clone OTP is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
          });
          return res.status(200).send({ message: "Mobile OTP sent successfully via SMS" });
        } catch (err) {
          console.error("Twilio SMS Error:", err);
          // Still succeed so user can read OTP from backend console
          return res.status(200).send({ message: "SMS failed but OTP is printed in backend console for testing." });
        }
      } else {
        return res.status(200).send({ message: "Mobile OTP sent (check backend console for the code)" });
      }
    }
  } catch (error) {
    return res.status(500).send({ error: "Failed to send signup OTP" });
  }
});

app.post("/verify-signup-otp", async (req, res) => {
  try {
    const { email, phone, language, otp } = req.body;
    const identifier = language === "fr" ? email : phone;
    if (!identifier || !otp) return res.status(400).send({ error: "Identifier and OTP required" });

    const storedData = signupOtpStore.get(identifier);
    if (!storedData) return res.status(400).send({ error: "No pending OTP request found" });
    if (Date.now() > storedData.expiresAt) { 
      signupOtpStore.delete(identifier); 
      return res.status(400).send({ error: "OTP expired" }); 
    }
    if (storedData.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });
    
    signupOtpStore.set(identifier, { ...storedData, verified: true, expiresAt: Date.now() + 5 * 60 * 1000 });
    return res.status(200).send({ message: "Signup OTP verified successfully" });
  } catch (error) {
    return res.status(500).send({ error: "Failed to verify signup OTP" });
  }
});

// ─── Audio Upload ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post("/upload-image", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).send({ error: err.message });
    }
    if (!req.file) return res.status(400).send({ error: "No image file provided" });
    res.status(200).send({ imageUrl: `/uploads/${req.file.filename}` });
  });
});

app.post("/upload-audio", upload.single("audio"), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email required for verification" });
    const istHour = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours();
    if (istHour < 14 || istHour >= 19) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(403).send({ error: "Audio uploads are only allowed between 2 PM and 7 PM IST" });
    }
    const storedData = otpStore.get(email);
    if (!storedData || !storedData.verified) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(401).send({ error: "Unauthorized. Please verify OTP first." });
    }
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(401).send({ error: "OTP verification expired. Please verify again." });
    }
    if (!req.file) return res.status(400).send({ error: "No audio file provided" });
    otpStore.delete(email);
    return res.status(200).send({ audioUrl: `/uploads/${req.file.filename}` });
  } catch (error) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    return res.status(500).send({ error: "Failed to upload audio" });
  }
});

// ─── User Routes ──────────────────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  try {
    const existinguser = await User.findOne({ email: req.body.email });
    if (existinguser) return res.status(200).send(existinguser);
    const newUser = new User(req.body);
    await newUser.save();
    return res.status(201).send(newUser);
  } catch (error) {
    return res.status(400).send({ message: error.message, name: error.name, code: error.code, keyValue: error.keyValue });
  }
});

app.post("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email required" });
    const user = await User.findOne({ email });
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.patch("/userupdate/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate({ email }, { $set: req.body }, { returnDocument: "after", upsert: false });
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.post("/login-access/initiate", async (req, res) => {
  try {
    const { email, userAgent } = req.body;
    if (!email) return res.status(400).send({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const context = parseClientContext(userAgent || req.headers["user-agent"] || "");
    const ipAddress = getClientIp(req);
    const istHour = getISTHour();

    if (context.deviceType === "mobile" && (istHour < 10 || istHour >= 13)) {
      await addLoginHistory(email, {
        ...context,
        ipAddress,
        policyAction: "mobile-time-restricted",
        success: false,
      });
      return res.status(403).send({ error: "Mobile login is allowed only between 10 AM and 1 PM IST." });
    }

    if (context.isMicrosoftBrowser) {
      await addLoginHistory(email, {
        ...context,
        ipAddress,
        policyAction: "microsoft-browser-allowed",
        success: true,
      });
      return res.status(200).send({ allow: true, otpRequired: false, policyAction: "microsoft-browser-allowed" });
    }

    if (context.isChrome) {
      const otp = crypto.randomInt(100000, 999999).toString();
      loginOtpStore.set(email, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        browser: context.browser,
        os: context.os,
        deviceType: context.deviceType,
        ipAddress,
      });

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Your Login OTP",
          text: `Your OTP for login is: ${otp}\nThis is valid for 10 minutes.`,
        });
      } else {
        console.log(`[TEST MODE] Login OTP for ${email}: ${otp}`);
      }
      return res.status(200).send({ allow: false, otpRequired: true, message: "OTP sent to email" });
    }

    await addLoginHistory(email, {
      ...context,
      ipAddress,
      policyAction: "standard-allowed",
      success: true,
    });
    return res.status(200).send({ allow: true, otpRequired: false, policyAction: "standard-allowed" });
  } catch (error) {
    return res.status(500).send({ error: "Failed to process login policy" });
  }
});

app.post("/login-access/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).send({ error: "Email and OTP are required" });

    const storedData = loginOtpStore.get(email);
    if (!storedData) return res.status(400).send({ error: "No pending login OTP request found" });
    if (Date.now() > storedData.expiresAt) {
      loginOtpStore.delete(email);
      return res.status(400).send({ error: "OTP expired" });
    }
    if (storedData.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });

    loginOtpStore.delete(email);
    await addLoginHistory(email, {
      browser: storedData.browser,
      os: storedData.os,
      deviceType: storedData.deviceType,
      ipAddress: storedData.ipAddress,
      policyAction: "chrome-otp-verified",
      success: true,
    });
    return res.status(200).send({ allow: true, message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).send({ error: "Failed to verify login OTP" });
  }
});

app.post("/login-history", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email required" });
    const user = await User.findOne({ email }).select("loginHistory");
    if (!user) return res.status(404).send({ error: "User not found" });
    const history = (user.loginHistory || []).slice().reverse();
    return res.status(200).send(history);
  } catch (error) {
    return res.status(500).send({ error: "Failed to fetch login history" });
  }
});

// ─── Follow / Unfollow ────────────────────────────────────────────────────────
app.post("/user/:id/follow", async (req, res) => {
  try {
    const { currentUserId } = req.body;
    const targetId = req.params.id;
    if (currentUserId === targetId) return res.status(400).send({ error: "Cannot follow yourself" });

    const [me, target] = await Promise.all([User.findById(currentUserId), User.findById(targetId)]);
    if (!me || !target) return res.status(404).send({ error: "User not found" });

    const isFollowing = me.following.includes(targetId);
    if (isFollowing) {
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: currentUserId } });
    } else {
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: currentUserId } });
      const notif = await Notification.create({ recipient: targetId, sender: currentUserId, type: "follow" });
      const populated = await notif.populate("sender", "displayName avatar username");
      emitNotification(targetId, populated);
    }
    const updatedMe = await User.findById(currentUserId);
    return res.status(200).send({ following: updatedMe.following, isFollowing: !isFollowing });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Tweet CRUD ───────────────────────────────────────────────────────────────
app.post("/tweet", async (req, res) => {
  try {
    const { author } = req.body;
    if (author) {
      const user = await User.findById(author);
      if (user) {
        const plan = user.subscriptionPlan || "free";
        const monthYear = currentMonthYear();
        let effectivePlan = plan;
        if (plan !== "free" && user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) {
          effectivePlan = "free";
          await User.findByIdAndUpdate(author, { $set: { subscriptionPlan: "free", subscriptionExpiry: null } });
        }
        const effectiveConfig = PLANS[effectivePlan];
        let tweetsUsed = user.tweetsThisMonth || 0;
        if (user.tweetMonthYear !== monthYear) tweetsUsed = 0;
        if (!effectiveConfig.unlimited && tweetsUsed >= effectiveConfig.tweetLimit) {
          return res.status(403).send({ error: `Your ${effectiveConfig.label} plan allows only ${effectiveConfig.tweetLimit} tweet(s) per month. Please upgrade your plan.`, planLimitReached: true });
        }
        await User.findByIdAndUpdate(author, { $set: { tweetMonthYear: monthYear }, $inc: { tweetsThisMonth: 1 } });
        if (user.tweetMonthYear !== monthYear) await User.findByIdAndUpdate(author, { $set: { tweetsThisMonth: 1 } });
      }
    }
    const newTweet = new Tweet(req.body);
    await newTweet.save();
    const populated = await Tweet.findById(newTweet._id).populate("author");
    return res.status(201).send(populated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.get("/post", async (req, res) => {
  try {
    const tweets = await Tweet.find().sort({ timestamp: -1 }).populate("author");
    return res.status(200).send(tweets);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
app.delete("/tweet/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    // Only author can delete
    if (String(tweet.author) !== userId) {
      return res.status(403).send({ error: "You can only delete your own tweets" });
    }

    await Tweet.findByIdAndDelete(req.params.id);
    // Cleanup: delete associated comments and notifications
    await Comment.deleteMany({ tweet: req.params.id });
    await Notification.deleteMany({ tweet: req.params.id });

    return res.status(200).send({ message: "Tweet deleted successfully" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Like / Unlike ────────────────────────────────────────────────────────────
app.post("/tweet/:id/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    const hasLiked = tweet.likedBy.includes(userId);
    if (hasLiked) {
      tweet.likedBy.pull(userId);
      tweet.likes = Math.max(0, tweet.likes - 1);
    } else {
      tweet.likedBy.push(userId);
      tweet.likes += 1;
      if (String(tweet.author) !== userId) {
        const notif = await Notification.create({ recipient: tweet.author, sender: userId, type: "like", tweet: tweet._id });
        const populated = await notif.populate(["sender", "tweet"]);
        emitNotification(String(tweet.author), populated);
      }
    }
    await tweet.save();
    return res.status(200).send({ likes: tweet.likes, liked: !hasLiked, likedBy: tweet.likedBy });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Retweet / Unretweet ──────────────────────────────────────────────────────
app.post("/tweet/:id/retweet", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    const hasRetweeted = tweet.retweetedBy.includes(userId);
    if (hasRetweeted) {
      tweet.retweetedBy.pull(userId);
      tweet.retweets = Math.max(0, tweet.retweets - 1);
    } else {
      tweet.retweetedBy.push(userId);
      tweet.retweets += 1;
      if (String(tweet.author) !== userId) {
        const notif = await Notification.create({ recipient: tweet.author, sender: userId, type: "retweet", tweet: tweet._id });
        const populated = await notif.populate(["sender", "tweet"]);
        emitNotification(String(tweet.author), populated);
      }
    }
    await tweet.save();
    return res.status(200).send({ retweets: tweet.retweets, retweeted: !hasRetweeted, retweetedBy: tweet.retweetedBy });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Comments ─────────────────────────────────────────────────────────────────
app.post("/tweet/:id/comment", async (req, res) => {
  try {
    const { userId, content } = req.body;
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).send({ error: "Tweet not found" });

    const comment = await Comment.create({ tweet: req.params.id, author: userId, content });
    tweet.comments += 1;
    await tweet.save();

    const populated = await Comment.findById(comment._id).populate("author", "displayName avatar username");
    if (String(tweet.author) !== userId) {
      const notif = await Notification.create({ recipient: tweet.author, sender: userId, type: "comment", tweet: tweet._id });
      const populatedNotif = await notif.populate(["sender", "tweet"]);
      emitNotification(String(tweet.author), populatedNotif);
    }
    return res.status(201).send(populated);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.get("/tweet/:id/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ tweet: req.params.id })
      .sort({ createdAt: -1 })
      .populate("author", "displayName avatar username");
    return res.status(200).send(comments);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});
app.get("/user/:userId/replies", async (req, res) => {
  try {
    const comments = await Comment.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("author", "displayName avatar username");
    return res.status(200).send(comments);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────
app.post("/user/bookmark", async (req, res) => {
  try {
    const { userId, tweetId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ error: "User not found" });

    const isBookmarked = user.bookmarks.includes(tweetId);
    if (isBookmarked) {
      await User.findByIdAndUpdate(userId, { $pull: { bookmarks: tweetId } });
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { bookmarks: tweetId } });
    }
    const updated = await User.findById(userId);
    return res.status(200).send({ bookmarks: updated.bookmarks, isBookmarked: !isBookmarked });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.get("/user/:id/bookmarks", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: "bookmarks",
      populate: { path: "author", select: "displayName avatar username" },
      options: { sort: { timestamp: -1 } },
    });
    if (!user) return res.status(404).send({ error: "User not found" });
    return res.status(200).send(user.bookmarks);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.get("/notifications/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "displayName avatar username")
      .populate("tweet", "content");
    return res.status(200).send(notifications);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.put("/notifications/read-all", async (req, res) => {
  try {
    const { userId } = req.body;
    await Notification.updateMany({ recipient: userId, read: false }, { $set: { read: true } });
    return res.status(200).send({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.put("/notifications/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { $set: { read: true } });
    return res.status(200).send({ message: "Notification marked as read" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Explore / Search ─────────────────────────────────────────────────────────
app.get("/explore", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "") {
      const tweets = await Tweet.find().sort({ likes: -1, timestamp: -1 }).limit(20).populate("author", "displayName avatar username");
      return res.status(200).send({ tweets, users: [] });
    }
    const regex = new RegExp(query, "i");
    const [tweets, users] = await Promise.all([
      Tweet.find({ content: regex }).sort({ timestamp: -1 }).limit(20).populate("author", "displayName avatar username"),
      User.find({ $or: [{ username: regex }, { displayName: regex }] }).limit(10).select("displayName avatar username bio followers following"),
    ]);
    return res.status(200).send({ tweets, users });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

// ─── Forgot Password ──────────────────────────────────────────────────────────
function generateRandomPassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let password = "";
  for (let i = 0; i < length; i++) password += chars.charAt(crypto.randomInt(0, chars.length));
  return password;
}

const forgotPasswordOtpStore = new Map();

app.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).send({ error: "Email or phone number is required" });
    let user = await User.findOne({ email: identifier });
    if (!user) return res.status(404).send({ error: "User not found" });

    const now = new Date();
    if (user.lastForgotPasswordDate) {
      if (now - new Date(user.lastForgotPasswordDate) < 24 * 60 * 60 * 1000)
        return res.status(429).send({ error: "Warning: You can use forgot password only 1 time a day." });
    }

    const newPassword = generateRandomPassword(12);
    try {
      const userRecord = await admin.auth().getUserByEmail(user.email);
      await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    } catch (firebaseErr) {
      return res.status(500).send({ error: "Failed to update password in Firebase" });
    }

    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER, to: user.email,
          subject: "Your New Password",
          text: `Your new password is: ${newPassword}\nPlease login and change it if necessary.`,
        });
        emailSent = true;
      } catch (emailErr) { console.error("Failed to send password:", emailErr); }
    }

    user.lastForgotPasswordDate = now;
    await user.save();

    if (emailSent) return res.status(200).send({ message: "A new password has been sent to your email.", method: "email" });

    const otp = crypto.randomInt(100000, 999999).toString();
    forgotPasswordOtpStore.set(user.email, { otp, newPassword, expiresAt: Date.now() + 10 * 60 * 1000 });
    try {
      await transporter.sendMail({ from: process.env.EMAIL_USER, to: user.email, subject: "Password Reset OTP", text: `Your OTP: ${otp}` });
    } catch (otpEmailErr) { console.log(`[TEST MODE] OTP for ${user.email}: ${otp}`); }

    return res.status(200).send({ message: "Email delivery failed. An OTP has been generated for verification.", method: "otp_required", email: user.email });
  } catch (error) {
    return res.status(500).send({ error: "An unexpected error occurred." });
  }
});

app.post("/verify-forgot-password-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).send({ error: "Email and OTP are required" });
    const storedData = forgotPasswordOtpStore.get(email);
    if (!storedData) return res.status(400).send({ error: "No pending password reset OTP found" });
    if (Date.now() > storedData.expiresAt) { forgotPasswordOtpStore.delete(email); return res.status(400).send({ error: "OTP expired" }); }
    if (storedData.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });
    const newPassword = storedData.newPassword;
    forgotPasswordOtpStore.delete(email);
    return res.status(200).send({ message: "OTP verified successfully", newPassword });
  } catch (error) {
    return res.status(500).send({ error: "Failed to verify OTP" });
  }
});