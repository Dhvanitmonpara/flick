import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    college: { type: Schema.Types.ObjectId, ref: "College", trim: true },
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    branch: { type: String, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  if (!process.env.ACCESS_TOKEN_SECRET || typeof process.env.ACCESS_TOKEN_EXPIRY == "undefined") {
    throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
  }
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: parseInt(process.env.ACCESS_TOKEN_EXPIRY),
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  if (!process.env.REFRESH_TOKEN_SECRET || typeof process.env.REFRESH_TOKEN_EXPIRY == "undefined") {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is not set');
  }
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRY),
    }
  );
};

const userModel = mongoose.model("User", userSchema);

export default userModel;
