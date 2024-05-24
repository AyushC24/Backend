import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudinary, uploadonCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if([title, description].some((field)=>field?.trim() === "")){
        throw new ApiError(400,"All Fields are required");
    }
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnailFile[0]?.path;
    if(!videoLocalPath || !thumbnailLocalPath){
        throw new ApiError(400,"All Fields are required for videos");
    }
    const videoFile= await uploadonCloudinary(videoLocalPath);
    const thumbnailFile = await uploadonCloudinary(thumbnailLocalPath);
    if(!videoFile || !thumbnailFile) throw new ApiError(400,"File not found");

    const video= await Video.create({
        title,
        description,
        owner:req.user?._id,
        videoFile:videoFile?.url,
        thumbnail:{
            url:thumbnailFile?.url,
            public_id:thumbnailFile?.public_id
        },
        duration:videoFile.duration,
        isPublished:false,
    });

    const createdVideoFile = await Video.findbyId(video?._id);
    if(!createdVideoFile){
        throw new ApiError(400,"Sorry! File upload failed!!");
    }
    return res
            .status(200)
            .json(new ApiResponse(200,createdVideoFile,"Video Upload Successful"));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)) throw new ApiError(404,"Invalid Video ID");

    const video = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId),
            }
        },
        {
            $lookup:{
                from:"likes",
                localfield:"_id",
                foreignfield:"video",
                as:"likes",
            }
        },
        {
            $lookup:{
                from:"users",
                localfield:"owner",
                foreignfield:"_id",
                as:"owner",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localfield:"_id",
                            foreignfield:"channel",
                            as:"subscribers",
                        }
                        
                    },
                    {
                        $addFields:{
                            subscribersCount:{
                                $size:"$subscribers",
                            },
                            isSubscribed:{
                                $cond:{
                                    if:{
                                        $in:[
                                            req?.user?._id,
                                            "$subscribers.subscriber",
                                        ]
                                    },
                                    then:true,
                                    else:false,
                                }
                            },
                        }
                    },
                    {
                        $project:{
                            username:1,
                            "avatar.url":1,
                            subscribersCount:1,
                            isSubscribed:1,
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes",
                },
                owner:{
                    //see
                },
                isLiked:{
                    $cond:{
                        $if:{
                            $in:["req.user?._id","$likes?.likedBy"]
                        },
                        then:true,
                        else:false,
                    }
                }
            }
        },
        {
            $project:{
                "videoFile.url":1,
                title:1,
                description:1,
                views:1,
                duration:1,
                comments:1,
                owner:1,
                likesCount:1,
                isLiked:1,
            }
        }
    ])
    if(!video){
        throw new ApiError(500,"Failed to fetch video");
    }
    //Increment views by 1
    await Video.findByIdAndUpdate(videoId,{
        $inc:{
            views:1
        }
    });
    //add user to watchHistory
    await User.findByIdAndUpdate(req.user?._id,{
        $addToSet:{
            watchHistory:videoId,
        }
    });

    return res
            .status(200)
            .json(200,video[0],"Videos fetched successfully");

})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail

    const { videoId } = req.params
    const {title, description} = req.body;
    if(!title || !description) throw new ApiError(404,"Title and description are required fields")

    const video= await Video.findbyId(videoId);

    if(!video) throw new ApiError(404,"No video found");
    if(video.owner.toString() !== req.user?.id.toString()) throw new ApiError(404,"Video can only by edited by owner");

    const thumbnailLocalPath = req.file?.path;
    if(!thumbnailLocalPath) throw new ApiError(404,"Thumbnail required");

    const thumbnailToDelete= video.thumbnail?.public_id;
    const updatedThumbnail = await uploadonCloudinary(thumbnailLocalPath);
    if(!updatedThumbnail) throw new ApiError(500,"Upload failed on cloudinary");

    const updatedVideo = await Video.findByIdAndUpdate(videoId,{
        $set:{
            title,
            description,
            thumbnail:
            {
                url:updatedThumbnail?.url,
                public_id:updatedThumbnail?.public_id,
            },

        }
    },{new:true});
    if(!updatedVideo) throw new ApiError(500,"Failed to update video");
    if(updatedVideo) await deleteOnCloudinary(thumbnailToDelete);

    return res 
            .status(200)
            .json(200,updatedVideo,"Update Successful");
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!videoId) throw new ApiError(404,"No videoId found");

    const video = await Video.findbyId(videoId);
    if(!video) throw new ApiError(404,"No video found");

    if(video.owner?._id.toString() !== req.user?._id.toString()) throw new ApiError(404,"Only owner can edit video");

    await deleteOnCloudinary(video.thumbnail?.public_id);
    await deleteOnCloudinary(video.thumbnail?.public_id,"video");

    await Like.deleteMany({video:videoId});
    await Comment.deleteMany({video:videoId});

    return res
            .status(200)
            .json(200,{},"Video deleted successfully");

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId) throw new ApiError(404,"Invalid video");

    const video= await Video.findbyId(videoId);
    if(!video) throw new ApiError(404,"Video not found");

    if(video.owner?._id.toString() !== req.user?._id.toString()) throw new ApiError(404,"Video can only be edited by the owner");

    const togglePublishStatus = await Video.findByIdAndUpdate(videoId,{
        $set:{
            isPublished: !video?.isPublished,
        }
    },{new:true});

    if(!togglePublishStatus) throw new ApiError(500,"Failed to toggle publish status");

    return res
            .status(200)
            .json(200,{isPublished:togglePublishStatus.isPublished},"Toggled Publish Status successfully");

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}