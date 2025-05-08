import { Request, Response } from "express";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import { ReportModel } from "../models/report.model.js";
import mongoose from "mongoose";
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
    handleError(error as ApiError, res, "Error creating report");
  }
};

export const getReportedPosts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const statusQuery =
      typeof req.query.status === "string" ? req.query.status : "";
    const requestedStatuses = statusQuery
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => ALLOWED_STATUSES.includes(s));

    const statuses = requestedStatuses.length ? requestedStatuses : ["pending"];

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          type: "Post",
          status: { $in: statuses },
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "targetId",
          foreignField: "_id",
          as: "postDetails",
        },
      },
      { $unwind: "$postDetails" },
      {
        $lookup: {
          from: "users",
          localField: "reportedBy",
          foreignField: "_id",
          as: "reporterDetails",
        },
      },
      { $unwind: "$reporterDetails" },
      {
        $group: {
          _id: "$targetId",
          post: { $first: "$postDetails" },
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
      },
      { $sort: { "post.createdAt": -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          postId: "$_id",
          post: {
            _id: "$post._id",
            title: "$post.title",
            content: "$post.content",
            postedBy: "$post.postedBy",
            isBanned: "$post.isBanned",
            isShadowBanned: "$post.isShadowBanned",
          },
          reports: 1,
        },
      },
    ];    

    const [reports, totalReportsAgg] = await Promise.all([
      ReportModel.aggregate(pipeline),
      ReportModel.countDocuments({
        type: "Post",
        status: { $in: statuses },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: { page, limit, totalReports: totalReportsAgg },
      filters: { statuses },
      message: reports.length
        ? "Reported posts fetched successfully."
        : "No reported posts found.",
    });
  } catch (error) {
    console.error("Error fetching reported posts:", error);
    handleError(error, res, "Failed to fetch reported posts");
  }
};

export const getReportedComments = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const statusQuery = (req.query.status as string) || "pending";
    const requestedStatuses = statusQuery
      .split(",")
      .map((status) => status.trim().toLowerCase())
      .filter((status) => ALLOWED_STATUSES.includes(status));

    const finalStatuses = requestedStatuses.length
      ? requestedStatuses
      : ["pending"];

    const filter = {
      type: "Comment",
      status: { $in: finalStatuses },
    };

    const [reports, totalReports] = await Promise.all([
      ReportModel.find(filter)
        .populate({
          path: "targetId",
          select: "content postId",
        })
        .populate({
          path: "reportedBy",
          select: "name email",
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      ReportModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reports,
      page,
      limit,
      totalReports,
      appliedFilters: finalStatuses,
      message: reports.length
        ? "Reported comments fetched successfully"
        : "No reported comments found",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching reported comments");
  }
};

const updatePostStatus = async (
  req: Request,
  res: Response,
  fieldToUpdate: FieldToUpdate
): Promise<void> => {
  try {
    const { postId } = req.params;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res
        .status(400)
        .json({ success: false, message: "Valid Post ID is required." });
      return;
    }

    const updatedPost = await PostModel.findByIdAndUpdate(
      postId,
      { $set: fieldToUpdate },
      { new: true }
    );

    if (!updatedPost) {
      res.status(404).json({ success: false, message: "Post not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
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
    handleError(error as ApiError, res, "Error fetching user reports");
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
    handleError(error as ApiError, res, "Error deleting report");
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
    handleError(error as ApiError, res, "Error deleting reports");
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
    handleError(error as ApiError, res, "Error updating report status");
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
    handleError(error as ApiError, res, "Error blocking user");
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
    handleError(error as ApiError, res, "Error unblocking user");
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
    handleError(error as ApiError, res, "Error suspending user");
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
    handleError(error as ApiError, res, "Error fetching suspension status");
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
