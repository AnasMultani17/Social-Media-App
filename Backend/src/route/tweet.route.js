/** @format */

import { Router } from "express";

import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
} from "../controller/tweet.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/createTweet").post(createTweet);
router.route("/getUserTweets/:userId").post(getUserTweets);
router.route("/updateTweet/:tweetId").post(updateTweet);
router.route("/deleteTweet/:tweetId").post(deleteTweet);

export default router;
