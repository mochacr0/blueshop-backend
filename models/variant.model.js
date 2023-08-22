import mongoose from 'mongoose';

const variantSchema = mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Product',
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
        price: {
            type: Number,
            required: true,
        },
        priceSale: {
            type: Number,
            required: true,
        },
        image: {
            type: String,
        },
        quantity: {
            type: Number,
            required: true,
        },
        updatedVersion: {
            type: Number,
            default: 0,
        },
        deleted: {
            type: Boolean,
            default: false,
            required: true,
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

const Variant = mongoose.model('Variant', variantSchema);
export default Variant;
