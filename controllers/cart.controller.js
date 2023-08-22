import Cart from '../models/cart.model.js';
import Variant from '../models/variant.model.js';
import { validationResult } from 'express-validator';

const getCart = async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id })
        .populate({
            path: 'cartItems.variant',
            populate: { path: 'product' },
        })
        .lean();
    if (!cart) {
        res.status(404);
        throw new Error('Giỏ hàng không tồn tại');
    }
    res.status(200).json({ message: 'Success', data: { cartItems: [...cart.cartItems] } });
};

const addToCart = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { variantId } = req.body;
    const quantity = parseInt(req.body.quantity);
    if (!quantity || quantity <= 0) {
        res.status(404);
        throw new Error('Số lượng không hợp lệ');
    }
    const findCart = Cart.findOne({ user: req.user._id });
    const findVariant = Variant.findOne({ _id: variantId }).lean();
    const [cart, variant] = await Promise.all([findCart, findVariant]);
    if (!cart) {
        res.status(404);
        throw new Error('Giỏ hàng không tồn tại');
    }
    if (!variant) {
        res.status(400);
        throw new Error('Sản phẩm không tồn tại');
    }
    if (quantity <= 0) {
        res.status(400);
        throw new Error('Số lượng phải lớn hơn 0');
    }
    let isQuantityValid = true;
    let currentQuantity = 0;
    const addedItemIndex = cart.cartItems.findIndex((item) => item.variant.toString() == variant._id.toString());
    if (addedItemIndex !== -1) {
        currentQuantity = cart.cartItems[addedItemIndex].quantity;
    }
    isQuantityValid = quantity + currentQuantity <= variant.quantity;
    if (!isQuantityValid) {
        res.status(400);
        throw new Error('Số lượng mặt hàng thêm vào giỏ đã vượt số lượng mặt hàng có trong kho');
    }
    if (addedItemIndex !== -1) {
        cart.cartItems[addedItemIndex].quantity = quantity + currentQuantity;
    } else {
        const cartItem = {
            variant: variant._id,
            quantity: quantity,
            attributes: [...variant.attributes],
        };
        cart.cartItems.push(cartItem);
    }

    await cart.save();
    res.status(200).json({ message: 'Sản phẩm đã được thêm vào giỏ', data: { cartItems: [...cart.cartItems] } });
};

const updateCartItem = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { variantId } = req.body;
    const quantity = parseInt(req.body.quantity);
    if (!quantity) {
        res.status(404);
        throw new Error('Số lượng không hợp lệ');
    }
    const findCart = Cart.findOne({ user: req.user._id });
    const findVariant = Variant.findOne({ _id: variantId }).lean();
    const [cart, variant] = await Promise.all([findCart, findVariant]);
    if (!cart) {
        res.status(404);
        throw new Error('Giỏ hàng không tồn tại');
    }
    if (!variant) {
        res.status(400);
        throw new Error('Sản phẩm không tồn tại');
    }
    if (quantity > variant.quantity) {
        res.status(400);
        throw new Error('Số lượng mặt hàng thêm vào giỏ đã vượt số lượng mặt hàng có trong kho');
    }
    const updatedItemIndex = cart.cartItems.findIndex((item) => item.variant.toString() == variantId.toString());
    if (updatedItemIndex == -1) {
        res.status(400);
        throw new Error('Sản phẩm không nằm trong giỏ hàng của bạn');
    }
    cart.cartItems[updatedItemIndex].quantity = quantity;
    let message = '';
    if (cart.cartItems[updatedItemIndex].quantity <= 0) {
        cart.cartItems.splice(updatedItemIndex, 1);
        message = 'Sản phẩm đã được xóa khỏi giỏ hàng';
    } else {
        await cart.save();
        res.status(200);
        message = 'Cập nhật sản phẩm trong giỏ hàng thành công';
    }
    await cart.save();
    res.status(200).json({ message });
};

const removeCartItems = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const variantIds = req.body.variantIds;
    const cart = await Cart.exists({ user: req.user._id });
    if (!cart) {
        res.status(404);
        throw new Error('Giỏ hàng không tồn tại');
    }

    await Cart.updateMany({ _id: cart._id }, { $pull: { cartItems: { variant: { $in: variantIds } } } });
    res.status(200).json({ success: true, message: 'Sản phẩm đã được xóa khỏi giỏ hàng' });
};

const cartController = { getCart, addToCart, updateCartItem, removeCartItems };
export default cartController;
