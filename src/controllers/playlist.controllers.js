import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist

    if(!name || !description) throw new ApiError(404,"All fields are required");
    
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    });

    if(!playlist) throw new ApiError(404,"Playlist not created");

    return res
            .status(200)
            .jsons(new ApiResponse(200,playlist,"Playlist created successfully"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)) throw new ApiError(404,"INvalid User");


    const getPlaylist = await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"Videos",
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$Videos",
                },
                totalView:{
                    $sum:"$Videos.views",
                },
            }
        },
        {
            $project:{
                _id:1,
                name:1,
                description:1,
                title:1,
                totalVideos:1,
                totalView:1,
                updatedAt:1,
            }
        }
    ]);
    if(!getPlaylist) throw new ApiError(500,"Cannot get All user playlists");

    return res
            .status(200)
            .json(new ApiResponse(200,getPlaylist,"Successfully fetched all playlists"));

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId)) throw new ApiError(404,"No playlist found");

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) throw new ApiError(404,"No playlist found");

    const playlistVideos = await Playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId),
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"Videos",
            }
        },
        {
            $match:{
                "Videos.isPublished":true,
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"Owner",
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ]);
    if(!playlistVideos) throw new ApiError(500,"Failed to fetch playlist");

    return res
            .status(200)
            .json(new ApiResponse(200,playlistVideos,"Successfully fetched playlist"))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)) throw new ApiError(404,"Invalid fields");
    
    const video=await Video.findById(videoId);
    const playlist= await Playlist.findById(playlistId);
    if(!video || !playlist) throw new ApiError(404,"Failed to find video and playlist");

    if(playlist.owner?._id.toString() !== req.user?._id.toString()) throw new ApiError(404,"Only owner can add videos");


    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
        $addToSet:{
            videos:videoId,
        }
    },{new:true});

    if(!updatedPlaylist) throw new ApiError(500,"Failed to add Video");

    return res
            .status(200)
            .json(200,updatedPlaylist,"Video Added Successfully");

});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)) throw new ApiError(404,"Invalid fields");
    
    const video=await Video.findById(videoId);
    const playlist= await Playlist.findById(playlistId);
    if(!video || !playlist) throw new ApiError(404,"Failed to find video and playlist");

    if(playlist.owner?._id.toString() !== req.user?._id.toString()) throw new ApiError(404,"Only owner can add videos");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
        $pull:{
            videos:videoId,
        }
    },{new:true});
    if(!updatedPlaylist) throw new ApiError(500,"Failed to delete Video");

    return res
            .status(200)
            .json(200,updatedPlaylist,"Video Deleted Successfully");

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId)) throw new ApiError(404,"No playlist to delete");

    const playlist = await Playlist.findById(playlistId);
    if(!playlist) throw new ApiError(404,"No playlist to delete");

    if(playlist.owner?._id.toString() !== req.user?._id.toString()) throw new ApiError(404,"Only owner can delete playlist");

    await Playlist.findByIdAndDelete(playlistId);

    return res
            .status(200)
            .json(new ApiResponse(200,{},"Playlist deleted successfully"));

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId)) throw new ApiError(404,"No such Playlist found");

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) throw new ApiError(404,"No playlist found");

    const updatePlaylist = await Playlist.findByIdAndUpdate(playlistId,{
        $set:{
            name,
            description,
        }
    },{new:true});

    return res
            .status(200)
            .json(new ApiResponse(200,updatePlaylist,"Playlist Updated Successfully"));

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}