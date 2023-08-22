import * as fs from 'fs';
import Banner from '../models/banner.model.js';
import { cloudinaryUpload, cloudinaryRemove } from '../utils/cloudinary.js';
import { validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';

const getBanners = async (req, res) => {
    const getBanners = Banner.find({ type: 'banner' }).sort({ _id: -1 }).lean();
    const getSliders = Banner.find({ type: 'slider' }).sort({ _id: -1 }).lean();
    const [banners, sliders] = await Promise.all([getBanners, getSliders]);
    return res.status(200).json({ message: 'Success', data: { banners, sliders } });
};

const getBannerById = async (req, res) => {
    const banner = await Banner.findOne({ _id: req.params.id }).lean();
    if (!banner) {
        res.status(404);
        throw new Error('Banner không tồn tại');
    }
    return res.status(200).json({ message: 'Success', data: { banner } });
};

const createBanner = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { title, linkTo, type } = req.body;
    const imageFile = req.body.imageFile ? JSON.parse(req.body.imageFile) : '';
    let image = '';
    if (imageFile && imageFile.trim() !== '') {
        const uploadImage = await cloudinaryUpload(imageFile, 'FashionShop/banners');
        if (!uploadImage) {
            throw new Error('Some banners were not uploaded due to an unknown error');
        }
        image = uploadImage.secure_url;
    } else {
        res.status(400);
        throw new Error('Hình ảnh banner không được để trống');
    }

    const banner = new Banner({
        title,
        image,
        linkTo,
        type,
    });
    const newBanner = await banner.save();
    return res.status(201).json({ message: 'Thêm banner thành công', data: { newBanner } });
};

const updateBanner = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { title, image, linkTo, updatedVersion } = req.body;

    const banner = await Banner.findOne({ _id: req.params.id });
    if (!banner) {
        return res.status(404).json({ message: 'Banner không tồn tại' });
    }
    if (banner.updatedVersion != updatedVersion) {
        res.status(400);
        throw new Error('Ảnh bìa vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất');
    }
    banner.updatedVersion = Number(banner.updatedVersion) + 1;
    const imageFile = req.body.imageFile ? JSON.parse(req.body.imageFile) : '';
    let imageUrl = '';
    if (imageFile && imageFile.trim() !== '') {
        const uploadImage = await cloudinaryUpload(imageFile, 'FashionShop/banners');
        if (!uploadImage) {
            throw new Error('Some banners were not uploaded due to an unknown error');
        }
        imageUrl = uploadImage.secure_url;
    } else if (image && image.trim() !== '' && banner.image != image) {
        if (banner.image !== image) {
            const uploadImage = await cloudinaryUpload(image, 'FashionShop/banners');
            if (!uploadImage) {
                throw new Error('Some banners were not uploaded due to an unknown error');
            }
            imageUrl = uploadImage.secure_url;
        } else imageUrl = banner.image;
    } else {
        res.status(400);
        throw new Error('Hình ảnh banner không được để trống');
    }
    if (imageUrl != banner.image) {
        let url = banner.image;
        const publicId = banner.image?.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.')) || null;
        await cloudinaryRemove('FashionShop/banners/' + publicId);
    }

    banner.title = title || banner.title;
    banner.image = imageUrl || banner.image;
    banner.linkTo = linkTo || banner.linkTo;
    const updateBanner = await banner.save();
    res.status(200).json({ message: 'Cập nhật banner thành công', data: { updateBanner } });
};

const deleteBanner = async (req, res) => {
    const bannerId = req.params.id || null;
    if (!ObjectId.isValid(bannerId)) {
        res.status(400);
        throw new Error('ID không hợp lệ');
    }
    const deletedBanner = await Banner.findByIdAndDelete(req.params.id).lean();
    if (!deletedBanner) {
        res.status(404);
        throw new Error('Banner không tồn tại');
    }
    let url = deletedBanner.image;
    const publicId = url?.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
    await cloudinaryRemove('FashionShop/banners/' + publicId);
    res.status(200).json({ message: 'Xóa banner thành công' });
};

const bannerController = {
    getBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
};
export default bannerController;
