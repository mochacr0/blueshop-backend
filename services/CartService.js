import Cart from '../models/cart.model.js';
import Variant from '../models/variant.model.js';
import { validationResult } from 'express-validator';
import { InvalidDataError, ItemNotFoundError, UnprocessableContentError } from '../utils/errors.js';

const getCart = async (currentUser) => {
    const cart = await Cart.findOne({ user: currentUser._id })
        .populate({
            path: 'cartItems.variant',
            populate: { path: 'product' },
        })
        .lean();
    if (!cart) {
        throw new ItemNotFoundError('Giỏ hàng không tồn tại');
    }
    return cart.cartItems;
};

const addToCart = async (request, currentUser) => {
    if (!request.quantity || request.quantity <= 0) {
        throw new InvalidDataError('Số lượng không hợp lệ');
    }
    const findCart = Cart.findOne({ user: currentUser._id });
    const findVariant = Variant.findOne({ _id: request.variantId }).lean();
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
    isQuantityValid = request.quantity + currentQuantity <= variant.quantity;
    if (!isQuantityValid) {
        throw new InvalidDataError('Số lượng mặt hàng thêm vào giỏ đã vượt số lượng mặt hàng có trong kho');
    }
    if (addedItemIndex !== -1) {
        cart.cartItems[addedItemIndex].quantity = request.quantity + currentQuantity;
    } else {
        const cartItem = {
            variant: variant._id,
            quantity: request.quantity,
            attributes: [...variant.attributes],
        };
        cart.cartItems.push(cartItem);
    }

    const savedCart = await cart.save();
    return savedCart.cartItems;
};

const updateCartItem = async (request, currentUser) => {
    if (!request.quantity) {
        throw new InvalidDataError('Số lượng không hợp lệ');
    }
    const findCart = Cart.findOne({ user: currentUser._id });
    const findVariant = Variant.findOne({ _id: request.variantId }).lean();
    const [cart, variant] = await Promise.all([findCart, findVariant]);
    if (!cart) {
        throw new UnprocessableContentError('Giỏ hàng không tồn tại');
    }
    if (!variant) {
        throw new UnprocessableContentError('Sản phẩm không tồn tại');
    }
    if (request.quantity > variant.quantity) {
        throw new InvalidDataError('Số lượng mặt hàng thêm vào giỏ đã vượt số lượng mặt hàng có trong kho');
    }
    const updatedItemIndex = cart.cartItems.findIndex(
        (item) => item.variant.toString() == request.variantId.toString(),
    );
    if (updatedItemIndex == -1) {
        throw new InvalidDataError('Sản phẩm không nằm trong giỏ hàng của bạn');
    }
    cart.cartItems[updatedItemIndex].quantity = request.quantity;
    let message = '';
    if (cart.cartItems[updatedItemIndex].quantity <= 0) {
        cart.cartItems.splice(updatedItemIndex, 1);
        message = 'Sản phẩm đã được xóa khỏi giỏ hàng';
    } else {
        await cart.save();
        message = 'Cập nhật sản phẩm trong giỏ hàng thành công';
    }
    await cart.save();
    return message;
};

const removeCartItems = async (variantIds, currentUser) => {
    if (variantIds && variantIds.length > 0) {
        const cart = await Cart.exists({ user: currentUser._id });
        if (!cart) {
            throw new UnprocessableContentError('Giỏ hàng không tồn tại');
        }
        await Cart.updateMany({ _id: cart._id }, { $pull: { cartItems: { variant: { $in: variantIds } } } });
    }
    return 'Sản phẩm đã được xóa khỏi giỏ hàng';
};

const CartService = { getCart, addToCart, updateCartItem, removeCartItems };
export default CartService;
