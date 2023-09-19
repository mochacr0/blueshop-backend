import express, { request } from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth, getUserData } from '../middleware/auth.middleware.js';
import VoucherService from '../services/VoucherService.js';
import validate from '../middleware/validate.middleware.js';
import { validateRequest } from '../utils/validateRequest.js';

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
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const createVoucherRequest = {
            name: req.body.name,
            code: req.body.code,
            discountType: req.body.discountType,
            discount: req.body.discount,
            maximumDiscount: req.body.maximumDiscount,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            isUsageLimit: req.body.isUsageLimit,
            usageLimit: req.body.usageLimit,
            userUseMaximum: req.body.userUseMaximum,
            applyFor: req.body.applyFor,
            applicableProducts: req.body.applicableProducts,
        };
        res.json(await VoucherService.createDiscountCode(createVoucherRequest));
    }),
);

VoucherController.put(
    '/:id',
    validate.updateDiscountCode,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const discountCodeId = req.params.id;
        const createVoucherRequest = {
            name: req.body.name,
            code: req.body.code,
            discountType: req.body.discountType,
            discount: req.body.discount,
            maximumDiscount: req.body.maximumDiscount,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            isUsageLimit: req.body.isUsageLimit,
            usageLimit: req.body.usageLimit,
            userUseMaximum: req.body.userUseMaximum,
            applyFor: req.body.applyFor,
            applicableProducts: req.body.applicableProducts,
            updatedVersion: req.body.updatedVersion,
        };
        res.json(await VoucherService.updateDiscountCode(discountCodeId, createVoucherRequest));
    }),
);

VoucherController.delete(
    '/:id',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        res.json(await VoucherService.deleteDiscountCode(req.params.id));
    }),
);

export default VoucherController;
