import { Response, Request } from "express";
import { PostModel } from "../models/post.model.js";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose, { Types } from "mongoose";
import { validatePost } from "../utils/moderator.js";
import { toObjectId } from "../utils/toObject.js";
import { CommentModel } from "../models/comments.model.js";
import VoteModel from "../models/vote.model.js";
import userModel from "../models/user.model.js";
import { logEvent } from "../services/logService.js";
import PostTopic from "../types/PostTopic.js";
import redisClient from "../services/Redis.js";

const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, topic } = req.body;
    if (!title || !content || !topic)
      throw new ApiError(400, "All fields are required");
    if (!PostTopic.includes(topic)) throw new ApiError(400, "Topic is invalid");
    if (!req.user?._id) throw new ApiError(401, "Unauthorized");

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

    const user = await userModel
      .findById(req.user?._id)
      .populate({ path: "college", select: "_id name profile" })
      .select("_id username branch college")
      .lean<{
        _id: Types.ObjectId;
        username: string;
        branch: string;
        isBlocked: boolean;
        suspension: {
          ends: Date | null;
          reason: string | null;
          howManyTimes: number;
        };
        college: {
          _id: Types.ObjectId;
          name: string;
          profile: string;
        };
      }>();

    if (!user || !user.college) throw new ApiError(404, "User not found");

    const createdPost = await PostModel.create({
      title,
      content,
      postedBy: toObjectId(req.user._id),
      likes: [],
    });

    if (!createdPost) {
      throw new ApiError(500, "Failed to create post in database");
    }

    const data = {
      _id: createdPost._id,
      title: createdPost.title,
      content: createdPost.content,
      postedBy: {
        _id: user._id,
        username: user.username,
        college: {
          _id: user.college._id,
          name: user.college.name,
          profile: user.college.profile,
        },
        branch: user.branch,
      },
      views: createdPost.views,
      createdAt: createdPost.createdAt,
      upvoteCount: 0,
      downvoteCount: 0,
    };

    logEvent({
      req,
      action: "user_created_post",
      platform: "web",
      metadata: {
        createdPostId: createdPost._id,
      },
      sessionId: req.sessionId,
      userId: req.user._id.toString(),
    });

    res.status(201).json({
      success: true,
      post: data,
      message: "Post created successfully",
    });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Error creating post",
      "CREATE_POST_ERROR"
    );
  }
};

const updatePost = async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    const { postId } = req.params;

    if (!postId) throw new ApiError(400, "Post id is required");
    if (!title && !content)
      throw new ApiError(400, "Title or content is required");

    if (!req.user || !req.user?._id) throw new ApiError(401, "Unauthorized");

    const updateFields: any = {};
    if (title) updateFields.title = title;
    if (content) updateFields.content = content;

    const response = await PostModel.findByIdAndUpdate(
      toObjectId(postId),
      { $set: updateFields },
      { new: true }
    );

    if (!response) throw new ApiError(404, "Post not found");

    logEvent({
      req,
      action: "user_updated_post",
      platform: "web",
      metadata: {
        updatedPostId: response._id,
        updatedFields: { title: title ? 1 : 0, content: content ? 1 : 0 },
      },
      sessionId: req.sessionId,
      userId: req.user._id.toString(),
    });

    res.status(200).json({
      success: true,
      post: response,
      message: "Post updated successfully",
    });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Error updating post",
      "UPDATE_POST_ERROR"
    );
  }
};

const deletePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    if (!postId) throw new ApiError(400, "Post ID is required");

    if (!req.user || !req.user?._id) throw new ApiError(401, "Unauthorized");

    const objectPostId = toObjectId(postId);

    const post = await PostModel.findById(objectPostId);
    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    const commentIds = (
      await CommentModel.find({ postId: objectPostId }, { _id: 1 })
    ).map((c) => c._id);

    if (commentIds.length > 0) {
      await VoteModel.deleteMany({
        $or: [{ commentId: { $in: commentIds } }, { postId: objectPostId }],
      });
    } else {
      await VoteModel.deleteMany({ postId: objectPostId });
    }

    await CommentModel.deleteMany({ postId: objectPostId });

    await post.deleteOne();

    logEvent({
      req,
      action: "user_deleted_post",
      platform: "web",
      metadata: {
        deletedPostId: post._id,
      },
      sessionId: req.sessionId,
      userId: req.user._id.toString(),
    });

    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    handleError(error, res, "Error deleting post", "DELETE_POST_ERROR");
  }
};

const getPostsForFeed = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

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

    if (req.user?._id) {
      aggregationPipeline.push(
        {
          $lookup: {
            from: "votes",
            let: {
              postId: "$_id",
              userId: toObjectId(req.user?._id),
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
        },
        {
          $lookup: {
            from: "bookmarks",
            let: {
              postId: "$_id",
              userId: toObjectId(req.user?._id),
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
              { $project: { _id: 1 } },
            ],
            as: "bookmarkEntry",
          },
        },
        {
          $addFields: {
            bookmarked: { $gt: [{ $size: "$bookmarkEntry" }, 0] },
          },
        },
        {
          $project: {
            bookmarkEntry: 0,
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
        bookmarked: 1,
        topic: 1,
        postedBy: {
          _id: 1,
          username: 1,
          branch: 1,
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
    handleError(
      error as ApiError,
      res,
      "Error getting posts",
      "GET_POSTS_ERROR"
    );
  }
};

const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid post ID.");
    }

    const aggregationPipeline: any[] = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isBanned: false,
          isShadowBanned: false,
        },
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

    if (req.user?._id) {
      aggregationPipeline.push(
        {
          $lookup: {
            from: "votes",
            let: {
              postId: "$_id",
              userId: toObjectId(req.user._id),
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
        },
        {
          $lookup: {
            from: "bookmarks",
            let: {
              postId: "$_id",
              userId: toObjectId(req.user?._id),
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
              { $project: { _id: 1 } },
            ],
            as: "bookmarkEntry",
          },
        },
        {
          $addFields: {
            bookmarked: { $gt: [{ $size: "$bookmarkEntry" }, 0] },
          },
        },
        {
          $project: {
            bookmarkEntry: 0,
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
        topic: 1,
        downvoteCount: 1,
        userVote: 1,
        bookmarked: 1,
        postedBy: {
          _id: 1,
          username: 1,
          branch: 1,
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

    if (!posts || posts.length === 0) {
      throw new ApiError(404, "Post not found");
    }

    res.status(200).json({ post: posts[0] });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Error fetching post",
      "GET_POST_ERROR"
    );
  }
};

const IncrementView = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    if (!postId) throw new ApiError(400, "Post ID is required");

    const currentIp =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.ip;
    const ip = Array.isArray(currentIp) ? currentIp[0] : currentIp || "";

    const redisKey = `view:${postId}:${ip}`;
    const alreadyViewed = await redisClient.get(redisKey);

    if (!alreadyViewed) {
      await PostModel.findByIdAndUpdate(postId, { $inc: { views: 1 } });
      await redisClient.set(redisKey, 1, "EX", 60 * 60 * 4); // 4 hours
    }

    res.status(200).json({ message: "View processed" });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Error incrementing view",
      "INCREMENT_VIEW_ERROR"
    );
  }
};

export { createPost, updatePost, deletePost, getPostById, getPostsForFeed, IncrementView };
