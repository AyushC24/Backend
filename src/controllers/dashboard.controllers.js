import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subscription.models.js"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user?._id;

    const totalSubscribers = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $group:{
                _id: null,
                subcribers_count:{
                    $sum:1,
                }
            }
        },
    ]);
    if(!totalSubscribers) throw new ApiError(500,"Failed to fetch total Subscribers");
    const video = await Video.aggregate([
        {
            $match:{
                owner: userId,
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"Likes",
            }
        },
        {
            $group:{
                _id:null,
                totalLikes:{
                    $size:"$Likes",
                },
                totalViews:{
                    $size:"$views",
                },
                totalVideos: {
                    $sum: 1
                }
            }
        },
        {
            $project:{
                totalLikes:1,
                totalViews:1,
                totalVideos:1,
            }
        }
    ]);
    if(!getChannelStats) throw new ApiError(500,"Failed to fetch total videos,likes,views");
    const channelStats = {
        totalSubscribers: totalSubscribers[0]?.subcribers_count || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0,
    };

    return res
            .status(200)
            .json(new ApiResponse(200,channelStats,"Data fetched successfully"));

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const user = req.user?._id;
    const video = await Video.aggregate([
        {
            $match:{
                owner:user,
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes",
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                }
            }
        },
        {
            $sort:{
                createdAt:-1,
            }
        },
        {
            $project:{
                _id:1,
                "videoFile.url":1,
                "thumbnail.url":1,
                title:1,
                description:1,
                isPublished:1,
                likesCount:1,
                createdAt:{
                    year:1,
                    month:1,
                    day:1,
                }
            }
        }
    ]);
    if(!video) throw new ApiError(500,"Failed to fetch data");
    return res
            .status(200)
            .json(new ApiResponse(200,video.push,"All videos fetched successfully"));

})

export {
    getChannelStats, 
    getChannelVideos
}