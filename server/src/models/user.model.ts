import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, trim: true, index: true },
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
  if (
    !process.env.ACCESS_TOKEN_SECRET ||
    typeof process.env.ACCESS_TOKEN_EXPIRY == "undefined"
  ) {
    throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
  }
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      isVerified: this.isVerified,
      isBlocked: this.isBlocked,
      suspensionEnds: this.suspension.ends,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY as `${number}m`,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  if (
    !process.env.REFRESH_TOKEN_SECRET ||
    !process.env.REFRESH_TOKEN_EXPIRY ||
    typeof process.env.REFRESH_TOKEN_EXPIRY == "undefined"
  ) {
    throw new Error("REFRESH_TOKEN_SECRET environment variable is not set");
  }
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY as `${number}d`,
    }
  );
};

const userModel = mongoose.model("User", userSchema);

export default userModel;
