import dotenv from "dotenv";
import connnectDB from "./db/db.js";
import {app} from "./app.js"

dotenv.config({path:"./env"});

connnectDB().then(()=>{
    app.on("error",(error)=>{
        console.log("Erros Occured Before App Initiated:",error);
        throw error;
    });
    app.listen(process.env.PORT,()=>{
        console.log("Sever is Running at PORT",process.env.PORT);
    });
}).catch((err)=>{
    console.log("MongoDB connection Failed:",err);
});



// ;(async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     }catch(err){
//         console.log("Database Connection Error",err);
//         throw err;
//     }
// })();