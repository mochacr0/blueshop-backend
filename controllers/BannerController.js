import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import { multerUpload } from '../utils/multer.js';
import BannerService from '../services/BannerService.js';
import validate from '../middleware/validate.middleware.js';
import validateRequest from '../utils/validateRequest.js';

const BannerController = express.Router();

BannerController.get(
    '/',
    asyncHandler(async (req, res) => {
        res.json(await BannerService.getBanners());
    }),
);

BannerController.get(
    '/:id',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        res.json(await BannerService.getBannerById(req.params.id));
    }),
);

BannerController.post(
    '/',
    multerUpload.single('imageFile'),
    validate.createBanner,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const createBannerRequest = {
            title: req.body.title,
            linkTo: req.body.linkTo,
            type: req.body.type,
            imageFile: req.body.imageFile,
        };
        res.json(await BannerService.createBanner(createBannerRequest));
    }),
);

BannerController.put(
    '/:id',
    multerUpload.single('imageFile'),
    validate.updateBanner,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const bannerId = req.params.id;
        const createBannerRequest = {
            title: req.body.title,
            linkTo: req.body.linkTo,
            type: req.body.type,
            image: req.body.image,
            imageFile: req.body.imageFile,
            updatedVersion: req.body.updatedVersion,
        };
        res.json(await BannerService.updateBanner(bannerId, createBannerRequest));
    }),
);
BannerController.delete('/:id', protect, auth('staff', 'admin'), asyncHandler(BannerService.deleteBanner));
// bannerRouter.patch('/:id/increaseIndex', protect, auth('staff', 'admin'), asyncHandler(bannerController.increaseIndex));

// bannerRouter.patch('/:id/decreaseIndex', protect, auth('staff', 'admin'), asyncHandler(bannerController.decreaseIndex));

export default BannerController;
