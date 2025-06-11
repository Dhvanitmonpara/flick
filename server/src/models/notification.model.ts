import mongoose, { Schema } from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    seen: {
      type: Boolean,
      default: false,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post"
    },
    receiverId: {
      type: String,
      required: true,
    },
    actorUsernames: [
      {
        type: String,
        required: true,
      },
    ],
    content: {
      type: String,
    },
    type: {
      type: String,
      enum: [
        "general",
        "upvoted_post",
        "upvoted_comment",
        "replied",
        "posted",
      ],
      default: "general",
    },
    _redisId: {
      type: String,
    },
    _retries: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.model(
  "Notification",
  notificationSchema
);
