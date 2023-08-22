import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUpload = (file, folder, public_id) => {
    try {
        const result = cloudinary.uploader.upload(file, {
            resource_type: 'auto',
            folder: folder,
            public_id: public_id,
        });
        return result;
    } catch (error) {
        console.error(error);
    }
};

const cloudinaryRemove = (public_id) => {
    try {
        const result = cloudinary.uploader.destroy(public_id);
        return result;
    } catch (error) {
        console.error(error);
    }
};

export { cloudinaryUpload, cloudinaryRemove };
