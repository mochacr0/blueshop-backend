import Cart from '../models/cart.model.js';
import Variant from '../models/variant.model.js';
import { validationResult } from 'express-validator';
import { InvalidDataError, ItemNotFoundError, UnprocessableContentError } from '../utils/errors.js';

const getCart = async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id })
        .populate({
            path: 'cartItems.variant',
            populate: { path: 'product' },
        })
        .lean();
    if (!cart) {
        throw new ItemNotFoundError('Giỏ hàng không tồn tại');
    }
    res.json({ message: 'Success', data: { cartItems: [...cart.cartItems] } });
};

const addToCart = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
    const { variantId } = req.body;
    const quantity = parseInt(req.body.quantity);
    if (!quantity || quantity <= 0) {
        throw new InvalidDataError('Số lượng không hợp lệ');
    }
    const findCart = Cart.findOne({ user: req.user._id });
    const findVariant = Variant.findOne({ _id: variantId }).lean();
    const [cart, variant] = await Promise.all([findCart, findVariant]);
    if (!cart) {
        throw new UnprocessableContentError('Giỏ hàng không tồn tại');
    }
    if (!variant) {
        throw new UnprocessableContentError('Sản phẩm không tồn tại');
    }
    let isQuantityValid = true;
    let currentQuantity = 0;
    const addedItemIndex = cart.cartItems.findIndex((item) => item.variant.toString() == variant._id.toString());
    if (addedItemIndex !== -1) {
        currentQuantity = cart.cartItems[addedItemIndex].quantity;
    }
    isQuantityValid = quantity + currentQuantity <= variant.quantity;
    if (!isQuantityValid) {
        throw new InvalidDataError('Số lượng mặt hàng thêm vào giỏ đã vượt số lượng mặt hàng có trong kho');
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
    res.json({ message: 'Sản phẩm đã được thêm vào giỏ', data: { cartItems: [...cart.cartItems] } });
};

const updateCartItem = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
    const { variantId } = req.body;
    const quantity = parseInt(req.body.quantity);
    if (!quantity) {
        throw new InvalidDataError('Số lượng không hợp lệ');
    }
    const findCart = Cart.findOne({ user: req.user._id });
    const findVariant = Variant.findOne({ _id: variantId }).lean();
    const [cart, variant] = await Promise.all([findCart, findVariant]);
    if (!cart) {
        throw new UnprocessableContentError('Giỏ hàng không tồn tại');
    }
    if (!variant) {
        throw new UnprocessableContentError('Sản phẩm không tồn tại');
    }
    if (quantity > variant.quantity) {
        throw new InvalidDataError('Số lượng mặt hàng thêm vào giỏ đã vượt số lượng mặt hàng có trong kho');
    }
    const updatedItemIndex = cart.cartItems.findIndex((item) => item.variant.toString() == variantId.toString());
    if (updatedItemIndex == -1) {
        throw new InvalidDataError('Sản phẩm không nằm trong giỏ hàng của bạn');
    }
    cart.cartItems[updatedItemIndex].quantity = quantity;
    let message = '';
    if (cart.cartItems[updatedItemIndex].quantity <= 0) {
        cart.cartItems.splice(updatedItemIndex, 1);
        message = 'Sản phẩm đã được xóa khỏi giỏ hàng';
    } else {
        await cart.save();
        message = 'Cập nhật sản phẩm trong giỏ hàng thành công';
    }
    await cart.save();
    res.json({ message });
};

const removeCartItems = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
    const variantIds = req.body.variantIds;
    const cart = await Cart.exists({ user: req.user._id });
    if (!cart) {
        throw new UnprocessableContentError('Giỏ hàng không tồn tại');
    }
    await Cart.updateMany({ _id: cart._id }, { $pull: { cartItems: { variant: { $in: variantIds } } } });
    res.json({ success: true, message: 'Sản phẩm đã được xóa khỏi giỏ hàng' });
};

const CartService = { getCart, addToCart, updateCartItem, removeCartItems };
export default CartService;
