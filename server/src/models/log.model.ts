import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    logVersion: {
      type: Number,
      default: 1,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "user_upvoted_post",
        "user_upvoted_comment",
        "user_downvoted_post",
        "user_downvoted_comment",
        "user_switched_vote_on_comment",
        "user_switched_vote_on_post",
        "user_created_post",
        "user_created_comment",
        "user_deleted_post",
        "user_deleted_comment",
        "user_reported_content",

        "admin_banned_user",
        "admin_unbanned_user",
        "admin_suspended_user",
        "admin_created_college",
        "admin_deleted_college",

        "system_created_admin_account",
        "admin_logged_out_self",
        "admin_initialized_account",
        "admin_verified_otp",
        "admin_removed_authorized_device",
        "admin_reset_email_otp",
        "admin_deleted_admin_account",
        "admin_updated_admin_account",
        "admin_fetched_all_admin_accounts",

        "system_logged_error",
        "system_logged_in",
        "system_logged_out",

        "other_action",
      ],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Flexible payload: device info, IP, videoId, errorCode, whatever.
    },
    sessionId: {
      type: String,
      // Link multiple logs together
    },
    platform: {
      type: String,
      required: true,
      enum: ["web", "mobile", "tv", "other"],
    },
    status: {
      type: String,
      enum: ["success", "fail"],
      default: "success",
    },
  },
  { timestamps: true }
);

export const LogModel = mongoose.model("Log", logSchema);
