import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user_model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
  // data of user from frontend
  // take username and email to validate
  // validate user from dataabse whether already exist or not
  // take avatar image and coverImage and check
  // upload images to cloudinary
  // register user in database
  // from password and refreshToken from Response
  // check the register user
  // return Response

  //taking files from multer middleware has to be deleted from localstorage in case of error occured
  let avatarLocalPath;
  let coverImageLocalPath;
  try {
    const { userName, email, fullName, password } = req.body;
    console.log(userName);

    if (!userName || userName.trim() === "") {
      throw new ApiError(400, "username is required");
    } else if (!email || email.trim() === "") {
      throw new ApiError(400, "email is required");
    } else if (!fullName || fullName.trim() === "") {
      throw new ApiError(400, "fullname is required");
    } else if (!password && password.trim() === "") {
      throw new ApiError(400, "password is required");
    }

    const existedUser = await User.findOne({
      $and: [{ userName }, { email }],
    });
    const existedUserName = await User.findOne({ userName });
    const existedEmail = await User.findOne({ email });
    console.log(existedUser, "\n\n");
    console.log(existedUserName, "\n\n");
    console.log(existedEmail, "\n\n");
    if (existedUser) {
      throw new ApiError(409, "user already exist");
    } else if (existedUserName) {
      throw new ApiError(409, "username already exist");
    } else if (existedEmail) {
      throw new ApiError(409, "email already exist");
    }

    console.log("req files----", req.files);
    avatarLocalPath = req.files?.avatar[0]?.path;
    // coverImageLocalPath = req.files?.coverImage[0]?.path; //it is a problem of JS as null try to access coverImage[0]
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }
    console.log(avatarLocalPath);
    console.log(coverImageLocalPath);
    console.log(req.files);
    if (!avatarLocalPath) {
      throw new ApiError(400, "avatar is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("avatarResponse", avatar);
    console.log("coverImageResponse", coverImage);
    if (avatar) {
      delete req.files.avatar;
    }
    if (coverImage) {
      delete req.files.coverImage;
    }
    console.log("files path:", req.files);
    if (!avatar) {
      console.log("Something is wrong with avatar");
      throw new ApiError(500, "Cloudinary error");
    }

    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url,
      userName,
      email,
      password,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      console.log("Something is wrong with user creation");
      throw new ApiError(
        500,
        "Something went wrong during registering the user"
      );
    }
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "user registered successfully"));
  } catch (error) {
    throw error;
  } finally {
    if (
      req.files &&
      Array.isArray(req.files.avatar) &&
      req.files.avatar.length > 0
    ) {
      fs.unlinkSync(req.files.avatar[0].path);
      delete req.files.avatar;
    }
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      fs.unlinkSync(req.files.coverImage[0].path);
      delete req.files.coverImage;
    }
  }
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    const loggedInUser = await user.save({ validateBeforeSave: false });
    console.log(
      `loggedInUser: ${loggedInUser} \nrefreshToken: ${refreshToken} \naccessToken: ${accessToken}`
    );
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  //take data from client
  //validate username or email
  //take password from client
  //validate password
  //generate access and refresh token
  const { userName, email, password } = req.body;
  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!user) {
    throw new ApiError(400, "User Not Found");
  }

  const passwordCheck = await user.isPasswordCorrect(password);
  if (!passwordCheck) {
    throw new ApiError(400, "Password is Incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  //set cookies to browser
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { loggedInUser, accessToken, refreshToken },
        "User successfully logged in"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //after jwt verification get user (ie if user already in a session means have an access key )
  //we get the user from accessToken decryption from jwt verification
  const user = req.user ?? req.body;
  //update user refreshToken
  const loggedOutUser = await User.findByIdAndUpdate(user._id, {
    $set: { refreshToken: undefined },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  //remove cookie from browser
  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    console.log("User already log out");
    throw new ApiError(400, "No Refresh Token Found!!!Login again");
  }

  const decodedData = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  const user = await User.findById(decodedData?._id);

  if (!user) {
    throw new ApiError(400, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(400, "refreshToken Expired or login again");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const updatedRefreshTokenUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          updatedRefreshTokenUser,
          accessToken,
          refreshToken,
        },
        "access and refresh token updated successfully"
      )
    );
});

const updatePassword = asyncHandler(async (req, res) => {
  //take old password and new password
  //take user from session
  //validate password
  //update password
  const { oldPassword, newPassword } = req.body;
  console.log(oldPassword, newPassword);
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(400, "user not found");
  }
  const checkPassword = await user.isPasswordCorrect(`${oldPassword}`);
  if (!checkPassword) {
    throw new ApiError(400, "Password is incorrect");
  }

  //this method of updatationg is required ..because before save the password need to be encrpyted by bcrypt
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "user taken from middleware"));
});

const udpateAccountDetails = asyncHandler(async (req, res) => {
  const { userName, fullName, email } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        userName: userName || req.user.userName,
        fullName: fullName || req.user.fullName,
        email: email || req.user.email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(400, "user not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "profile updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar image not found");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(400, "user not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "avatar image not found");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(400, "user not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "cover image updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "current user profile"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const id = req.user?._id;
  console.log("user id", id);
  const response = await User.deleteOne({ _id: req.user?._id });
  console.log(response, "resong");
  if (!response) {
    throw new ApiError(400, "Something went wrong");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, response, "Account deleted successfully"));
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updatePassword,
  udpateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getCurrentUser,
  deleteUser,
};
