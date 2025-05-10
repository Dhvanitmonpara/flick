import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../conf/env.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: ["light", "dark"],
      default: "dark",
    },
    lookupEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    college: { type: Schema.Types.ObjectId, ref: "College", trim: true },
    branch: { type: String, trim: true },
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    isBlocked: { type: Boolean, default: false },
    suspension: {
      ends: {
        type: Date,
        default: null,
      },
      reason: {
        type: String,
        default: null,
      },
      howManyTimes: {
        type: Number,
        default: 0,
      },
    },
    refreshToken: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      isVerified: this.isVerified,
    },
    env.accessTokenSecret,
    {
      expiresIn: `${parseInt(env.accessTokenExpiry)}m`,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    env.refreshTokenSecret,
    {
      expiresIn: `${parseInt(env.refreshTokenExpiry)}d`,
    }
  );
};

const userModel = mongoose.model("User", userSchema);

export default userModel;
