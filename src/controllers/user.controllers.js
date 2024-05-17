import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser  = asyncHandler( async(req,res) =>
    {
        const {fullname, email, password,username} = req.body;
        console.log("Email: " , email);

        if([fullname, email, password, username].some( (field) => field?.trim() === ""))
        {
            throw new ApiError(400,"All fields are required");
        }

        const existedUser = User.findOne({
            $or:[{username},{email}]
        })
        
        if(existedUser){
            throw new ApiError(409,"User already exists")
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverImage[0]?.path;
        
        if(!avatarLocalPath){
            throw new ApiError(400,"No avatar");
        }

        const avatar = await uploadonCloudinary(avatarLocalPath);
        const coverImage = await uploadonCloudinary(coverImageLocalPath);
        
        if(!avatar){
            throw new ApiError(400,"No avatar");
        }

        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url ||"",
            email,
            password,
            username: username.toLowerCase(),
        });

        const createdUser = await User.findById(user._id) . select(
            "-password -refreshToken"
        )

        if(!createdUser){
            throw new ApiError(500,"Something went wrong while Registering a user");
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser,"User registered successfully")
        )
        
    }
)

export {registerUser};