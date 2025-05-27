/** @format */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs"; // to unlink local files
import jwt from "jsonwebtoken";
import { subscribe } from "diagnostics_channel";
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (newPassword != confirmPassword) {
    throw new ApiError(400, "Password and confirm password is not matching");
  }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: (fullname, email),
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detailed updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar files is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error ehile uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { avatar: avatar.url },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverimageLocalPath = req.files?.path;

  if (!coverimageLocalPath) {
    throw new ApiError(400, "coverimage files is missing");
  }
  const coverimage = await uploadOnCloudinary(coverimageLocalPath);

  if (!coverimage.url) {
    throw new ApiError(400, "Error ehile uploading coverimage");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { coverimage: coverimage.url },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.users?.id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullnaem: 1,
        username: 1,
        subscribersCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverimage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetced successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchhistory",
        foreignField: "_id",
        as: "watchhistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
