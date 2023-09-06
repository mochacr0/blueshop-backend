import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import DeliveryService from '../services/DeliveryService.js';
import validateRequest from '../utils/validateRequest.js';

const DeliveryController = express.Router();

DeliveryController.get(
    '/address/province',
    asyncHandler(async (req, res) => {
        res.json(await DeliveryService.getProvince());
    }),
);

DeliveryController.get(
    '/address/:id/district',
    asyncHandler(async (req, res) => {
        const provinceId = Number(req.params.id) || null;
        res.json(await DeliveryService.getDistrictsByProvinceId(provinceId));
    }),
);

DeliveryController.get(
    '/address/:id/ward',
    asyncHandler(async (req, res) => {
        const districtId = Number(req.params.id) || null;
        res.json(await DeliveryService.getWardsByDistrictId(districtId));
    }),
);

DeliveryController.get(
    '/shipping-order/:id/print',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        const orderId = req.params.id || '';
        const pageSize = req.query.pageSize || 'A5';
        res.json(await DeliveryService.printOrder(orderId, pageSize));
    }),
);

DeliveryController.get(
    '/',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        const pageParameter = {
            limit: Number(req.query.limit) || 20,
            page: Number(req.query.page) || 0,
            sortBy: req.query.sortBy,
            status: req.query.status,
        };
        res.json(await DeliveryService.getDeliveries(pageParameter));
    }),
);

DeliveryController.post('/shipping-order/fee', validate.calculateFee, asyncHandler(DeliveryService.calculateFee));
DeliveryController.post('/shipping-order/update-status', asyncHandler(DeliveryService.updateStatus));
DeliveryController.post('/shipping-order/services', validate.calculateFee, asyncHandler(DeliveryService.calculateFee));
DeliveryController.post(
    '/shipping-order/lead-time',
    validate.estimatedDeliveryTime,
    asyncHandler(DeliveryService.estimatedDeliveryTime),
);
DeliveryController.post(
    '/shipping-order/:id/preview',
    protect,
    auth('staff', 'admin'),
    asyncHandler(DeliveryService.preview),
);

DeliveryController.post(
    '/shipping-order/:id/update-cod',
    validate.updateCOD,
    protect,
    auth('staff', 'admin'),
    asyncHandler(DeliveryService.updateCOD),
);
export default DeliveryController;
