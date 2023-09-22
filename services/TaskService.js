import schedule from 'node-schedule';
import Cart from '../models/cart.model.js';
import DiscountCode from '../models/discountCode.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Token from '../models/token.model.js';
import User from '../models/user.model.js';
import Variant from '../models/variant.model.js';
import OrderService from './OrderService.js';
import {
    PAYMENT_WITH_CASH,
    PAYMENT_WITH_MOMO,
    PAYMENT_WITH_ATM,
    PAYMENT_WITH_CREDIT_CARD,
} from '../utils/paymentConstants.js';

export const deleteExpiredTokens = schedule.scheduleJob(`*/60 * * * *`, async () => {
    console.log('delete expired tokens .....................................................');
    await Token.deleteMany({
        expiresIn: { $lte: new Date() },
    });
});

const deleteProduct = schedule.scheduleJob(`*/1440 * * * *`, async () => {
    console.log('delete product .....................................................');
    let expired = new Date();
    expired.setDate(expired.getDate() - 30);
    const findProducts = await Product.find({
        deleted: true,
        updatedAt: { $lte: expired },
    });
    if (findProducts.length > 0) {
        findProducts.map(async (product) => {
            await Variant.deleteMany({
                product: product._id,
            });
            await product.remove();
        });
    }
});

const autoConfirmOrder = schedule.scheduleJob(`*/1440 * * * *`, async () => {
    console.log('update order .....................................................');
    let expired = new Date();
    expired.setDate(expired.getDate() - 7);
    const findOrder = await Order.find({
        status: 'delivered',
        statusHistory: { $elemMatch: { status: 'delivered', createdAt: { $lte: expired } } },
    });
    await Order.updateMany(
        {
            status: 'delivered',
            statusHistory: { $elemMatch: { status: 'delivered', createdAt: { $lte: expired } } },
        },
        { $set: { status: 'completed' }, $push: { statusHistory: { status: 'completed' } } },
    );
});

const removeExpiredDiscountCodeFromUser = schedule.scheduleJob(`*/60 * * * *`, async () => {
    console.log('delete discountCode .....................................................');
    const findDiscountCodes = await DiscountCode.distinct('_id', {
        endDate: { $lte: new Date() },
    });
    await User.updateMany(
        { discountCode: { $in: findDiscountCodes } },
        { $pull: { discountCode: { $in: findDiscountCodes } } },
    );
});

const deleteProductInCart = schedule.scheduleJob(`*1440 * * * *`, async () => {
    console.log('delete product in cart user.....................................................');
    let expired = new Date();
    expired.setDate(expired.getDate() + 7);
    const findProducts = await Product.find({
        deleted: true,
        updatedAt: { $lte: expired },
    });
    if (findProducts.length > 0) {
        findProducts.map(async (product) => {
            await Cart.updateMany(
                { cartItems: { $elemMatch: { variant: { $in: product.variants } } } },
                { $pull: { cartItems: { variant: { $in: product.variants } } } },
            );
        });
    }
});

const scheduleCancelExpiredOrder = (order) => {
    schedule.scheduleJob(order.expiredAt, async () => {
        await OrderService.cancelExpiredOrder(order);
    });
};

// const scheduleCancelExpiredOrders =
//     //execute jobs every 1 minutes
//     schedule.scheduleJob('*/1 * * * *', async () => {
//         console.log('Runing scheduleCancelExpiredOrders');
//         const expiredOrders = await Order.find({ status: 'placed', expiredAt: { $lte: new Date() } });
//         const cancelTasks = expiredOrders.map(async (order) => {
//             let attempt = 1;
//             while (attempt <= 3) {
//                 try {
//                     await OrderService.cancelExpiredOrder(order);
//                     break;
//                 } catch (error) {
//                     console.error(`Hủy đơn hàng ${order._id} thất bại. Lỗi: ${error.message}`);
//                     if (
//                         error.hasOwnProperty('errorLabels') &&
//                         error.errorLabels.includes('TransientTransactionError')
//                     ) {
//                         attempt++;
//                         await new Promise((resolve) => setTimeout(resolve, 1000));
//                         continue;
//                     }
//                 }
//             }
//         });
//         await Promise.all(cancelTasks);
//     });

const TaskService = {
    scheduleCancelExpiredOrder,
};

export default TaskService;
