import express from 'express';
import asyncHandler from 'express-async-handler';
import { auth, protect } from '../middleware/auth.middleware.js';
import OrderService from '../services/OrderService.js';
import validate from '../middleware/validate.middleware.js';
import { validateRequest } from '../utils/validateRequest.js';

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

// OrderController.get('/:id/payment-status', protect, asyncHandler(OrderService.getOrderPaymentStatus));

// OrderController.post('/:id/refund', protect, asyncHandler(OrderService.refundTrans));

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

// orderRouter.post('/', validate.placeOrder, protect, auth('user'), asyncHandler(orderController.placeOrder));
OrderController.post('/', validate.createOrder, protect, auth('user'), asyncHandler(OrderService.createOrder));
// orderRouter.post(
//     '/:id/payment-notification',
//     validate.validateOrderId,
//     asyncHandler(orderController.orderPaymentNotification),
// );
OrderController.get(
    '/:id/payment-notification',
    validate.validateOrderId,
    asyncHandler(OrderService.orderPaymentNotification),
);
OrderController.patch(
    '/:id/confirm',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(OrderService.confirmOrder),
);
OrderController.patch(
    '/:id/delivery',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(OrderService.confirmDelivery),
);
OrderController.patch(
    '/:id/delivered',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(OrderService.confirmDelivered),
);
OrderController.patch(
    '/:id/received',
    validate.validateOrderId,
    protect,
    auth('user'),
    asyncHandler(OrderService.confirmReceived),
);
OrderController.patch(
    '/:id/payment',
    validate.validateOrderId,
    protect,
    auth('user'),
    asyncHandler(OrderService.userPaymentOrder),
);
OrderController.patch(
    '/:id/confirm-payment',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(OrderService.adminPaymentOrder),
);
OrderController.patch('/:id/cancel', validate.validateOrderId, protect, asyncHandler(OrderService.cancelOrder));

export default OrderController;
