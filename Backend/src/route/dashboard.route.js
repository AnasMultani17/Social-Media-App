/** @format */

import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getChannelStats,
  getChannelVideos,
} from "../controller/dashboard.controller.js";

const router = new Router();
router.use(verifyJWT);

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
