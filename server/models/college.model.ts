import mongoose, { Schema } from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    profile: {
      type: String,
      required: true,
      trim: true,
    }
  },
  { timestamps: true }
);

const collegeModel = mongoose.model("College", collegeSchema);

export default collegeModel;
