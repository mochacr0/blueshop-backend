import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth, getUserData } from '../middleware/auth.middleware.js';
import VoucherService from '../services/VoucherService.js';
import validate from '../middleware/validate.middleware.js';

const VoucherController = express.Router();

VoucherController.get('/', getUserData, asyncHandler(VoucherService.getDiscountCode));

VoucherController.get('/:id', protect, auth('staff', 'admin'), asyncHandler(VoucherService.getDiscountCodeById));
VoucherController.get('/code/:code', asyncHandler(VoucherService.getDiscountCodeByCode));
VoucherController.post(
    '/discount-calculation',
    validate.discountCalculation,
    protect,
    auth('user'),
    asyncHandler(VoucherService.discountCalculation),
);
VoucherController.post(
    '/',
    validate.createDiscountCode,
    protect,
    auth('staff', 'admin'),
    asyncHandler(VoucherService.createDiscountCode),
);
VoucherController.put(
    '/:id',
    validate.updateDiscountCode,
    protect,
    auth('staff', 'admin'),
    asyncHandler(VoucherService.updateDiscountCode),
);
VoucherController.delete('/:id', protect, auth('staff', 'admin'), asyncHandler(VoucherService.deleteDiscountCode));

export default VoucherController;
