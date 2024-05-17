import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"; //file system comes automatically from node

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env. CLOUDINARY_API_SECRET
});

const uploadonCloudinary = async (localFilePath)=>{
    try{
        
        if(!localFilePath) return NULL;
        //upload the file on cloudinary
        const response = await cloudinary.v2.uploader.upload(localFilePath,{
            resource_type:"auto",  
        });
        //file has been successfully uploaded
        console.log("File is uploaded on cloudinary",response.url);
        console.log(response);
        return response;

    }catch(e){
        fs.unlinkSync(localFilePath); //remove temporary file locally saved on our system as our operation got falied
        return null;
    }
}

export {uploadonCloudinary};
    
   