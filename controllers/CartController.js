import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import CartService from '../services/CartService.js';
import validate from '../middleware/validate.middleware.js';

const CartController = express.Router();

CartController.get('/', protect, auth('user'), asyncHandler(CartService.getCart));
CartController.post('/add', validate.addProductToCart, protect, auth('user'), asyncHandler(CartService.addToCart));
CartController.patch(
    '/remove',
    validate.removeCartItems,
    protect,
    auth('user'),
    asyncHandler(CartService.removeCartItems),
);
CartController.patch(
    '/update',
    validate.updateCartItem,
    protect,
    auth('user'),
    asyncHandler(CartService.updateCartItem),
);

export default CartController;
