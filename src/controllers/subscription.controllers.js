import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
const toggleSubscription = asyncHandler(async(req,res)=>{
        const {channelId}=req.params;
        if(!channelId) throw new ApiError(404,"No valid channel");
        //check whether user has subscribed to channel or not
        //toggle the result
        const isSubscribed = await Subscription.findOne({
            subscriber: req.user?._id,
            channel: channelId
        });
        if(!isSubscribed)
        {
            await Subscription.create({
                subscriber: req.user?._id,
                channel: channelId,
            })
            return res
                    .status(200)
                    .json(new ApiResponse(200,{subscribed:true},"Channel Subscribed"));
        }   
        
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res
                .status(200)
                .json(new ApiResponse(200,{subscribed:false},"Channel Unsubscribed successfully"));
});

const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    const {channelId} = req.params;
    

    if(!channelId) throw new ApiError(404,"Invalid Channel Id");
    
    const subscriberList = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        }, 
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"Details",
            }
        },
        {
            $project:{
                subscriber:1,
                Details:{
                        username:1,
                        email:1,
                        fullName:1,
                        avatar:1,
                        coverImage:1,
                    },
            }
        },
    ]) ;
    // console.log(subscriberList);
    return res
            .status(200)
            .json(new ApiResponse(200,subscriberList,"List of Subscribers"));

});

export {
    toggleSubscription,
    getUserChannelSubscribers,
}