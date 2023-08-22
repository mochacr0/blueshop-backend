import mongoose from 'mongoose';

const discountCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
        },
        discountType: {
            type: String,
            required: true,
            enum: [1, 2],
            default: 1,
        },
        discount: {
            type: Number,
            required: true,
            default: 0,
        },
        maximumDiscount: {
            type: Number,
            required: true,
            default: 0,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isUsageLimit: {
            type: Boolean,
            required: true,
            default: false,
        },
        usageLimit: {
            type: Number,
            default: 0,
        },
        userUseMaximum: {
            type: Number,
            default: 1,
        },
        used: {
            type: Number,
            required: true,
            default: 0,
        },
        applyFor: {
            type: Number,
            required: true,
            enum: [1, 2],
            default: 1,
        },

        usedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        applicableProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],
        updatedVersion: {
            type: Number,
            default: 0,
        },
        disabled: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);

export default DiscountCode;
