import cors from "cors";
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import User from "./modals/user.js";
import Tweet from "./modals/tweet.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized ✅");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT is not set in .env!");
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}

// Serve uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Twittter backend is running successfully");
});

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to DB ✅");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log("error : ", err.message);
  });

// In-memory store for OTPs (in production, use Redis)
// Format: { email: { otp: "123456", expiresAt: 123456789, verified: false } }
const otpStore = new Map();

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email is required" });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP, valid for 10 minutes
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      verified: false
    });

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Twitter Clone Audio OTP",
        text: `Your OTP for posting an audio tweet is: ${otp}\nThis is valid for 10 minutes.`,
      });
      console.log(`OTP sent to email ${email}`);
    } else {
      // Fallback for local testing if ENV not set
      console.log(`[TEST MODE] OTP for ${email}: ${otp}`);
    }

    return res.status(200).send({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("OTP Send Error:", error);
    return res.status(500).send({ error: "Failed to send OTP" });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).send({ error: "Email and OTP required" });

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).send({ error: "No pending OTP request found" });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).send({ error: "OTP expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).send({ error: "Invalid OTP" });
    }

    // Mark as verified, good for 5 minutes of upload time
    otpStore.set(email, {
      ...storedData,
      verified: true,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    return res.status(200).send({ message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).send({ error: "Failed to verify OTP" });
  }
});

// Configure Multer for Audio Uploads (up to 100MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

app.post("/upload-audio", upload.single("audio"), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email required for verification" });

    // Enforce Time Restriction: 2 PM to 7 PM IST
    // IST is UTC+5:30 -> Create a Date object in IST
    const now = new Date();
    // Convert current UTC time to IST by adding 5 hours and 30 minutes
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const istHour = istTime.getUTCHours();

    // Check if between 14:00 and 19:00 IST (14 to 18 inclusive)
    if (istHour < 14 || istHour >= 19) {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path); // Delete the uploaded file if time is invalid
      }
      return res.status(403).send({ error: "Audio uploads are only allowed between 2 PM and 7 PM IST" });
    }

    // Verify OTP Session
    const storedData = otpStore.get(email);
    if (!storedData || !storedData.verified) {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(401).send({ error: "Unauthorized. Please verify OTP first." });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(401).send({ error: "OTP verification expired. Please verify again." });
    }

    if (!req.file) {
      return res.status(400).send({ error: "No audio file provided" });
    }

    // Consume the OTP session so it can't be reused for another file
    otpStore.delete(email);

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).send({ audioUrl: fileUrl });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).send({ error: "Failed to upload audio" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const existinguser = await User.findOne({ email: req.body.email });
    if (existinguser) {
      return res.status(200).send(existinguser);
    }
    const newUser = new User(req.body);
    await newUser.save();
    return res.status(201).send(newUser);
  } catch (error) {
    console.error("REGISTER ERROR FULL:", error);
    return res.status(400).send({
      message: error.message,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue,
    });
  }
});

app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    const user = await User.findOne({ email: email });
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.patch("/userupdate/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: req.body },
      { new: true, upsert: false }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});


app.post("/tweet", async (req, res) => {
  try {
    const newTweet = new Tweet(req.body);
    await newTweet.save();
    return res.status(201).send(newTweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

app.get("/post", async (req, res) => {
  try {
    const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Helper for generating password (only upper and lowercase)
function generateRandomPassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return password;
}

// Store forgot password OTP states
// Format: { email: { otp: "123456", newPassword: "GeneratedPassword", expiresAt: timestamp } }
const forgotPasswordOtpStore = new Map();

app.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).send({ error: "Email or phone number is required" });
    }

    // Attempt to find user by email in MongoDB
    let user = await User.findOne({ email: identifier });

    // For simplicity, if not found by email and it might be a phone number, 
    // we would ideally look them up in Firebase. Since we only store email in our User model,
    // we'll rely on the email lookup. If identifier is a phone number, we assume we might not 
    // have it in MongoDB properly mapped unless they registered it as their username/email.
    // We proceed assuming the user is found (or handle not found).
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const now = new Date();
    // Check 1 time per day limit
    if (user.lastForgotPasswordDate) {
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - new Date(user.lastForgotPasswordDate) < oneDay) {
        return res.status(429).send({ error: "Warning: You can use forgot password only 1 time a day." });
      }
    }

    // Generate new password
    const newPassword = generateRandomPassword(12);

    // Update Firebase Auth
    try {
      // Find the Firebase user by email
      const userRecord = await admin.auth().getUserByEmail(user.email);
      // Update the password
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });
    } catch (firebaseErr) {
      console.error("Firebase update user error:", firebaseErr);
      return res.status(500).send({ error: "Failed to update password in Firebase" });
    }

    // Try to email the password
    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Your New Password",
          text: `Your new password is: ${newPassword}\nPlease login and change it if necessary.`,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Failed to send password via email:", emailErr);
      }
    }

    // Update the lastForgotPasswordDate in DB
    user.lastForgotPasswordDate = now;
    await user.save();

    if (emailSent) {
      return res.status(200).send({
        message: "A new password has been sent to your email.",
        method: "email"
      });
    } else {
      // Fallback: Email failed. We need to verify OTP before showing it.
      const otp = crypto.randomInt(100000, 999999).toString();

      forgotPasswordOtpStore.set(user.email, {
        otp,
        newPassword,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      // We still try to send the OTP via email (even though the password email failed, 
      // maybe it was a transient error, or we just rely on the fallback logic)
      // If we literally can't send emails at all, the user will be stuck. Assuming it's a transient failure 
      // or we just want to demonstrate the OTP flow:
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Password Reset OTP",
          text: `Your OTP to view your new password is: ${otp}`,
        });
      } catch (otpEmailErr) {
        console.error("Also failed to send OTP email:", otpEmailErr);
        // If we can't send an email at all, we might log it for testing
        console.log(`[TEST MODE] Forgot Password OTP for ${user.email}: ${otp}`);
      }

      return res.status(200).send({
        message: "Email delivery failed. An OTP has been generated for verification before displaying the password.",
        method: "otp_required",
        email: user.email // send back email to help frontend track state
      });
    }

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).send({ error: "An unexpected error occurred." });
  }
});

app.post("/verify-forgot-password-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).send({ error: "Email and OTP are required" });

    const storedData = forgotPasswordOtpStore.get(email);
    if (!storedData) {
      return res.status(400).send({ error: "No pending password reset OTP found" });
    }

    if (Date.now() > storedData.expiresAt) {
      forgotPasswordOtpStore.delete(email);
      return res.status(400).send({ error: "OTP expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).send({ error: "Invalid OTP" });
    }

    // OTP is valid, supply the new password to the frontend
    const newPassword = storedData.newPassword;
    forgotPasswordOtpStore.delete(email); // Clean up

    return res.status(200).send({
      message: "OTP verified successfully",
      newPassword: newPassword
    });

  } catch (error) {
    return res.status(500).send({ error: "Failed to verify OTP" });
  }
});