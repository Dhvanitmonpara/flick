import { Request, Response } from "express";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import { ReportModel } from "../models/report.model.js";
import mongoose, { ClientSession } from "mongoose";
import { PostModel } from "../models/post.model.js";
import userModel from "../models/user.model.js";

const ALLOWED_STATUSES = ["pending", "resolved", "ignored"];
interface FieldToUpdate {
  [key: string]: boolean;
}

export const createReport = async (req: Request, res: Response) => {
  try {
    const { targetId, type, reason, message } = req.body;
    const userId = req.user?._id;

    if (!targetId || !type || !reason || !message || !userId) {
      throw new ApiError(
        400,
        "All fields (targetId, type, reason, message) are required"
      );
    }

    if (!["Post", "Comment"].includes(type)) {
      throw new ApiError(400, "Invalid report type");
    }

    const report = await ReportModel.create({
      type,
      targetId,
      reportedBy: userId,
      reason,
      message,
    });

    if (!report) throw new ApiError(500, "Failed to create report");

    res.status(201).json({
      success: true,
      report,
      message: "Report created successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error creating report", "CREATE_REPORT_ERROR");
  }
};

function buildReportPipeline(
  type: "Post" | "Comment" | "Both",
  fields: Record<string, 1>, // clean: keys you want from Post/Comment
  statuses: string[],
  skip: number,
  limit: number
): mongoose.PipelineStage[] {
  const matchStage: mongoose.PipelineStage.Match = {
    $match: {
      type: type === "Both" ? { $in: ["Post", "Comment"] } : type,
      status: { $in: statuses },
    },
  };

  const lookupTarget = (
    target: "posts" | "comments",
    alias: string
  ): mongoose.PipelineStage.Lookup => ({
    $lookup: {
      from: target,
      localField: "targetId",
      foreignField: "_id",
      as: alias,
    },
  });

  const basicStages: mongoose.PipelineStage[] = [
    matchStage,
    {
      $lookup: {
        from: "users",
        localField: "reportedBy",
        foreignField: "_id",
        as: "reporterDetails",
      },
    },
    { $unwind: "$reporterDetails" },
  ];

  const targetLookups: mongoose.PipelineStage[] =
    type === "Both"
      ? [
          lookupTarget("posts", "postDetails"),
          {
            $unwind: { path: "$postDetails", preserveNullAndEmptyArrays: true },
          },
          lookupTarget("comments", "commentDetails"),
          {
            $unwind: {
              path: "$commentDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ]
      : [
          lookupTarget(type === "Post" ? "posts" : "comments", "targetDetails"),
          { $unwind: "$targetDetails" },
        ];

  const groupStage: mongoose.PipelineStage.Group = {
    $group: {
      _id: "$targetId",
      targetDetails: {
        $first:
          type === "Both"
            ? { $ifNull: ["$postDetails", "$commentDetails"] }
            : "$targetDetails",
      },
      type: { $first: "$type" },
      reports: {
        $push: {
          _id: "$_id",
          reason: "$reason",
          message: "$message",
          status: "$status",
          createdAt: "$createdAt",
          reporter: {
            _id: "$reporterDetails._id",
            username: "$reporterDetails.username",
            isBlocked: "$reporterDetails.isBlocked",
            suspension: "$reporterDetails.suspension",
          },
        },
      },
    },
  };

  const projectFields: Record<string, any> = {
    _id: 0,
    targetId: "$_id",
    type: 1,
    reports: 1,
  };

  if (fields && Object.keys(fields).length > 0) {
    projectFields["targetDetails"] = fields;
  }

  return [
    ...basicStages,
    ...targetLookups,
    groupStage,
    { $sort: { "targetDetails.createdAt": -1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: projectFields },
  ];
}

export const getReports = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page)) || 1;
    const limit = Math.max(1, Number(req.query.limit)) || 10;
    const skip = (page - 1) * limit;

    const type = (req.query.type as "Post" | "Comment" | "Both") || "Both";

    const statusQuery = typeof req.query.status === "string" ? req.query.status : "";
    const requestedStatuses = statusQuery
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => ALLOWED_STATUSES.includes(s));

    const statuses = requestedStatuses.length ? requestedStatuses : ["pending"];

    let fields: Record<string, 1> = {};
    if (typeof req.query.fields === "string") {
      const fieldsArray = req.query.fields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      fields = Object.fromEntries(fieldsArray.map((field) => [field, 1]));
    }

    const pipeline = buildReportPipeline(type, fields, statuses, skip, limit);

    const [reports, totalReports] = await Promise.all([
      ReportModel.aggregate(pipeline),
      ReportModel.countDocuments({
        type,
        status: { $in: statuses },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        totalReports,
      },
      filters: { statuses },
      message: reports.length
        ? "Reported posts fetched successfully."
        : "No reported posts found.",
    });
  } catch (error) {
    console.error("Error fetching reported posts:", error);
    handleError(error, res, "Failed to fetch reported posts", "GET_REPORTS_ERROR");
  }
};

const updatePostStatus = async (
  req: Request,
  res: Response,
  fieldToUpdate: FieldToUpdate,
): Promise<void> => {
  const session: ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const { postId } = req.params;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new ApiError(400, "Invalid post ID");
    }

    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: fieldToUpdate },
      { new: true, session }
    );

    if (!updatedPost) {
      throw new ApiError(404, "Post not found.");
    }

    const reports = await ReportModel.updateMany(
      { targetId: updatedPost._id },
      { $set: { status: "resolved" } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      post: updatedPost,
      reportsUpdated: reports.modifiedCount,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(error as ApiError, res, "Failed to update post status", "UPDATE_POST_STATUS_ERROR");
  }
};

export const getUserReports = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    const reports = await ReportModel.find({ reportedBy: userId });

    const populatedReports = await Promise.all(
      reports.map(async (report) => {
        await report.populate("targetId");
        return report.toObject();
      })
    );

    res.status(200).json({
      success: true,
      reports: populatedReports,
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching user reports", "GET_USER_REPORTS_ERROR");
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    await ReportModel.findByIdAndDelete(reportId);

    res
      .status(200)
      .json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    handleError(error as ApiError, res, "Error deleting report", "DELETE_REPORT_ERROR");
  }
};

export const bulkDeleteReports = async (req: Request, res: Response) => {
  try {
    const { reportIds } = req.body;
    if (!Array.isArray(reportIds)) {
      throw new ApiError(400, "Report ids must be an array");
    }

    await ReportModel.deleteMany({ _id: { $in: reportIds } });

    res
      .status(200)
      .json({ success: true, message: "Reports deleted successfully" });
  } catch (error) {
    handleError(error as ApiError, res, "Error deleting reports", "BULK_DELETE_REPORTS_ERROR");
  }
};

export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (!["pending", "resolved", "ignored"].includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }

    const report = await ReportModel.findByIdAndUpdate(
      reportId,
      { status },
      { new: true }
    );

    res.status(200).json({ success: true, report });
  } catch (error) {
    handleError(error as ApiError, res, "Error updating report status", "UPDATE_REPORT_STATUS_ERROR");
  }
};

export const blockUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Find the user by ID
    const user = await userModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    // Block the user
    user.isBlocked = true;
    await user.save();

    res.status(200).json({ message: "User blocked successfully", user });
  } catch (error) {
    handleError(error as ApiError, res, "Error blocking user", "BLOCK_USER_ERROR");
  }
};

export const unblockUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Find the user by ID
    const user = await userModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    // Unblock the user
    user.isBlocked = false;
    await user.save();

    res.status(200).json({ message: "User unblocked successfully", user });
  } catch (error) {
    handleError(error as ApiError, res, "Error unblocking user", "UNBLOCK_USER_ERROR");
  }
};

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { ends, reason } = req.body; // 'ends' should be a date string (ISO format)

    if (!ends || !reason)
      throw new ApiError(400, "End date and reason are required");

    const user = await userModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    // Set suspension details
    user.suspension = {
      ends: new Date(ends),
      reason,
      howManyTimes: (user.suspension?.howManyTimes || 0) + 1,
    };
    user.isBlocked = true; // Block the user during suspension
    await user.save();

    res.status(200).json({ message: "User suspended successfully", user });
  } catch (error) {
    handleError(error as ApiError, res, "Error suspending user", "SUSPEND_USER_ERROR");
  }
};

export const getSuspensionStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Find the user by ID
    const user = await userModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    res.status(200).json({ suspension: user.suspension });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching suspension status", "GET_SUSPENSION_STATUS_ERROR");
  }
};

// Controller exports
export const banPost = (req: Request, res: Response) =>
  updatePostStatus(req, res, { isBanned: true });
export const unbanPost = (req: Request, res: Response) =>
  updatePostStatus(req, res, { isBanned: false });
export const shadowBanPost = (req: Request, res: Response) =>
  updatePostStatus(req, res, { isShadowBanned: true });
export const shadowUnbanPost = (req: Request, res: Response) =>
  updatePostStatus(req, res, { isShadowBanned: false });
