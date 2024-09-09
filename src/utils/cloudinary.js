import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.API_KEY,
      api_secret: process.env.API_SECRET,
    });
    if (!localFilePath) return null;
    const res = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File is uploaded on cloudinary", res.url);
    // fs.unlinkSync(localFilePath);
    return res;
  } catch (error) {
    // fs.unlinkSync(localFilePath);
    console.log("File not uploaded ,Something Went Wrong: ", error);
    return null;
  } finally {
    if (localFilePath) {
      console.log("localFilePathCloudinaryUnlinkingfile:", localFilePath);
      fs.unlinkSync(localFilePath);
    }
  }
};

export default uploadOnCloudinary;
