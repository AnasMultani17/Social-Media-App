/** @format */

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  const stat = {
    status: "OK",
    message: "Servere is running perfectly fine",
  };
  return res
    .status(200)
    .json(new ApiResponse(201, stat, "show healcheck Status successfullly"));
});

export { healthcheck };
