import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import CartService from '../services/CartService.js';
import validate from '../middleware/validate.middleware.js';
import validateRequest from '../utils/validateRequest.js';

const CartController = express.Router();

CartController.get(
    '/',
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        res.json(await CartService.getCart(req.user));
    }),
);

CartController.post(
    '/add',
    validate.addProductToCart,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const addToCartRequest = {
            variantId: req.body.variantId,
            quantity: parseInt(req.body.quantity),
        };
        res.json(await CartService.addToCart(addToCartRequest, req.user));
    }),
);

CartController.patch(
    '/remove',
    validate.removeCartItems,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const { variantIds } = req.body;
        res.json(await CartService.removeCartItems(variantIds, req.user));
    }),
);

CartController.patch(
    '/update',
    validate.updateCartItem,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const updateCartItemRequest = {
            variantId: req.body.variantId,
            quantity: parseInt(req.body.quantity),
        };
        res.json(await CartService.updateCartItem(updateCartItemRequest, req.user));
    }),
);

export default CartController;
