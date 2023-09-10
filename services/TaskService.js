import schedule, { scheduleJob } from 'node-schedule';
import Token from '../models/token.model.js';
import Product from '../models/product.model.js';
import Variant from '../models/variant.model.js';
import DiscountCode from '../models/discountCode.model.js';
import User from '../models/user.model.js';
import Cart from '../models/cart.model.js';
import Order from '../models/order.model.js';
import OrderService from './OrderService.js';
import mongoose from 'mongoose';
import { PAYMENT_WITH_CASH, PAYMENT_WITH_MOMO } from '../utils/paymentConstants.js';

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

const scheduleCancelUnpaidOrder = (order) => {
    schedule.scheduleJob(order.expiredAt, async () => {
        const session = await mongoose.startSession();
        const transactionOptions = {
            readPreference: 'primary',
            readConcern: { level: 'local' },
            writeConcern: { w: 'majority' },
        };
        try {
            const unpaidOrder = await Order.findOne({
                _id: order._id,
                status: 'placed',
                expiredAt: { $lte: new Date() },
            }).populate('paymentInformation');
            if (
                unpaidOrder == null ||
                unpaidOrder.paymentInformation.paid ||
                unpaidOrder.paymentInformation.paymentMethod != PAYMENT_WITH_MOMO
            ) {
                return;
            }
            await OrderService.rollbackProductQuantites(unpaidOrder, session);
            await OrderService.refundOrderInCancel(unpaidOrder, session);
            unpaidOrder.status = 'cancelled';
            unpaidOrder.statusHistory.push({ status: 'cancelled', description: 'Hết hạn thanh toán' });
            const cancelledOrder = await unpaidOrder.save();
            if (!cancelledOrder) {
                await session.abortTransaction();
                console.error(`Hủy đơn hàng ${unpaidOrder._id} thất bại`);
            } else {
                console.log(`Đơn hàng ${unpaidOrder._id} đã bị hủy vì hết hạn thanh toán`);
            }
        } catch (error) {
            throw new Error(error);
        } finally {
            await session.endSession();
        }
    });
};

const scheduleCancelUncofirmedOrder = (order) => {
    schedule.scheduleJob(order.expiredAt, async () => {
        const session = await mongoose.startSession();
        const transactionOptions = {
            readPreference: 'primary',
            readConcern: { level: 'local' },
            writeConcern: { w: 'majority' },
        };
        try {
            const unpaidOrder = await Order.findOne({
                _id: order._id,
                status: 'placed',
                expiredAt: { $lte: new Date() },
            }).populate('paymentInformation');
            if (unpaidOrder == null || unpaidOrder.paymentInformation.paymentMethod != PAYMENT_WITH_CASH) {
                return;
            }
            await OrderService.rollbackProductQuantites(unpaidOrder, session);
            await OrderService.refundOrderInCancel(unpaidOrder, session);
            unpaidOrder.status = 'cancelled';
            unpaidOrder.statusHistory.push({ status: 'cancelled', description: 'Shop không phản hồi' });
            const cancelledOrder = await unpaidOrder.save();
            if (!cancelledOrder) {
                await session.abortTransaction();
                console.error(`Hủy đơn hàng ${unpaidOrder._id} thất bại`);
            } else {
                console.log(`Đơn hàng ${unpaidOrder._id} đã bị hủy vì Shop không phản hồi`);
            }
        } catch (error) {
            throw new Error(error);
        } finally {
            await session.endSession();
        }
    });
};

const TaskService = {
    scheduleCancelUnpaidOrder,
    scheduleCancelUncofirmedOrder,
};

export default TaskService;
