import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user_model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import { type } from "os";
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

export { registerUser };
