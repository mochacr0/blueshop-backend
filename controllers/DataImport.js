import express from 'express';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import Banner from '../models/banner.model.js';
import users from '../data/users.js';
import products from '../data/Products.js';
import asyncHandler from 'express-async-handler';
import { banner } from '../data/banner.js';
import Cart from '../models/cart.model.js';
const ImportData = express.Router();

ImportData.post(
    '/user',
    asyncHandler(async (req, res) => {
        await User.remove({});
        await Cart.remove({});
        const importUser = await User.insertMany(users);
        const carts = [];
        importUser.map((user) => carts.push({ user: user._id }));
        const importCart = await Cart.insertMany(carts);
        res.send({ importUser, importCart });
    }),
);

ImportData.post(
    '/product',
    asyncHandler(async (req, res) => {
        await Product.remove({});
        const importProducts = await Product.insertMany(products);
        res.send({ importProducts });
    }),
);
ImportData.post(
    '/banner',
    asyncHandler(async (req, res) => {
        await Banner.remove({});
        const importBanner = await Banner.insertMany(banner);
        res.send({ importBanner });
    }),
);

export default ImportData;
