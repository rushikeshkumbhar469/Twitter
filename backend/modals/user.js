import mongoose from "mongoose";
const UserSchema = mongoose.Schema({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now },
  notificationsEnabled: { type: Boolean, default: false },
  lastForgotPasswordDate: { type: Date },
  language: { type: String, enum: ['en', 'hi', 'es', 'pt', 'zh', 'fr'], default: 'en' },
  phone: { type: String, default: "" },
  cover: { type: String, default: "" },

  // Social fields
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }],

  // Subscription fields
  subscriptionPlan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  subscriptionExpiry: { type: Date, default: null },
  tweetsThisMonth: { type: Number, default: 0 },
  tweetMonthYear: { type: String, default: "" },
  loginHistory: [
    {
      browser: { type: String, default: "Unknown" },
      os: { type: String, default: "Unknown" },
      deviceType: { type: String, enum: ["mobile", "laptop/desktop"], default: "laptop/desktop" },
      ipAddress: { type: String, default: "" },
      loginAt: { type: Date, default: Date.now },
      policyAction: { type: String, default: "standard" },
      success: { type: Boolean, default: true },
    },
  ],
});

export default mongoose.model("User", UserSchema);

