import * as fs from 'fs';
import DiscountCode from '../models/discountCode.model.js';
import Variant from '../models/variant.model.js';
import { validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import User from '../models/user.model.js';
import { InvalidDataError, ItemNotFoundError, UnprocessableContentError } from '../utils/errors.js';

//CONSTANT
const TYPE_DISCOUNT_MONEY = 1;
const TYPE_DISCOUNT_PERCENT = 2;

const getDiscountCode = async (keyword, currentUser) => {
    const keywordFilter = keyword
        ? {
              code: {
                  $regex: keyword,
                  $options: 'i',
              },
          }
        : {};
    const discountCode = await DiscountCode.find({ ...keywordFilter, disabled: false })
        .sort({ _id: -1 })
        .lean();
    let discountCodes = discountCode;
    if (currentUser && currentUser.role == 'user') {
        discountCodes = [];
        discountCode.map((discount) => {
            if (discount.endDate >= new Date()) {
                if (currentUser && currentUser.discountCode.includes(discount._id)) {
                    discount.isAdd = true;
                } else {
                    discount.isAdd = false;
                }
                discountCodes.push(discount);
            }
        });
    }

    return discountCodes;
};

const getDiscountCodeById = async (discountCodeId) => {
    const discountCode = await DiscountCode.findOne({ _id: discountCodeId }).lean();
    if (!discountCode) {
        throw new ItemNotFoundError('Mã giảm giá không tồn tại');
    }
    return discountCode;
};

const getDiscountCodeByCode = async (code) => {
    const discountCode = await DiscountCode.findOne({ code: code }).lean();
    if (!discountCode) {
        throw new ItemNotFoundError('Mã giảm giá không tồn tại');
    }
    return discountCode;
};

const createDiscountCode = async (request) => {
    const discountCodeExists = await DiscountCode.exists({ code: request.code });
    if (discountCodeExists) {
        throw new InvalidDataError('Mã giảm giá đã tồn tại');
    }

    const discountCode = new DiscountCode({
        name: request.name,
        code: request.code,
        discountType: request.discountType,
        discount: request.discount,
        maximumDiscount: request.maximumDiscount || 0,
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        isUsageLimit: request.isUsageLimit,
        usageLimit: request.usageLimit,
        userUseMaximum: request.userUseMaximum,
        applyFor: request.applyFor,
        applicableProducts: request.applicableProducts,
    });
    if (request.discountType == TYPE_DISCOUNT_MONEY) {
        discountCode.maximumDiscount = request.discount;
    }
    return await discountCode.save();
};

const updateDiscountCode = async (discountCodeId, request) => {
    const currentDiscountCode = await DiscountCode.findOne({ _id: discountCodeId });
    if (!currentDiscountCode) {
        throw new ItemNotFoundError('Mã giảm giá không tồn tại');
    }
    if (currentDiscountCode.code != request.code) {
        const discountCodeExists = await DiscountCode.exists({ code: request.code });
        if (discountCodeExists) {
            throw new InvalidDataError('Mã giảm giá đã tồn tại');
        }
        currentDiscountCode.code = request.code;
    }
    if (currentDiscountCode.updatedVersion != request.updatedVersion) {
        throw new InvalidDataError(
            'Mã giảm giá vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất',
        );
    }
    currentDiscountCode.updatedVersion = Number(currentDiscountCode.updatedVersion) + 1;

    currentDiscountCode.name = request.name || currentDiscountCode.name;
    currentDiscountCode.discountType = request.discountType || currentDiscountCode.discountType;

    currentDiscountCode.discount = request.discount || currentDiscountCode.discount;
    currentDiscountCode.maximumDiscount = request.maximumDiscount || currentDiscountCode.maximumDiscount;
    if (request.discountType == TYPE_DISCOUNT_MONEY) {
        currentDiscountCode.maximumDiscount = request.discount;
    }
    currentDiscountCode.startDate = request.startDate || currentDiscountCode.startDate;
    currentDiscountCode.endDate = request.endDate || currentDiscountCode.endDate;
    currentDiscountCode.isUsageLimit = request.isUsageLimit || currentDiscountCode.isUsageLimit;
    currentDiscountCode.usageLimit = request.usageLimit || currentDiscountCode.usageLimit;
    currentDiscountCode.userUseMaximum = request.userUseMaximum || currentDiscountCode.userUseMaximum;
    currentDiscountCode.applyFor = request.applyFor || currentDiscountCode.applyFor;
    currentDiscountCode.applicableProducts = request.applicableProducts || currentDiscountCode.applicableProducts;

    return await currentDiscountCode.save();
};

const discountCalculation = async (discountCode, orderItems, currentUser) => {
    const discountCodeExist = await DiscountCode.findOne({ code: String(discountCode), disabled: false });
    if (!discountCodeExist) {
        throw new UnprocessableContentError('Mã giảm giá không tồn tại');
    }
    if (discountCodeExist.startDate > new Date()) {
        throw new InvalidDataError(`Mã giảm giá có hiệu lực từ ngày ${Date(discountCode.startDate)}`);
    }
    if (discountCodeExist.endDate < new Date()) {
        throw new InvalidDataError('Mã giảm giá đã hết hạn');
    }
    if (discountCodeExist.isUsageLimit && discountCodeExist.usageLimit <= discountCodeExist.used) {
        throw new InvalidDataError('Mã giảm giá đã được sử dụng hết');
    }
    if (discountCodeExist.userUseMaximum > 1) {
        const countUser = discountCodeExist.usedBy.filter((item) => {
            return item.toString() == currentUser._id.toString();
        });
        if (countUser.length >= discountCodeExist.userUseMaximum) {
            throw new InvalidDataError('Bạn đã hết lượt sử dụng mã giảm giá này');
        }
    } else if (discountCodeExist.usedBy.includes(currentUser._id)) {
        throw new InvalidDataError('Bạn đã hết lượt sử dụng mã giảm giá này');
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
                throw new UnprocessableContentError(`Sản phẩm có ID "${orderItem.variant}" không tồn tại`);
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
            throw new InvalidDataError('Mã giảm giá không được áp dụng cho các sản phẩm này');
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
    return { totalDiscount: discount, discountCode: discountCodeExist.code };
};

const deleteDiscountCode = async (discountCodeId) => {
    const deletedDiscountCode = await DiscountCode.findByIdAndDelete(discountCodeId);
    if (!deletedDiscountCode) {
        throw new ItemNotFoundError('Mã giảm giá không tồn tại');
    }
    await User.updateMany({ $pull: { discountCode: discountCodeId } });
    return 'Xóa mã giảm giá thành công';
};

const VoucherService = {
    getDiscountCode,
    getDiscountCodeById,
    getDiscountCodeByCode,
    discountCalculation,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
};
export default VoucherService;
