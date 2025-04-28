import { Response, Request } from "express";
import { runningInterviewSession } from "../app.js";
import { PostModel } from "../models/post.model.js";
import handleError from "../services/HandleError.js";
import { ApiError } from "../utils/ApiError.js";

const createPost = async (req: Request, res: Response) => {
  const { title, postedBy, content } = req.body;

  if (!postedBy || !title || !content) {
    res.status(400).json({
      success: false,
      message: "All fields are required",
    });
    return;
  }

  try {
    const response = await PostModel.create({
      title,
      content,
      postedBy,
      likes: [],
    });

    if (!response) {
      res.status(500).json({
        success: false,
        message: "Failed to create post in the database",
      });
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
  const { title, postId, content } = req.body;

  if(!postId) {
    res.status(400).json({
      success: false,
      message: "Post id is required",
    });
    return;
  }

  if (!title && !content) {
    res.status(400).json({
      success: false,
      message: "At least one field is required",
    });
    return;
  }

  try {
    const response = await PostModel.findOneAndUpdate(
      { postId },
      { $set: { title, content } },
      { new: true }
    );

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
      message: "Post updated successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error updating post");
  }
};

const deletePost = async (req: Request, res: Response) => {
  const { postId } = req.body;

  if(!postId) {
    res.status(400).json({
      success: false,
      message: "Post id is required",
    })
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
  // 
};

const getPost = async (req: Request, res: Response) => {
  // 
};

export {
  createPost,
  updatePost,
  deletePost,
  getPost,
  getPostsForFeed,
};
