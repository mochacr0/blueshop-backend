import express from 'express';
import asyncHandler from 'express-async-handler';
import { auth, protect } from '../middleware/auth.middleware.js';
import orderController from '../controllers/order.controller.js';
import validate from '../middleware/validate.middleware.js';

const orderRouter = express.Router();

orderRouter.get(
    '/ordered/:userId',
    validate.getOrdersByUserId,
    protect,
    asyncHandler(orderController.getOrdersByUserId),
);
orderRouter.get('/:id/payment-status', protect, asyncHandler(orderController.getOrderPaymentStatus));
orderRouter.get('/:id/refund', protect, asyncHandler(orderController.refundTrans));
orderRouter.get('/:id', validate.validateOrderId, protect, asyncHandler(orderController.getOrderById));
orderRouter.get('/', protect, auth('staff', 'admin'), asyncHandler(orderController.getOrders));
// orderRouter.post('/', validate.placeOrder, protect, auth('user'), asyncHandler(orderController.placeOrder));
orderRouter.post('/', validate.createOrder, protect, auth('user'), asyncHandler(orderController.createOrder));
orderRouter.post(
    '/:id/payment-notification',
    validate.validateOrderId,
    asyncHandler(orderController.orderPaymentNotification),
);
orderRouter.patch(
    '/:id/confirm',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(orderController.confirmOrder),
);
orderRouter.patch(
    '/:id/delivery',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(orderController.confirmDelivery),
);
orderRouter.patch(
    '/:id/delivered',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(orderController.confirmDelivered),
);
orderRouter.patch(
    '/:id/received',
    validate.validateOrderId,
    protect,
    auth('user'),
    asyncHandler(orderController.confirmReceived),
);
orderRouter.patch(
    '/:id/payment',
    validate.validateOrderId,
    protect,
    auth('user'),
    asyncHandler(orderController.userPaymentOrder),
);
orderRouter.patch(
    '/:id/confirm-payment',
    validate.validateOrderId,
    protect,
    auth('staff', 'admin'),
    asyncHandler(orderController.adminPaymentOrder),
);
orderRouter.patch('/:id/cancel', validate.validateOrderId, protect, asyncHandler(orderController.cancelOrder));

export default orderRouter;
