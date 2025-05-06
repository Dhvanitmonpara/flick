import { Request, Response } from "express";
import { CommentModel } from "../models/comments.model.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import handleError from "../services/HandleError.js";

export const getCommentsByPostId = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const userId = (req.query.user as string) || null;

    if (!postId) throw new ApiError(400, "Post ID is required");

    const aggregationPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          postId: new mongoose.Types.ObjectId(postId),
          isBanned: false,
        },
      },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: (page - 1) * limit },
      { $limit: limit },

      // Lookup commentedBy user
      {
        $lookup: {
          from: "users",
          localField: "commentedBy",
          foreignField: "_id",
          as: "commentedBy",
        },
      },
      { $unwind: { path: "$commentedBy", preserveNullAndEmptyArrays: true } },

      // Lookup user's college
      {
        $lookup: {
          from: "colleges",
          localField: "commentedBy.college",
          foreignField: "_id",
          as: "commentedBy.college",
        },
      },
      {
        $unwind: {
          path: "$commentedBy.college",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup votes for this comment
      {
        $lookup: {
          from: "votes",
          localField: "_id",
          foreignField: "commentId", // 🛠️ Fixed
          as: "votes",
        },
      },

      // Add upvoteCount and downvoteCount
      {
        $addFields: {
          upvoteCount: {
            $size: {
              $filter: {
                input: "$votes",
                as: "vote",
                cond: { $eq: ["$$vote.voteType", "upvote"] },
              },
            },
          },
          downvoteCount: {
            $size: {
              $filter: {
                input: "$votes",
                as: "vote",
                cond: { $eq: ["$$vote.voteType", "downvote"] },
              },
            },
          },
        },
      },

      // If userId exists, lookup userVote
      ...(userId
        ? [
            {
              $lookup: {
                from: "votes",
                let: {
                  commentId: "$_id",
                  userId: new mongoose.Types.ObjectId(userId),
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$commentId", "$$commentId"] }, // 🛠️ Fixed
                          { $eq: ["$userId", "$$userId"] },
                          { $eq: ["$type", "comment"] }, // 🛠️ Important!
                        ],
                      },
                    },
                  },
                  { $project: { _id: 0, voteType: 1 } },
                ],
                as: "userVote",
              },
            },
            {
              $addFields: {
                userVote: { $arrayElemAt: ["$userVote.voteType", 0] },
              },
            },
          ]
        : []),

      // Final project
      {
        $project: {
          _id: 1,
          content: 1,
          postId: 1,
          parentCommentId: 1,
          createdAt: 1,
          updatedAt: 1,
          isBanned: 1,
          upvoteCount: 1,
          downvoteCount: 1,
          userVote: 1,
          commentedBy: {
            _id: 1,
            username: 1,
            branch: 1,
            college: {
              _id: 1,
              profile: 1,
              name: 1,
            },
          },
        },
      },
    ];

    const comments = await CommentModel.aggregate(aggregationPipeline);

    const totalComments = await CommentModel.countDocuments({ postId });

    res.status(200).json({
      comments,
      meta: {
        total: totalComments,
        page,
        limit,
        totalPages: Math.ceil(totalComments / limit),
      },
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching comments");
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const { content, parentCommentId } = req.body;
    const postId = req.params.postId;
    const user = req.user;

    if (!user) throw new ApiError(401, "Unauthorized");
    const userId = user._id;

    if (!content || !postId) throw new ApiError(400, "All fields are required");

    const newComment = new CommentModel({
      content,
      postId,
      commentedBy: userId,
      parentCommentId: parentCommentId || null,
    });

    await newComment.save();

    res
      .status(201)
      .json({ message: "Comment created successfully.", comment: newComment });
  } catch (error) {
    handleError(error as ApiError, res, "Error creating comment");
  }
};
