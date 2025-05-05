import { Response, Request } from "express";
import { PostModel } from "../models/post.model.js";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import { validatePost } from "../utils/moderator.js";

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
      postedBy: new mongoose.Schema.Types.ObjectId(postedBy),
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

    const response = await PostModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(postId) },
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
  const { postId } = req.body;

  if (!postId) {
    res.status(400).json({
      success: false,
      message: "Post id is required",
    });
  }

  try {
    const response = await PostModel.findOneAndDelete({ postId });
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

    const user = req.user;

    const posts = await PostModel.aggregate([
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
      // Lookup postedBy user
      {
        $lookup: {
          from: "users", // your User collection name (make sure it's correct)
          localField: "postedBy",
          foreignField: "_id",
          as: "postedBy",
        },
      },
      {
        $unwind: {
          path: "$postedBy",
          preserveNullAndEmptyArrays: true, // in case poster got deleted
        },
      },
      // Lookup college inside postedBy
      {
        $lookup: {
          from: "colleges", // your College collection name
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
      // Lookup votes to count upvotes and downvotes
      {
        $lookup: {
          from: "votes", // Reference to the votes collection
          localField: "_id", // The post _id field
          foreignField: "postId", // The postId in the votes collection
          as: "votes", // Alias for the lookup result
        },
      },
      // Add fields for counting upvotes and downvotes
      {
        $addFields: {
          upvoteCount: {
            $size: {
              $filter: {
                input: "$votes",
                as: "vote",
                cond: { $eq: ["$$vote.voteType", "upvote"] }, // Filter for upvotes
              },
            },
          },
          downvoteCount: {
            $size: {
              $filter: {
                input: "$votes",
                as: "vote",
                cond: { $eq: ["$$vote.voteType", "downvote"] }, // Filter for downvotes
              },
            },
          },
          karma: {
            $subtract: [
              {
                $size: {
                  $filter: {
                    input: "$votes",
                    as: "vote",
                    cond: { $eq: ["$$vote.voteType", "upvote"] }, // Count of upvotes
                  },
                },
              },
              {
                $size: {
                  $filter: {
                    input: "$votes",
                    as: "vote",
                    cond: { $eq: ["$$vote.voteType", "downvote"] }, // Count of downvotes
                  },
                },
              },
            ],
          },
        },
      },
      // Project final output fields
      {
        $project: {
          title: 1,
          content: 1,
          views: 1,
          createdAt: 1,
          karma: 1,
          upvoteCount: 1,
          downvoteCount: 1,
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
      },
    ]);
    
    res.status(200).json({ success: true, posts });
  } catch (error) {
    handleError(error as ApiError, res, "Error getting posts");
  }
};

const getPost = async (req: Request, res: Response) => {
  //
};

export { createPost, updatePost, deletePost, getPost, getPostsForFeed };
