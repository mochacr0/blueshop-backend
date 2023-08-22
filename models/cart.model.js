import mongoose from 'mongoose';
const cartItem = new mongoose.Schema(
    {
        variant: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Variant',
        },
        attributes: [
            {
                name: { type: String, required: true },
                value: { type: String, required: true },
            },
        ],
        // size: {
        //     type: String,
        //     required: true,
        // },
        // color: {
        //     type: String,
        //     required: true,
        // },
        quantity: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);
const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        cartItems: [cartItem],
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

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
