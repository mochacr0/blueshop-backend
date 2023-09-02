import mongoose from 'mongoose';
import {
    PAYMENT_WITH_CASH,
    PAYMENT_WITH_MOMO,
    PAYMENT_WITH_ATM,
    PAYMENT_WITH_CREDIT_CARD,
} from '../utils/paymentConstants.js';

const refundTranSchema = mongoose.Schema({
    orderId: {
        type: String,
    },
    amount: {
        type: Number,
    },
    resultCode: {
        type: Number,
    },
    transId: {
        type: String,
    },
    createdTime: {
        type: Number,
    },
});

const statusSchema = mongoose.Schema(
    {
        state: {
            type: String,
            enum: ['initialized', 'paid', 'refunded'],
            default: 'initialized',
        },
        description: {
            type: String,
        },
    },
    {
        timestamps: true,
    },
);

const paymentSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Order',
        },
        requestId: {
            type: String,
        },
        transId: {
            type: Number,
        },
        amount: {
            type: Number,
        },
        refundTrans: [refundTranSchema],
        paymentMethod: {
            type: String,
            required: true,
            enum: [PAYMENT_WITH_CASH, PAYMENT_WITH_MOMO, PAYMENT_WITH_ATM, PAYMENT_WITH_CREDIT_CARD],
            default: PAYMENT_WITH_CASH,
        },
        payUrl: {
            type: String,
            default: null,
        },
        paymentAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        paid: {
            type: Boolean,
            required: true,
            default: false,
        },
        paidAt: {
            type: Date,
            default: null,
        },
        status: statusSchema,
        updatedVersion: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
