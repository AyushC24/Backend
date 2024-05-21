import mongoose,{Schema} from "mongoose";

const tweetSchema = new Schema({

    content:{
        type:String,
        required:true,
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },

},{timestamps:true});

commentSchema.plugin(mongooseAggregatePaginate)

 export const Tweet = mongoose.model('Tweet',tweetSchema);