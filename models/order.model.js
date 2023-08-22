import mongoose from 'mongoose';

const orderStatus = mongoose.Schema(
    {
        status: {
            type: String,
            required: true,
            enum: ['placed', 'confirm', 'delivering', 'delivered', 'cancelled', 'completed', 'paid'],
            default: 'placed',
        },
        description: {
            type: String,
            default: '',
        },
        updateBy: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    },
);
const orderItem = mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product',
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    attributes: [
        {
            name: { type: String, required: true },
            value: { type: String, required: true },
        },
    ],
    price: {
        type: Number,
        required: true,
    },
    isAbleToReview: {
        type: Boolean,
        required: true,
        default: false,
    },
});
const orderSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        username: {
            type: String,
            required: true,
        },
        orderItems: [orderItem],

        delivery: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Delivery',
        },
        paymentInformation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
        },
        shippingPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        totalDiscount: {
            type: Number,
            required: true,
            default: 0,
        },
        totalProductPrice: {
            type: Number,
            required: true,
            default: 0.0,
        },
        totalPayment: {
            type: Number,
            required: true,
            default: 0.0,
        },
        status: {
            type: String,
            required: true,
            enum: ['placed', 'confirm', 'delivering', 'delivered', 'cancelled', 'completed'],
            default: 'placed',
        },
        statusHistory: [orderStatus],
        disabled: {
            type: Boolean,
            required: true,
            default: false,
        },
        updatedVersion: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
