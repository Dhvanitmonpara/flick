import { Response, Request } from "express";
import { runningInterviewSession } from "../src/app";
import { PostModel } from "../models/post.model";

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
    if (error instanceof Error && (error as any).code === 11000) {
      res.status(409).json({
        success: false,
        message: "A post with same title already exists",
        error: error.message,
      });
      return;
    }
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Failed to create session in the database",
        error: error.message,
      });
    } else {
      console.error("Error in sendFeedback:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create session in the database",
        error: "Unknown error",
      });
    }
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
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Failed to update post in the database",
        error: error.message,
      });
    } else {
      console.error("Error in sendFeedback:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update post in the database",
        error: "Unknown error",
      });
    }
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
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete post in the database",
        error: error.message,
      });
    } else {
      console.error("Error in sendFeedback:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete post in the database",
        error: "Unknown error",
      });
    }
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
