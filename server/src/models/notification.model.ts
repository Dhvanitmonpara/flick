import mongoose, { Schema } from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
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
    type: {
      type: String,
      enum: [
        "general",
        "upvoted_post",
        "upvoted_comment",
        "replied",
        "posted",
        "re-posted",
      ],
      default: "general",
    },
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.model(
  "Notification",
  notificationSchema
);
