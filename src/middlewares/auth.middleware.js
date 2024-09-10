import jwt from "jsonwebtoken";
import { User } from "../models/user_model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    //accessCookies either directly or from Header
    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer ", "");

    if (!accessToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    //decode data from accesstoken using secret key
    const decodedData = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    //find user from decoded data
    const user = await User.findById(decodedData?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Invalid access Token");
    }

    //set user in req object
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(400, "Something went wrong during token verification");
  }
});
