import express from 'express';
import asyncHandler from 'express-async-handler';
import { auth, protect } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import OrderService from '../services/OrderService.js';
import { validateRequest } from '../utils/validateRequest.js';
import { getHostUrl } from '../utils/urlUtils.js';

const OrderController = express.Router();

OrderController.get(
    '/ordered/:userId',
    validate.getOrdersByUserId,
    protect,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const userId = req.params.userId;
        const pageParameter = {
            limit: Number(req.query.limit) || 2,
            page: Number(req.query.page) || 0,
            status: String(req.query.status) || null,
        };
        res.json(await OrderService.getOrdersByUserId(userId, pageParameter, req.user));
    }),
);

OrderController.get(
    '/:id',
    validate.validateOrderId,
    protect,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const orderId = req.params.id || null;
        res.json(await OrderService.getOrderById(orderId, req.user));
    }),
);

OrderController.get(
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
        res.json(await OrderService.getOrders(pageParameter));
    }),
);

OrderController.post(
    '/',
    validate.createOrder,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const hostUrl = getHostUrl(req);
        const createOrderRequest = {
            shippingAddress: req.body.shippingAddress,
            paymentMethod: req.body.paymentMethod,
            orderItems: req.body.orderItems,
            discountCode: req.body.discountCode,
            note: req.body.note,
        };
        res.json(await OrderService.createOrder(createOrderRequest, hostUrl, req.user));
    }),
);

OrderController.post(
    '/:id/payment-notification',
    validate.validateOrderId,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const ipnRequest = {
            orderId: req.body.orderId,
            requestId: req.body.requestId,
            amount: req.body.amount,
            transId: req.body.transId,
            resultCode: req.body.resultCode,
            message: req.body.message,
            responseTime: req.body.responseTime,
            extraData: req.body.extraData,
            signature: req.body.signature,
            orderType: req.body.orderType,
            payType: req.body.payType,
        };
        await OrderService.orderPaymentNotification(ipnRequest);
        res.status(204);
        res.json(null);
    }),
);

OrderController.patch(
    '/:id/confirm',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const orderId = req.params.id || '';
        const request = {
            description: String(req.body.description) || '',
        };
        res.json(await OrderService.confirmOrder(orderId, request, req.user));
    }),
);

OrderController.patch(
    '/:id/delivery',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const orderId = req.params.id;
        const placeShipmentRequest = {
            description: req.body.description?.toString().trim() || '',
            requiredNote: req.body.requiredNote || null,
        };
        res.json(await OrderService.confirmDelivery(orderId, placeShipmentRequest, req.user));
    }),
);

OrderController.patch(
    '/:id/delivered',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const orderId = req.params.id || '';
        const confirmDeliveredRequest = {
            description: req.body.description?.toString()?.trim() || '',
        };
        res.json(await OrderService.confirmDelivered(orderId, confirmDeliveredRequest, req.user));
    }),
);

OrderController.patch(
    '/:id/received',
    validate.validateOrderId,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const orderId = req.params.id || '';
        const confirmReceiveddRequest = {
            description: req.body.description?.toString()?.trim() || '',
        };
        res.json(await OrderService.confirmReceived(orderId, confirmReceiveddRequest, req.user));
    }),
);

OrderController.patch(
    '/:id/confirm-payment',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const orderId = req.params.id || null;
        res.json(await OrderService.adminPaymentOrder(orderId, req.user));
    }),
);
OrderController.patch('/:id/cancel', validate.validateOrderId, protect, asyncHandler(OrderService.cancelOrder));

export default OrderController;
