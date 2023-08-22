import mongoose from 'mongoose';

const reviewSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        rating: { type: Number, required: true },
        content: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    },
    {
        timestamps: true,
    },
);

const productSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        images: [
            {
                type: String,
            },
        ],
        description: {
            type: String,
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'Category',
        },
        brand: {
            type: String,
            required: false,
        },
        keywords: [
            {
                type: String,
            },
        ],
        price: {
            type: Number,
            required: true,
            default: 0,
        },
        priceSale: {
            type: Number,
            required: true,
            default: 0,
        },
        quantity: {
            type: Number,
            required: true,
            default: 0,
        },
        weight: {
            type: Number,
            required: true,
            default: 0,
        },
        length: {
            type: Number,
            default: 0,
        },
        width: {
            type: Number,
            default: 0,
        },
        height: {
            type: Number,
            default: 0,
        },
        variants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Variant' }],
        reviews: [reviewSchema],
        rating: {
            type: Number,
            required: true,
            default: 0,
        },
        numReviews: {
            type: Number,
            required: true,
            default: 0,
        },
        totalSales: {
            type: Number,
            default: 0,
        },
        updatedVersion: {
            type: Number,
            default: 0,
        },
        deleted: {
            type: Boolean,
            required: true,
            default: false,
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
productSchema.index({ name: 'text' });
const Product = mongoose.model('Product', productSchema);

export default Product;
