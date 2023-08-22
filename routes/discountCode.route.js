import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth, getUserData } from '../middleware/auth.middleware.js';
import discountCodeController from '../controllers/discountCode.controller.js';
import validate from '../middleware/validate.middleware.js';

const discountCodeRouter = express.Router();

discountCodeRouter.get('/', getUserData, asyncHandler(discountCodeController.getDiscountCode));

discountCodeRouter.get(
    '/:id',
    protect,
    auth('staff', 'admin'),
    asyncHandler(discountCodeController.getDiscountCodeById),
);
discountCodeRouter.get('/code/:code', asyncHandler(discountCodeController.getDiscountCodeByCode));
discountCodeRouter.post(
    '/discount-calculation',
    validate.discountCalculation,
    protect,
    auth('user'),
    asyncHandler(discountCodeController.discountCalculation),
);
discountCodeRouter.post(
    '/',
    validate.createDiscountCode,
    protect,
    auth('staff', 'admin'),
    asyncHandler(discountCodeController.createDiscountCode),
);
discountCodeRouter.put(
    '/:id',
    validate.updateDiscountCode,
    protect,
    auth('staff', 'admin'),
    asyncHandler(discountCodeController.updateDiscountCode),
);
discountCodeRouter.delete(
    '/:id',
    protect,
    auth('staff', 'admin'),
    asyncHandler(discountCodeController.deleteDiscountCode),
);

export default discountCodeRouter;
