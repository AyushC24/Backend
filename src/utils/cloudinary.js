import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"; //file system comes automatically from node

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadonCloudinary = async (localFilePath)=>{
    try{
        
        if(!localFilePath)
        {
            console.log("No path found");
            return NULL;
        }
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",  
        });
        //file has been successfully uploaded
        // console.log("File is uploaded on cloudinary",response.url);
        fs.unlinkSync(localFilePath);
        console.log(response);
        return response;

    }catch(e){
        console.log("Cloudinary per upload failed")
        if(localFilePath) fs.unlinkSync(localFilePath); //remove temporary file locally saved on our system as our operation got falied
        return null;
    }
};

const deleteOnCloudinary= async(public_id,resource_type="image") =>{

    try{

        if(!public_id) return NULL;
        const result = await cloudinary.uploader.destroy(public_id,{
            resource_type:`${resource_type}`,
        });
        return result;

    }catch(e){
        console.log("Delete on Cloudinary failed!!")
        return e;
    }
};

export {uploadonCloudinary,deleteOnCloudinary};
    
   