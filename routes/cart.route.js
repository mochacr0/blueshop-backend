import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import cartController from '../controllers/cart.controller.js';
import validate from '../middleware/validate.middleware.js';

const cartRouter = express.Router();

cartRouter.get('/', protect, auth('user'), asyncHandler(cartController.getCart));
cartRouter.post('/add', validate.addProductToCart, protect, auth('user'), asyncHandler(cartController.addToCart));
cartRouter.patch(
    '/remove',
    validate.removeCartItems,
    protect,
    auth('user'),
    asyncHandler(cartController.removeCartItems),
);
cartRouter.patch(
    '/update',
    validate.updateCartItem,
    protect,
    auth('user'),
    asyncHandler(cartController.updateCartItem),
);

export default cartRouter;
