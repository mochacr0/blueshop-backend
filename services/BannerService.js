import * as fs from 'fs';
import Banner from '../models/banner.model.js';
import { cloudinaryUpload, cloudinaryRemove } from '../utils/cloudinary.js';
import { validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import {
    InternalServerError,
    InvalidDataError,
    ItemNotFoundError,
    UnprocessableContentError,
} from '../utils/errors.js';

const getBanners = async () => {
    const getBanners = Banner.find({ type: 'banner' }).sort({ _id: -1 }).lean();
    const getSliders = Banner.find({ type: 'slider' }).sort({ _id: -1 }).lean();
    const [banners, sliders] = await Promise.all([getBanners, getSliders]);
    return { banners, sliders };
};

const getBannerById = async (bannerId) => {
    const banner = await Banner.findOne({ _id: bannerId }).lean();
    if (!banner) {
        throw new ItemNotFoundError('Banner không tồn tại');
    }
    return banner;
};

const createBanner = async (request) => {
    request.imageFile = request.imageFile ? JSON.parse(request.imageFile) : '';
    let imageUrl = '';
    if (request.imageFile && request.imageFile.trim() !== '') {
        const uploadImage = await cloudinaryUpload(request.imageFile, 'FashionShop/banners');
        if (!uploadImage) {
            throw new Error('Xảy ra lỗi khi upload ảnh');
        }
        imageUrl = uploadImage.secure_url;
    } else {
        throw new InvalidDataError('Hình ảnh banner không được để trống');
    }

    const banner = new Banner({
        title: request.title,
        image: imageUrl,
        linkTo: request.linkTo,
        type: request.type,
    });
    return await banner.save();
};

const updateBanner = async (bannerId, request) => {
    const banner = await Banner.findOne({ _id: bannerId });
    if (!banner) {
        throw new ItemNotFoundError('Banner không tồn tại');
    }
    if (banner.updatedVersion != request.updatedVersion) {
        throw new UnprocessableContentError(
            'Ảnh bìa vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất',
        );
    }
    banner.updatedVersion = Number(banner.updatedVersion) + 1;
    const imageFile = request.imageFile ? JSON.parse(request.imageFile) : '';
    let imageUrl = '';
    if (imageFile && imageFile.trim() !== '') {
        const uploadImage = await cloudinaryUpload(imageFile, 'FashionShop/banners');
        if (!uploadImage) {
            throw new InternalServerError('Xảy ra lỗi khi upload ảnh');
        }
        imageUrl = uploadImage.secure_url;
    } else if (request.image && request.image.trim() !== '' && banner.image != request.image) {
        if (banner.image !== request.image) {
            const uploadImage = await cloudinaryUpload(request.image, 'FashionShop/banners');
            if (!uploadImage) {
                throw new InternalServerError('Xảy ra lỗi khi upload ảnh');
            }
            imageUrl = uploadImage.secure_url;
        } else imageUrl = banner.image;
    } else {
        throw new InvalidDataError('Hình ảnh banner không được để trống');
    }
    if (imageUrl != banner.image) {
        let url = banner.image;
        const publicId = banner.image?.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.')) || null;
        await cloudinaryRemove('FashionShop/banners/' + publicId);
    }

    banner.title = request.title || banner.title;
    banner.image = imageUrl || banner.image;
    banner.linkTo = request.linkTo || banner.linkTo;
    return await banner.save();
};

const deleteBanner = async (req, res) => {
    const deletedBanner = await Banner.findByIdAndDelete(req.params.id).lean();
    if (!deletedBanner) {
        throw new ItemNotFoundError('Banner không tồn tại');
    }
    let url = deletedBanner.image;
    const publicId = url?.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
    await cloudinaryRemove('FashionShop/banners/' + publicId);
    res.json({ message: 'Xóa banner thành công' });
};

const BannerService = {
    getBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
};
export default BannerService;
