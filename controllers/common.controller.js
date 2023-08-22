import mongoose from 'mongoose';
import * as fs from 'fs';
import Category from '../models/category.model.js';
import Product from '../models/product.model.js';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';
const summary = async (req, res) => {
    const countOrder = Order.countDocuments();
    const countProduct = Product.countDocuments();
    const countUser = User.countDocuments();
    const sumRevenue = Order.aggregate([
        {
            $match: {
                status: { $in: ['delivered', 'completed'] },
            },
        },
        {
            $group: {
                _id: null,
                totalAmount: {
                    $sum: '$totalProductPrice',
                },
            },
        },
    ]);
    const [totalOrder, totalProduct, totalUser, totalRevenue] = await Promise.all([
        countOrder,
        countProduct,
        countUser,
        sumRevenue,
    ]);
    let totalAmount = 0;
    if (totalRevenue) {
        totalAmount = totalRevenue[0].totalAmount;
    }
    res.json({ message: 'Success', data: { totalOrder, totalProduct, totalUser, totalRevenue: totalAmount } });
};
const commonController = {
    summary,
};

export default commonController;
