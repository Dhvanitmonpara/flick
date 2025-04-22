import mongoose, { Schema } from "mongoose";

const postSchema = new mongoose.Schema({
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
  message: {
    type: String,
    required: true,
  },
}, {timestamps: true});

export const PostModel = mongoose.model("Post", postSchema);
