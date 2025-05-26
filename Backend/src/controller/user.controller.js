/** @format */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs"; // to unlink local files
import jwt from "jsonwebtoken";
const generateAccesssAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    // These are synchronous functions, no need to await
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  if (!req.body) {
    throw new ApiError(400, "All fields are required");
  }

  let { username, email, fullname, password } = req.body;

  if (!username || !email || !fullname || !password) {
    throw new ApiError(400, "All fields are required");
  }

  username = username.trim();
  email = email.trim();
  fullname = fullname.trim();
  password = password.trim();

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    // Clean local files if already uploaded by multer
    if (req.files?.avatar?.[0]?.path) {
      fs.unlink(req.files.avatar[0].path, () => {});
    }
    if (req.files?.coverimage?.[0]?.path) {
      fs.unlink(req.files.coverimage[0].path, () => {});
    }

    throw new ApiError(
      409,
      "User with this email id or username already exists"
    );
  }

  // Avatar validation
  if (!req.files || !req.files.avatar || req.files.avatar.length === 0) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatarLocalPath = req.files.avatar[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  let avatarUpload, coverUpload;

  try {
    avatarUpload = await uploadOnCloudinary(avatarLocalPath);
    // Optional cleanup of local file after Cloudinary upload:
    fs.unlink(avatarLocalPath, () => {});
  } catch (err) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  if (req.files?.coverimage?.[0]?.path) {
    const coverImageLocalPath = req.files.coverimage[0].path;

    try {
      coverUpload = await uploadOnCloudinary(coverImageLocalPath);
      fs.unlink(coverImageLocalPath, () => {});
    } catch (err) {
      // Clean already uploaded avatar from Cloudinary if cover upload fails
      // You need to implement `deleteFromCloudinary(publicId)` if needed
      throw new ApiError(500, "Failed to upload cover image");
    }
  }

  let createdUser;

  try {
    createdUser = await User.create({
      username,
      avatar: avatarUpload.url,
      coverimage: coverUpload?.url || "",
      email,
      fullname,
      password,
    });
  } catch (err) {
    // Optionally delete avatar/cover from Cloudinary if DB creation fails
    throw new ApiError(500, "User creation failed");
  }

  const isCreated = await User.findById(createdUser._id).select(
    "-password -refreshToken"
  );

  if (!isCreated) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, isCreated, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  console.log("Login Request Body:", req.body);

  const { username, email, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Username or email required");
  }
  if (!password) {
    throw new ApiError(400, "Password required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const passCheck = await user.isPasswordCorrect(password);
  if (!passCheck) {
    throw new ApiError(401, "Wrong Password");
  }

  const { accessToken, refreshToken } = await generateAccesssAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Secure only in production
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  // Clear refresh token in DB
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded._id);
    if (!user) {
      throw new ApiError(401, "Unauthorized Access");
    }

    if (incomingRefreshToken != user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure only in production
    };

    const { accessToken, newrefreshToken } =
      await generateAccesssAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookies("accessToken", accessToken, options)
      .cookies("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: accessToken,
            refreshToken: newrefreshToken,
          },
          "Acces Token Refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.meesage || "Unauthorized request");
  }
});

export { registerUser, loginUser, logOutUser, refreshAccessToken };
