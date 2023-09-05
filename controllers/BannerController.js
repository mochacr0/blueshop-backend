import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import { multerUpload } from '../utils/multer.js';
import BannerService from '../services/BannerService.js';
import validate from '../middleware/validate.middleware.js';

const BannerController = express.Router();

BannerController.get(
    '/',
    asyncHandler(async (req, res) => {
        res.json(await BannerService.getBanners());
    }),
);

BannerController.get('/:id', protect, auth('staff', 'admin'), asyncHandler(BannerService.getBannerById));

BannerController.post(
    '/',
    multerUpload.single('imageFile'),
    validate.createBanner,
    protect,
    auth('staff', 'admin'),
    asyncHandler(BannerService.createBanner),
);
BannerController.put(
    '/:id',
    multerUpload.single('imageFile'),
    validate.updateBanner,
    protect,
    auth('staff', 'admin'),
    asyncHandler(BannerService.updateBanner),
);
BannerController.delete('/:id', protect, auth('staff', 'admin'), asyncHandler(BannerService.deleteBanner));
// bannerRouter.patch('/:id/increaseIndex', protect, auth('staff', 'admin'), asyncHandler(bannerController.increaseIndex));

// bannerRouter.patch('/:id/decreaseIndex', protect, auth('staff', 'admin'), asyncHandler(bannerController.decreaseIndex));

export default BannerController;
