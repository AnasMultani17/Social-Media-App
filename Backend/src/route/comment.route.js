/** @format */

import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controller/comment.controller.js";

const router = new Router();
router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
