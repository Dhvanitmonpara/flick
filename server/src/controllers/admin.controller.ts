import { Request, Response } from "express";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import { ReportModel } from "../models/report.model.js";
import mongoose from "mongoose";
import { PostModel } from "../models/post.model.js";

const ALLOWED_STATUSES = ["pending", "resolved", "ignored"];

export const createReport = async (req: Request, res: Response) => {
  try {
    const { postId, commentId, reportedBy, reason, message } = req.body;

    if (!reason || !message || !reportedBy || (!postId && !commentId)) {
      throw new ApiError(400, "All fields are required");
    }

    const report = await ReportModel.create({
      postId,
      commentId,
      reportedBy,
      reason,
      message,
    });

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
      type: "post",
      status: { $in: finalStatuses },
    };

    const [reports, totalReports] = await Promise.all([
      ReportModel.find(filter)
        .populate({
          path: "targetId",
          select: "title slug", // populate post fields only
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
        ? "Reported posts fetched successfully"
        : "No reported posts found",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching reported posts");
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
      type: "comment",
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

interface FieldToUpdate {
  [key: string]: boolean;
}

const updatePostStatus = async (req: Request, res: Response, fieldToUpdate: FieldToUpdate): Promise<void> => {
  try {
    const { postId } = req.params;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: "Valid Post ID is required." });
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
    const reports = await ReportModel.find({ reportedBy: userId })
      .populate("postId")
      .populate("commentId");

    res.status(200).json({ success: true, reports });
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

// Controller exports
export const banPost = (req: Request, res: Response) => updatePostStatus(req, res, { isBanned: true });
export const unbanPost = (req: Request, res: Response) => updatePostStatus(req, res, { isBanned: false });
export const shadowBanPost = (req: Request, res: Response) => updatePostStatus(req, res, { isShadowBanned: true });
export const shadowUnbanPost = (req: Request, res: Response) => updatePostStatus(req, res, { isShadowBanned: false });