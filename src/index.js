import dotenv from "dotenv";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import connnectDB from "./db/db.js";

dotenv.config({path:"./env"});

connnectDB();



// ;(async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     }catch(err){
//         console.log("Database Connection Error",err);
//         throw err;
//     }
// })();