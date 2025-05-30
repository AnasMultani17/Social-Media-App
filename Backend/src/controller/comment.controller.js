/** @format */

import mongoose from "mongoose";
import { Comment } from "../model/comments.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!videoId) {
    throw new ApiError(404, "Invalid videoId");
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

  const aggregateQuery = Comment.aggregate([
    {
      $match: { video: new mongoose.Types.ObjectId(videoId) },
    },
    {
      $sort: sortOptions,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const result = await Comment.aggregatePaginate(aggregateQuery, options);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments: result.docs,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { content } = req.body;
  const { videoId } = req.params;

  if (!content && !videoId) {
    throw new ApiError(404, "invalid videoId or missing content");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Add comment successFully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId && !content) {
    throw new ApiError(404, "Invalid CommentID or missing content");
  }

  const updatedComment = await Comment.findByIdAndUpdate(commentId, {
    $set: {
      content,
    },
  });
  return res
    .status(200)
    .json(new ApiResponse(201, updatedComment, "Update comment Successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(404, "Invalid CommentId");
  }

  await Comment.findByIdAndDelete(commentId);

  res
    .status(200)
    .json(new ApiResponse(201, null, "Delete comment Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
