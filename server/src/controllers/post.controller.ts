import { Response, Request } from "express";
import { PostModel } from "../models/post.model.js";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import { validatePost } from "../utils/moderator.js";
import { toObjectId } from "../utils/toObject.js";

const createPost = async (req: Request, res: Response) => {
  const { title, postedBy, content } = req.body;

  try {
    if (!postedBy || !title || !content) {
      throw new ApiError(400, "All fields are required");
    }

    const result = await validatePost(content);
    if (!result.allowed) {
      const msg =
        result.reasons.length === 1
          ? result.reasons[0]
          : result.reasons.slice(0, -1).join(", ") +
            " and " +
            result.reasons.at(-1);

      throw new ApiError(400, `Your post was blocked because ${msg}.`);
    }

    const response = await PostModel.create({
      title,
      content,
      postedBy: toObjectId(postedBy),
      likes: [],
    });

    if (!response) {
      throw new ApiError(500, "Failed to create post in database");
    }

    res.status(200).json({
      success: true,
      response,
      message: "Post created successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error creating post");
  }
};

const updatePost = async (req: Request, res: Response) => {
  try {
    const { title, content, postId } = req.body;

    if (!postId) throw new ApiError(400, "Post id is required");
    if (!title && !content)
      throw new ApiError(400, "Title or content is required");

    const updateFields: any = {};
    if (title) updateFields.title = title;
    if (content) updateFields.content = content;

    const response = await PostModel.findByIdAndUpdate(
      toObjectId(postId),
      { $set: updateFields },
      { new: true }
    );

    if (!response) throw new ApiError(404, "Post not found");

    res.status(200).json({
      success: true,
      post: response,
      message: "Post updated successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error updating post");
  }
};

const deletePost = async (req: Request, res: Response) => {
  const { postId } = req.params;

  if (!postId) {
    res.status(400).json({
      success: false,
      message: "Post id is required",
    });
  }

  try {
    const response = await PostModel.findByIdAndDelete(toObjectId(postId));
    if (!response) {
      res.status(404).json({
        success: false,
        message: "Post not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      response,
      message: "Post deleted successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error deleting post");
  }
};

const getPostsForFeed = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = (req.query.user as string) || null;

    const aggregationPipeline: any[] = [
      {
        $match: {
          isBanned: false,
          isShadowBanned: false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "postedBy",
          foreignField: "_id",
          as: "postedBy",
        },
      },
      {
        $unwind: {
          path: "$postedBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "colleges",
          localField: "postedBy.college",
          foreignField: "_id",
          as: "postedBy.college",
        },
      },
      {
        $unwind: {
          path: "$postedBy.college",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "votes",
          localField: "_id",
          foreignField: "postId",
          as: "votes",
        },
      },
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
    ];

    // 👉 If user exists, push userVote lookup
    if (userId) {
      aggregationPipeline.push(
        {
          $lookup: {
            from: "votes",
            let: {
              postId: "$_id",
              userId: new mongoose.Types.ObjectId(userId),
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$postId", "$$postId"] },
                      { $eq: ["$userId", "$$userId"] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  voteType: 1,
                },
              },
            ],
            as: "userVote",
          },
        },
        {
          $addFields: {
            userVote: { $arrayElemAt: ["$userVote.voteType", 0] },
          },
        }
      );
    }

    aggregationPipeline.push({
      $project: {
        title: 1,
        content: 1,
        views: 1,
        createdAt: 1,
        upvoteCount: 1,
        downvoteCount: 1,
        userVote: 1,
        postedBy: {
          _id: 1,
          username: 1,
          branch: 1,
          bookmarks: 1,
          college: {
            _id: 1,
            name: 1,
            profile: 1,
            email: 1,
          },
        },
      },
    });

    const posts = await PostModel.aggregate(aggregationPipeline);

    res.status(200).json({
      posts,
      meta: {
        page,
        limit,
      },
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error getting posts");
  }
};

const getPost = async (req: Request, res: Response) => {
  //
};

export { createPost, updatePost, deletePost, getPost, getPostsForFeed };
