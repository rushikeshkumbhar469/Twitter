import mongoose from "mongoose";

const MessageSchema = mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: "" },
  text: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Message", MessageSchema);
