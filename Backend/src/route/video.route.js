/** @format */

import { Router } from "express";

import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  viewUpdate,
} from "../controller/video.controller.js";

import { upload } from "../middleware/multer.middleware.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/").get(getAllVideos);
router.route("/publishAVideo").post(
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);

router.route("/getVideoById/:videoId").get(getVideoById);
router
  .route("/updateVideo/:videoId")
  .patch(upload.single("thumbnail"), updateVideo);
router.route("/deleteVideo/:videoId").post(deleteVideo);
router.route("/togglePublishStatus/:videoId").post(togglePublishStatus);
router.route("/viewUpdate/:videoId").post(viewUpdate);

export default router;
