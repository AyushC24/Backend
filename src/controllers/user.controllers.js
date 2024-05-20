import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId)=>{
    try{ 
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();

        const refreshToken = user.generateRefreshToken();
        // console.log("Error before saving");

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
        console.log(req.body);
        if(!(username || email)) throw new ApiError(400,"Username or Email is required")
        
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
                },
                "User logged in successfully",
            )
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


const refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken)  throw new ApiError(401,"Unauthorized request");
    
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        if(!decodedToken) throw new ApiError(401,"Unauthorized request");
    
        const user = await User.findById(decodedToken?._id);
        if(!user) throw new ApiError(401,"No User Found");
    
        if(incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401,"Refresh token is expired");
        }  
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken,newrefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken",newrefreshToken)
        .json(
            new ApiResponse(200,{
                accessToken,
                refreshToken:newrefreshToken
            },
            "Access Token refreshed successfully" 
            )
        );
    } catch (error) {
        throw new ApiError(401,error?.message|| "Invalid Refresh Token");
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user= await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401,"Incorrect Old Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password updated successfully"));

})  

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current User fetched successfully"));
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400,"All fields are required");
    }

    const user = User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullName,
            email,
        }
    },{new: true}).select("-password ")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"));

});

const updateUserAvatar = asyncHandler(async (req, res) =>{
    
    const avatarLocalPath = req.file?.path
    
    if(!avatarLocalPath) throw new ApiError(400,"Avatar file not found!!");

    const avatar = await uploadonCloudinary(avatarLocalPath);    
    if(!avatar.url) throw new ApiError(400,"Error while uploading Avatar on Cloudinary");

    const user = await User.findByIdAndUpdate(req.user._id,{
        $set:{
            avatar: avatar.url
        }
    },{new:true}).select("-password");
    //deleter prev image from cloudinary
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image Updated Successfully"));

});

const updateUserCoverImage = asyncHandler(async (req, res) =>{
    
    const coverImageLocalPath = req.file?.path
    
    if(!coverImageLocalPath) throw new ApiError(400,"Avatar file not found!!");

    const coverImage = await uploadonCloudinary(coverImageLocalPath);    
    if(!coverImage.url) throw new ApiError(400,"Error while uploading Cover Image on Cloudinary");

    const user = await User.findByIdAndUpdate(req.user._id,{
        $set:{
            coverImage: coverImage.url
        }
    },{new:true}).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image Updated Successfully"));

});

const getUserChannelProfile = asyncHandler(async(req, res)=>{
        const {username} = req.params;

        if(!username?.trim) throw new ApiError(400,"Username is missing");
        
        const channel = await User.aggregate([
            {   //pipeline 1
                $match:{
                    username: username?.toLowerCase()
                }
            },
            {   //pipeline 2
                $lookup:{
                    from:"subscriptions", //model Subscription is stored in plural and lowercase in db
                    localField:"_id",  //id of model Subscription
                    foreignField:"channel", // boss channel se related kitne children hain
                    as:"subscribers" //21:13
                }
            },
            {   //pipeline 3
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber", //boss subscriber se related kitne children hain
                    as:"subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount: {
                        $size: "$subscribers" //$ isiliye lagaya h kyuki vo field hai
                    },
                    channelsSubscribedToCount:{
                        $size:"$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:{ $in:[req.user?._id,"$subscribers.subscriber"] },
                            then: true,
                            else :false
                        }
                    }
                }
            },
            {
                $project:{
                    fullName:1,
                    username:1,
                    subscribersCount: 1,
                    isSubscribed:1,
                    channelsSubscribedToCount: 1,
                    avatar:1,
                    coverImage:1,
                    email:1,
                }
            }
        ]);   
        console.log(channel); 
        if(!channel?.length){
            throw new ApiError(404,"Channel does not exist");
        }     
        return res
        .status(200)
        .json(
            new ApiResponse(200,channel[0],"User channel fetched successfully")
        );
})

const getWatchedHistory= asyncHandler(async(req, res)=>{
    //req.user._id is a string return by mongoose but iternally it converts to ObjectId("string")
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id), // therefore to match it we conver it to ObjectId
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{ //upar vala owner array h toh uska first element nikalna h and usi ko overwrite kr dena h in this owner 
                                $first:"$owner "
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched successfully",
        )
    )

})


export {registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchedHistory,
};