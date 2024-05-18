// require('dotenv').config({path: './env'})

import {app} from "./app.js"
import connectDB from "./db/index.js";
import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})

connectDB()
.then(
    ()=>{

        app.listen(process.env.PORT || 8000,()=>{
            console.log(`Server is running at ${process.env.PORT}`)
        })

    }
)
.catch((err)=>{
    console.log("MONGODB FAILED !! SEE")
})



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