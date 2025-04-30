import { Request, Response } from "express";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import { ReportModel } from "../models/report.model.js";

type statusType = "pending" | "resolved" | "ignored";

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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let statusQuery = (req.query.status as string) || "pending";

    const requestedStatuses = statusQuery
      .split(",")
      .map((status) => status.trim().toLowerCase())
      .filter(Boolean);

    const allowedStatuses = ["pending", "resolved", "ignored"];
    const validStatuses = requestedStatuses.filter((status) =>
      allowedStatuses.includes(status)
    );

    const finalStatuses =
      validStatuses.length > 0 ? validStatuses : ["pending"];

    const reports = await ReportModel.find({
      postId: { $exists: true },
      status: { $in: finalStatuses },
    })
      .populate("postId")
      .populate("reportedBy")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reports,
      page,
      limit,
      totalReports: reports.length,
      appliedFilters: finalStatuses,
      message: reports.length
        ? "Reported posts fetched successfully"
        : "No reported posts found",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching reported posts");
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
