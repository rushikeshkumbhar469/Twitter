import mongoose from "mongoose";

const NotificationSchema = mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["like", "retweet", "follow", "mention", "comment"],
      required: true,
    },
    tweet: { type: mongoose.Schema.Types.ObjectId, ref: "Tweet", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
