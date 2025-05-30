/** @format */

import mongoose from "mongoose";
import { Like } from "../model/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Toggle like on a video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  let toggledLike;

  if (!existingLike) {
    toggledLike = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
    toggledLike = await toggledLike.populate("video");
  } else {
    await Like.deleteOne({ _id: existingLike._id });
    toggledLike = null;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, toggledLike, "Video like toggled successfully"));
});

// Toggle like on a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  let toggledLike;

  if (!existingLike) {
    toggledLike = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
    toggledLike = await toggledLike.populate("comment");
  } else {
    await Like.deleteOne({ _id: existingLike._id });
    toggledLike = null;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, toggledLike, "Comment like toggled successfully")
    );
});

// Toggle like on a tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  let toggledLike;

  if (!existingLike) {
    toggledLike = await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });
    toggledLike = await toggledLike.populate("tweet");
  } else {
    await Like.deleteOne({ _id: existingLike._id });
    toggledLike = null;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, toggledLike, "Tweet like toggled successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const likedVideos = await Like.find({
    likedBy: userId,
    video: { $exists: true },
  })
    .populate({
      path: "video",
      populate: {
        path: "owner",
      },
    })
    .select("-_id video");
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Fetched liked videos successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
