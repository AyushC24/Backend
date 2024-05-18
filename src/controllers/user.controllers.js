import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false}); // jisse ki password dobara na add ho jaye
        
        return {accessToken,refreshToken}

    }catch(e){
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}


const registerUser  = asyncHandler( async(req,res) =>
    {
        const {fullname, email, password,username} = req.body;
        console.log("Email: " , email);
        console.log(req.body);

        if([fullname, email, password, username].some( (field) => field?.trim() === ""))
        {
            throw new ApiError(400,"All fields are required");
        }

        const existedUser = await User.findOne({
            $or:[{username},{email}]
        })
        
        if(existedUser){
            throw new ApiError(409,"User already exists")
        }
        console.log("Request ki files below: ");
        console.log(req.files)
        const avatarLocalPath = req.files?.avatar[0]?.path;
        // const coverImageLocalPath = req.files?.(coverImage.length()>0 ? coverImage[0]?.path :null);
        let coverImageLocalPath;
        if((req.files) && (Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)){
            coverImageLocalPath=req.files.coverImage[0].path;
        }
        
        if(!avatarLocalPath){
            throw new ApiError(400,"No avatar saved locally");
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
//take username and password from frontend
//check whether username exists or not 
//if exists then check if password correct or not
//if password is correct then take to dashboard
//generate refresh and access token
//send cookie
//if password is wrong then return to check password

const loginUser = asyncHandler(async(req, res)=>{
        const  {email,username,password} = req.body;
        if(!username || !email) throw new ApiError(400,"Username or Email is required")
        
        const user = await User.findOne(
            {
                $or:[{email}, {username}],
            }
        )

        if(!user) throw new ApiError(400,"User not found");
        
        //using User.isPasswordCorrect will give error as User is used by MongoDB
        const isPasswordValid = await user.isPasswordCorrect(password)

        if(!isPasswordValid) throw new ApiError(400,"Invalid User credentials");
        
        const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

        // now the user we have in login function does not have refresh token in it
        //refresh token is stored in user of generateAccessAndRefreshTokens function
        //now 2 ways, we have 1 way: To again make db call 2nd way: to store refresh token in user here only  

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        const options={

            httpOnly: true,
            secure: true,

        }

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,accessToken,refreshToken
                }),
                "User logged in successfully",
        )

    })

    const logoutUser = asyncHandler(async (req, res) => {
        //how to know which user to log out
        //therefore create auth middleware verifyJWT function

        await User.findByIdAndUpdate(req.user._id,
            {
                $set:{
                    refreshToken: undefined
                }
            },
            {
                new: true,
            }
        )

        const options={

            httpOnly: true,
            secure: true,

        }

        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"User logged out successfully"));
    });


export {registerUser,
        loginUser,
        logoutUser,
};