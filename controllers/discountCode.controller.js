import * as fs from 'fs';
import DiscountCode from '../models/discountCode.model.js';
import Variant from '../models/variant.model.js';
import { validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import User from '../models/user.model.js';
//CONSTANT
const TYPE_DISCOUNT_MONEY = 1;
const TYPE_DISCOUNT_PERCENT = 2;

const getDiscountCode = async (req, res) => {
    const keyword = req.query.keyword
        ? {
              code: {
                  $regex: req.query.keyword,
                  $options: 'i',
              },
          }
        : {};
    const discountCode = await DiscountCode.find({ ...keyword, disabled: false })
        .sort({ _id: -1 })
        .lean();
    let discountCodes = discountCode;
    if (req.user && req.user.role == 'user') {
        discountCodes = [];
        discountCode.map((discount) => {
            if (discount.endDate >= new Date()) {
                if (req.user && req.user.discountCode.includes(discount._id)) {
                    discount.isAdd = true;
                } else {
                    discount.isAdd = false;
                }
                discountCodes.push(discount);
            }
        });
    }

    return res.status(200).json({ message: 'Success', data: { discountCode: discountCodes } });
};

const getDiscountCodeById = async (req, res) => {
    const discountCodeId = req.params.id || '';

    const discountCode = await DiscountCode.findOne({ _id: discountCodeId }).lean();
    if (!discountCode) {
        res.status(404);
        throw new Error('Mã giảm giá không tồn tại');
    }
    return res.status(200).json({ message: 'Success', data: { discountCode: discountCode } });
};
const getDiscountCodeByCode = async (req, res) => {
    const code = req.params.code || '';
    const discountCode = await DiscountCode.findOne({ code: code }).lean();
    if (!discountCode) {
        res.status(404);
        throw new Error('Mã giảm giá không tồn tại');
    }
    return res.status(200).json({ message: 'Success', data: { discountCode: discountCode } });
};
const createDiscountCode = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const {
        name,
        code,
        discountType,
        discount,
        maximumDiscount,
        startDate,
        endDate,
        isUsageLimit,
        usageLimit,
        userUseMaximum,
        applyFor,
        applicableProducts,
    } = req.body;
    const discountCodeExists = await DiscountCode.exists({ code: code });
    if (discountCodeExists) {
        res.status(400);
        throw new Error('Mã giảm giá đã tồn tại');
    }

    const discountCode = new DiscountCode({
        name,
        code,
        discountType,
        discount,
        maximumDiscount: maximumDiscount || 0,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isUsageLimit,
        usageLimit,
        userUseMaximum,
        applyFor,
        applicableProducts,
    });
    if (discountType == TYPE_DISCOUNT_MONEY) {
        discountCode.maximumDiscount = discount;
    }
    const newDiscountCode = await discountCode.save();
    return res.status(201).json({ message: 'Mã giảm giá đã được thêm', data: { newDiscountCode } });
};

const updateDiscountCode = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const {
        name,
        code,
        discountType,
        discount,
        maximumDiscount,
        startDate,
        endDate,
        isUsageLimit,
        usageLimit,
        userUseMaximum,
        applyFor,
        applicableProducts,
        updatedVersion,
    } = req.body;
    // Check id
    const discountCodeId = req.params.id || null;

    const currentDiscountCode = await DiscountCode.findOne({ _id: discountCodeId });
    if (!currentDiscountCode) {
        return res.status(404).json({ message: 'Mã giảm giá không tồn tại' });
    }
    if (currentDiscountCode.code != code) {
        const discountCodeExists = await DiscountCode.exists({ code: code });
        if (discountCodeExists) {
            res.status(400);
            throw new Error('Mã giảm giá đã tồn tại');
        }
        currentDiscountCode.code = code;
    }
    if (currentDiscountCode.updatedVersion != updatedVersion) {
        res.status(400);
        throw new Error(
            'Mã giảm giá vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất',
        );
    }
    currentDiscountCode.updatedVersion = Number(currentDiscountCode.updatedVersion) + 1;

    currentDiscountCode.name = name || currentDiscountCode.name;
    currentDiscountCode.discountType = discountType || currentDiscountCode.discountType;

    currentDiscountCode.discount = discount || currentDiscountCode.discount;
    currentDiscountCode.maximumDiscount = maximumDiscount || currentDiscountCode.maximumDiscount;
    if (discountType == TYPE_DISCOUNT_MONEY) {
        currentDiscountCode.maximumDiscount = discount;
    }
    currentDiscountCode.startDate = startDate || currentDiscountCode.startDate;
    currentDiscountCode.endDate = endDate || currentDiscountCode.endDate;
    currentDiscountCode.isUsageLimit = isUsageLimit || currentDiscountCode.isUsageLimit;
    currentDiscountCode.usageLimit = usageLimit || currentDiscountCode.usageLimit;
    currentDiscountCode.userUseMaximum = userUseMaximum || currentDiscountCode.userUseMaximum;
    currentDiscountCode.applyFor = applyFor || currentDiscountCode.applyFor;
    currentDiscountCode.applicableProducts = applicableProducts || currentDiscountCode.applicableProducts;

    const updateDiscountCode = await currentDiscountCode.save();
    return res
        .status(200)
        .json({ success: true, message: 'Cập nhật mã giảm giá thành công', data: { updateDiscountCode } });
};

const discountCalculation = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { orderItems, discountCode } = req.body;
    const discountCodeExist = await DiscountCode.findOne({ code: String(discountCode), disabled: false });
    if (!discountCodeExist) {
        res.status(400);
        throw new Error('Mã giảm giá không tồn tại');
    }
    if (discountCodeExist.startDate > new Date()) {
        res.status(400);
        throw new Error(`Mã giảm giá có hiệu lực từ ngày ${Date(discountCode.startDate)}`);
    }
    if (discountCodeExist.endDate < new Date()) {
        res.status(400);
        throw new Error('Mã giảm giá đã hết hạn');
    }
    if (discountCodeExist.isUsageLimit && discountCodeExist.usageLimit <= discountCodeExist.used) {
        res.status(400);
        throw new Error('Mã giảm giá đã được sử dụng hết');
    }
    if (discountCodeExist.userUseMaximum > 1) {
        const countUser = discountCodeExist.usedBy.filter((item) => {
            return item.toString() == req.user._id.toString();
        });
        if (countUser.length >= discountCodeExist.userUseMaximum) {
            res.status(400);
            throw new Error('Bạn đã hết lượt sử dụng mã giảm giá này');
        }
    } else if (discountCodeExist.usedBy.includes(req.user._id)) {
        res.status(400);
        throw new Error('Bạn đã hết lượt sử dụng mã giảm giá này');
    }

    let totalProductPrice = 0;
    const orderedProductList = [];
    await Promise.all(
        orderItems.map(async (orderItem) => {
            const orderedVariant = await Variant.findOne({
                _id: orderItem.variant,
                disabled: false,
                deleted: false,
            }).populate('product');
            if (!orderedVariant || !orderedVariant.product?._id) {
                throw new Error(`Sản phẩm có ID "${orderItem.variant}" không tồn tại`);
            }
            totalProductPrice += orderedVariant.priceSale * orderItem.quantity;

            orderedProductList.push({
                _id: orderedVariant.product._id,
                priceSale: orderedVariant.priceSale,
                quantity: orderItem.quantity,
            });
        }),
    );
    // Tổng giá sản phẩm nằm trong danh sách được giảm giá của discount code
    let totalPriceProductDiscounted = 0;
    if (discountCodeExist.applyFor == 1) {
        totalPriceProductDiscounted = totalProductPrice;
    } else {
        let count = 0;
        orderedProductList.map((item) => {
            if (discountCodeExist.applicableProducts.includes(item._id)) {
                totalPriceProductDiscounted += item.priceSale * item.quantity;
                count++;
            }
        });
        if (count == 0) {
            res.status(400);
            throw new Error('Mã giảm giá không được áp dụng cho các sản phẩm này');
        }
    }
    let discount = 0;
    if (discountCodeExist.discountType == TYPE_DISCOUNT_MONEY) {
        if (totalPriceProductDiscounted >= discountCodeExist.discount) {
            discount = discountCodeExist.discount;
        } else {
            discount = totalPriceProductDiscounted;
        }
    } else if (discountCodeExist.discountType == TYPE_DISCOUNT_PERCENT) {
        discount = (totalPriceProductDiscounted * discountCodeExist.discount) / 100;
        if (discount > discountCodeExist.maximumDiscount) {
            discount = discountCodeExist.maximumDiscount;
        }
    }
    res.status(200).json({
        message: 'Success',
        data: {
            totalDiscount: discount,
            discountCode: discountCodeExist.code,
        },
    });
};

const deleteDiscountCode = async (req, res) => {
    const discountCodeId = req.params.id || null;
    if (!ObjectId.isValid(discountCodeId)) {
        res.status(400);
        throw new Error('ID mã giảm giá không hợp lệ');
    }
    await User.updateMany({ $pull: { discountCode: discountCodeId } });
    const deletedDiscountCode = await DiscountCode.findByIdAndDelete(discountCodeId);
    if (!deletedDiscountCode) {
        res.status(404);
        throw new Error('Mã giảm giá không tồn tại');
    }
    res.status(200).json({ message: 'Xóa mã giảm giá thành công' });
};

const bannerController = {
    getDiscountCode,
    getDiscountCodeById,
    getDiscountCodeByCode,
    discountCalculation,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
};
export default bannerController;
