import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) throw Error("FIle Not Found!!!");
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
    fs.unlinkSync(localFilePath);
  }
};
