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

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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