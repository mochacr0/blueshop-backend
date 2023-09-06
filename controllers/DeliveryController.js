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
    '/shipping-order/:id/print/:pageSize',
    protect,
    auth('staff', 'admin'),
    asyncHandler(DeliveryService.printOrder),
);
DeliveryController.get('/', protect, auth('staff', 'admin'), asyncHandler(DeliveryService.getDeliveries));
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
