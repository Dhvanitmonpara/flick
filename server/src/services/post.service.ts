import { Types } from "mongoose";
import { PostModel } from "../models/post.model.js";
import { validateContent } from "../utils/moderator.js";
import redisClient from "./redis.service.js";
import { Request } from "express";
import { toObjectId } from "../utils/toObject.js";

type FindPostsOptions = {
  page?: number;
  limit?: number;
  sortBy?: Record<string, 1 | -1>;
  filters?: Record<string, any>;
  userId?: Types.ObjectId | string | null;
};

class PostService {
  async validatePost(content: string) {
    const result = await validateContent(content);
    if (!result.allowed) {
      const msg =
        result.reasons.length === 1
          ? result.reasons[0]
          : result.reasons.slice(0, -1).join(", ") +
            " and " +
            result.reasons.at(-1);
      return {
        allowed: false,
        reasons: [msg],
      };
    }
    return {
      allowed: true,
      reasons: [],
    };
  }

  async create({
    title,
    content,
    topic,
    postedBy,
  }: {
    title: string;
    content: string;
    topic: string;
    postedBy: Types.ObjectId;
  }) {
    return await PostModel.create({
      title,
      content,
      topic,
      postedBy,
      likes: [],
    });
  }

  async update(
    postId: Types.ObjectId,
    updateData: Partial<{ title: string; content: string; topic: string }>
  ) {
    return await PostModel.findByIdAndUpdate(
      postId,
      { $set: updateData },
      { new: true }
    );
  }

  async incrementView(postId: Types.ObjectId, req: Request) {
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
  }

  async getPostByIdAndPopulate({
    postId,
    userId = null,
  }: {
    postId: string | Types.ObjectId;
    userId?: string | Types.ObjectId | null;
  }) {
    const objectPostId = toObjectId(postId);
    const objectUserId = userId ? toObjectId(userId) : null;

    const pipeline: any[] = [
      {
        $match: {
          _id: objectPostId,
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
      { $unwind: { path: "$postedBy", preserveNullAndEmptyArrays: true } },
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

    // Only include if user is logged in
    if (objectUserId) {
      pipeline.push(
        {
          $lookup: {
            from: "votes",
            let: {
              postId: "$_id",
              userId: objectUserId,
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
              userId: objectUserId,
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
        }
      );
    }

    // Final shape
    pipeline.push({
      $project: {
        title: 1,
        content: 1,
        topic: 1,
        views: 1,
        createdAt: 1,
        upvoteCount: 1,
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

    const [post] = await PostModel.aggregate(pipeline);
    return post || null;
  }

  async findPostsAndPopulate({
    page = 1,
    limit = 10,
    sortBy = { createdAt: -1 },
    filters = {},
    userId,
  }: FindPostsOptions) {
    const objectUserId = userId ? new Types.ObjectId(userId) : null;

    const pipeline: any[] = [];

    // Basic filters
    pipeline.push({
      $match: {
        isBanned: false,
        isShadowBanned: false,
        ...filters,
      },
    });

    // Sort, Paginate
    pipeline.push(
      { $sort: sortBy },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // postedBy lookup
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "postedBy",
          foreignField: "_id",
          as: "postedBy",
        },
      },
      { $unwind: { path: "$postedBy", preserveNullAndEmptyArrays: true } },
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
      }
    );

    // Comments lookup and count
    pipeline.push(
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "postComments",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$postComments" },
        },
      }
    );

    // Votes aggregation
    pipeline.push(
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
      }
    );

    // If logged in, add userVote and bookmark
    if (objectUserId) {
      pipeline.push(
        {
          $lookup: {
            from: "votes",
            let: { postId: "$_id", userId: objectUserId },
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
        {
          $lookup: {
            from: "bookmarks",
            let: { postId: "$_id", userId: objectUserId },
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
        }
      );
    }

    // Final shape
    pipeline.push({
      $project: {
        title: 1,
        content: 1,
        topic: 1,
        views: 1,
        createdAt: 1,
        commentsCount: 1,
        upvoteCount: 1,
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

    return await PostModel.aggregate(pipeline);
  }
}

export default PostService;
