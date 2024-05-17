const asyncHandler = (requestHandler) => {

    return (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next)).catch( (err) => next(err));
    }

}




export {asyncHandler}



// const asyncHandler = (fn)=> async (req,res,next)=>{
//     try{
    
//         return await fn(req,res,next);
    
//     }catch(e){

//         res.status(e.code || 500) .json({
//             success:false,
//             message:e.message
//         })
//     }
// }