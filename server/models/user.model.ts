import mongoose, { Schema } from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    college: { type: Schema.Types.ObjectId, ref: "College", trim: true },
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      }
    ],
    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    branch: { type: String, trim: true },
    clerkId: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
); // Adds createdAt and updatedAt fields

const userModel = mongoose.model("User", UserSchema);

export default userModel;
