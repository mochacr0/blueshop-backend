import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            // required: true,
        },
        // index: {
        //     type: Number,
        //     required: true,
        //     default: 0,
        // },
        image: {
            type: String,
            // require: true,
        },
        linkTo: {
            type: String,
        },
        type: {
            type: String,
            required: true,
            enum: ['slider', 'banner'],
            default: 'slider',
        },
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
const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
