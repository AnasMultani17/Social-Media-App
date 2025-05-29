/** @format */

import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controller/subscription.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/c/sub/:channelId").post(toggleSubscription);
router.route("/u/:subscriberId").get(getSubscribedChannels);
router.route("/c/:channelId").get(getUserChannelSubscribers);

export default router;
