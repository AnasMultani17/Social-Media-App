/** @format */

import mongoose from "mongoose";
import { Video } from "../model/video.model.js";
import { Subscription } from "../model/subscription.model.js";
import { Like } from "../model/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const totalSubscribers = await Subscription.countDocuments({
    subscriber: userId,
  });
  const totalLikes = await Like.countDocuments({
    video: { $in: await Video.find({ owner: userId }).select("_id") },
  });

  const stats = {
    totalSubscribers: totalSubscribers,
    totalLikes: totalLikes,
  };
  return res
    .status(200)
    .json(new ApiResponse(201, stats, "subscribers fetch successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const channelVideo = await Video.find({ owner: userId });

  return res
    .status(200)
    .json(new ApiResponse(201, channelVideo, "ChannelVieo fetch SuccessFully"));
});

export { getChannelStats, getChannelVideos };
