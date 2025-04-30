import mongoose, { Schema } from "mongoose";

const reportModel = new mongoose.Schema({
  postId: {
    type: Schema.Types.ObjectId,
    ref: "Post",
  },
  commentId: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "resolved", "ignored"],
    default: "pending",
  },  
  message: {
    type: String,
    required: true,
  },
}, {timestamps: true});

export const ReportModel = mongoose.model("Report", reportModel);
