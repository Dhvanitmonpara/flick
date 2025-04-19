import mongoose, { Schema } from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
  },
  { timestamps: true }
); // Adds createdAt and updatedAt fields

const userModel = mongoose.model("User", UserSchema);

export default userModel;
