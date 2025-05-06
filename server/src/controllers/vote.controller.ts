import { Request, Response } from "express";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import VoteModel from "../models/vote.model.js";
import userModel from "../models/user.model.js"
import { PostModel } from "../models/post.model.js";
import { CommentModel } from "../models/comments.model.js";

export const createVote = async (req: Request, res: Response) => {
  try {
    const { voteType, targetId, targetType } = req.body;
    console.log(voteType, targetId, targetType)

    if (!voteType || !targetId || !targetType) {
      throw new ApiError(
        400,
        "Vote type, targetId, and targetType are required"
      );
    }

    if (!["upvote", "downvote"].includes(voteType)) {
      throw new ApiError(400, "Invalid vote type");
    }

    if (!["post", "comment"].includes(targetType)) {
      throw new ApiError(400, "Invalid target type");
    }

    const vote = await VoteModel.create({
      postId: targetType === "post" ? targetId : null,
      commentId: targetType === "comment" ? targetId : null,
      userId: req.user?._id,
      voteType,
      type: targetType
    });

    if (!vote) throw new ApiError(500, "Failed to create vote");

    let target: any = null;
    if (targetType === "post") {
      target = await PostModel.findById(targetId).select("postedBy");
    } else {
      target = await CommentModel.findById(targetId).select("postedBy");
    }

    if (!target) throw new ApiError(404, `${targetType} not found`);

    const ownerId = target.postedBy;
    const karmaChange = voteType === "upvote" ? 1 : -1;

    await userModel.findByIdAndUpdate(ownerId, {
      $inc: { karma: karmaChange },
    });

    res.status(201).json({
      success: true,
      message: "Vote created successfully",
    });

  } catch (error) {
    handleError(error as ApiError, res, "Failed to vote");
  }
};

export const deleteVote = async (req: Request, res: Response) => {
  try {
    const { targetId, targetType } = req.body;

    if (!targetId || !targetType) {
      throw new ApiError(400, "targetId and targetType are required");
    }

    if (!["post", "comment"].includes(targetType)) {
      throw new ApiError(400, "Invalid target type");
    }

    const existingVote = await VoteModel.findOneAndDelete({
      userId: req.user?._id,
      postId: targetType === "post" ? targetId : undefined,
      commentId: targetType === "comment" ? targetId : undefined,
    });

    if (!existingVote) {
      throw new ApiError(404, "Vote not found");
    }

    let target: any = null;
    if (targetType === "post") {
      target = await PostModel.findById(targetId).select("postedBy");
    } else {
      target = await CommentModel.findById(targetId).select("postedBy");
    }

    if (!target) throw new ApiError(404, `${targetType} not found`);

    const ownerId = target.postedBy;
    const karmaChange = existingVote.voteType === "upvote" ? -1 : 1; 

    await userModel.findByIdAndUpdate(ownerId, {
      $inc: { karma: karmaChange },
    });

    res.status(200).json({
      success: true,
      message: "Vote deleted and karma updated successfully",
    });

  } catch (error) {
    handleError(error as ApiError, res, "Failed to delete vote");
  }
};

export const patchVote = async (req: Request, res: Response) => {
  try {
    const { voteType, targetId, targetType } = req.body;

    if (!voteType || !targetId || !targetType) {
      throw new ApiError(
        400,
        "Vote type, targetId, and targetType are required"
      );
    }

    if (!["upvote", "downvote"].includes(voteType)) {
      throw new ApiError(400, "Invalid vote type");
    }

    if (!["post", "comment"].includes(targetType)) {
      throw new ApiError(400, "Invalid target type");
    }

    const userId = req.user?._id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const existingVote = await VoteModel.findOne({
      userId,
      postId: targetType === "post" ? targetId : undefined,
      commentId: targetType === "comment" ? targetId : undefined,
    });

    if (!existingVote) {
      throw new ApiError(404, "Vote not found to patch");
    }

    // If voteType is the same, no need to patch
    if (existingVote.voteType === voteType) {
      res.status(200).json({
        success: true,
        message: "Vote already of the requested type",
      });
      return
    }

    existingVote.voteType = voteType;
    await existingVote.save();

    let target: any = null;
    if (targetType === "post") {
      target = await PostModel.findById(targetId).select("postedBy");
    } else {
      target = await CommentModel.findById(targetId).select("postedBy");
    }

    if (!target) {
      throw new ApiError(404, `${targetType} not found`);
    }

    const ownerId = target.postedBy;
    const karmaChange = (voteType === "upvote" ? 1 : -1) * 2;

    await userModel.findByIdAndUpdate(ownerId, {
      $inc: { karma: karmaChange },
    });

    res.status(200).json({
      success: true,
      message: "Vote updated successfully",
    });

  } catch (error) {
    handleError(error as ApiError, res, "Failed to patch vote");
  }
};
