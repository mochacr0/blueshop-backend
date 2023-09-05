import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth, getUserData } from '../middleware/auth.middleware.js';
import VoucherService from '../services/VoucherService.js';
import validate from '../middleware/validate.middleware.js';
import validateRequest from '../utils/validateRequest.js';

const VoucherController = express.Router();

VoucherController.get(
    '/',
    getUserData,
    asyncHandler(async (req, res) => {
        res.json(await VoucherService.getDiscountCode(req.query.keyword, req.user));
    }),
);

VoucherController.get(
    '/:id',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        res.json(await VoucherService.getDiscountCodeById(req.params.id));
    }),
);

VoucherController.get(
    '/code/:code',
    asyncHandler(async (req, res) => {
        res.json(await VoucherService.getDiscountCodeByCode(req.params.code));
    }),
);

VoucherController.post(
    '/discount-calculation',
    validate.discountCalculation,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const { discountCode, orderItems } = req.body;
        res.json(await VoucherService.discountCalculation(discountCode, orderItems, req.user));
    }),
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
