/** @format */

import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../model/tweet.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(400, "User id not found");
  }
  if (!req.body) {
    throw new ApiError(400, "Content is required for tweet");
  }
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required for tweet");
  }
  const tweet = await new Tweet({
    owner: userId,
    content: content,
  }).save();
  res.status(200).json(new ApiResponse(200, tweet, "Tweet successfull"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }
  const tweet = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users", 
        localField: "owner", 
        foreignField: "_id", 
        as: "owner"
      },
    },
    {
      $unwind: "$owner",
    },
  ]);
  

  if (!tweet.length) {
    throw new ApiError(404, "No tweets found for this user");
  }

  res
    .status(200)
    .json(new ApiResponse(200, tweet, "All tweets are fetched of given user"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!tweetId) {
    throw new ApiError(400, "Tweet not found");
  }

  const tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { $set: { content: content } },
    { new: true }
  );
  

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet not found");
  }
  const tweet = await Tweet.findByIdAndDelete(tweetId);
  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
