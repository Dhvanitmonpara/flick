import mongoose, { Schema } from "mongoose";

const voteSchema = new mongoose.Schema({
  postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  voteType: { type: String, enum: ["upvote", "downvote"], required: true },
  isForPost: { type: Boolean, default: true }, // True = vote for post, False = vote for comment
  commentId: { type: Schema.Types.ObjectId, ref: "Comment" }, // If it's a comment vote
}, { timestamps: true });

const VoteModel = mongoose.model("Vote", voteSchema);

export default VoteModel;