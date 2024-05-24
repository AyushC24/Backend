import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Like } from "../models/like.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)) throw new ApiError(`Invalid video`);

    const commentsAggregate = await Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId( videoId),
            }
        },
        {
            $lookup:{
                from:"users",
                localfield:"owner",
                foreignfield:"_id",
                as:"CommentOwner",
            }
        },
        {
            $lookup:{
                from:"likes",
                localfield:"_id",
                foreignfield:"comment",
                as:"LikedComments",
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$LikedComments",
                },
                owner:{
                    $first:"$CommentOwner",
                },
                isLiked:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$LikedComment.likedBy"]
                        },
                        then:true,
                        else:false,
                    }
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
                content:1,
                createdAt:1,
                likesCount:1,
                isLiked:1,
                CommentOwner:{
                    username:1,
                    fullName:1,
                    "avatar.url":1,
                }
            }
        }
    ]);

    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    }

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options,
    );

    return res
            .status(200)
            .json(new ApiResponse(200,comments,"All Comments fetched successfully"));

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content}=req.body;
    const {videoId}=req.params;

    if(!content) throw new ApiError(404,"No content detected");
    if(isValidObjectId(videoId)) throw new ApiError(404,"No Video Found");

    const comment = await Comment.create({
        content,
        video:videoId,
        owner:req.user?._id,
    });

    if(!comment) throw new ApiError(500,"Failed to add comment");

    return res
            .status(200)
            .json(200,comment,"Comment added successfully");

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {newcomment} = req.body;
    if(isValidObjectId(commentId)) throw new ApiError(404,"Comment not found");
    
    if(!newcomment) throw new ApiError(404,"Comment is needed");

    const comment = await Comment.findbyId(commentId);
    if(comment.owner?._id.toString() !== req.user?._id.toString()) throw new ApiError(404,"Only owner can edit comment");

    const updatedComment = await Comment.findByIdAndUpdate(commentId,{
        content:newcomment,
    },{new:true});

    if(!updatedComment) throw new ApiError(500,"Failed to update comment");

    return res
            .status(200)
            .json(200,updatedComment,"Comment updated successfully");

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const {commentId} = req.params;
    if(!isValidObjectId(commentId)) throw new ApiError(404,"Invalid comment id");

    const comment = await Comment.findbyId(commentId);

    if(comment.owner?._id.toString() !== req.user?._id.toString()) throw new ApiError(404,"Only be deleted by owner");

    await Comment.findbyIdAndDelete(commentId);

    await Like.deleteMany({
        comment:commentId,
        likedBy:req.user,
    });

    return res
            .status(200)
            .json(new ApiResponse(200,{},"Comment deleted successfully"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }