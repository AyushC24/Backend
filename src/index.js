// require('dotenv').config({path: './env'})


import connectDB from "./db/index.js";
import dotenv from "dotenv"

dotenv.config({
    path: './env'
})


connectDB();



// import express from "express";

// const app = express();


// ;( async ()=>{
//     try{

//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("error",(e)=>{
//             console.log("Err: ", e);
//             throw e;
//         });

//         app.listen(process.env.PORT,()=>{
//             console.log("APP is Listeninig on PORT ${process.env.PORT}");
//         })

//     }catch(e){
//         console.error("Error:",error);
//         throw e;
//     }
// })();