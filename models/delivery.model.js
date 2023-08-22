import mongoose from 'mongoose';

const deliverySchema = mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Order',
        },
        deliveryCode: {
            type: String,
            default: null,
        },
        client: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        to_name: {
            type: String,
        },
        to_phone: {
            type: String,
        },
        to_address: {
            type: String,
        },
        to_province_name: {
            type: String,
        },
        to_district_name: {
            type: String,
        },
        to_ward_name: {
            type: String,
        },
        weight: {
            type: Number,
        },
        length: {
            type: Number,
        },
        width: {
            type: Number,
        },
        height: {
            type: Number,
        },
        service_id: {
            type: Number,
            default: 53320,
        },
        note: {
            type: String,
        },
        required_note: {
            type: String,
            required: true,
            enum: [
                'CHOTHUHANG',
                'CHOXEMHANGKHONGTHU',
                'KHONGCHOXEMHANG',
                'CHOTHUHANG',
                'CHOXEMHANGKHONGTHU',
                'KHONGCHOXEMHANG',
            ],
            default: 'KHONGCHOXEMHANG',
        },
        content: {
            type: String,
        },
        items: [
            {
                name: { type: String },
                code: { type: String },
                quantity: { type: Number },
                category: { type: String },
            },
        ],
        deliveryFee: {
            type: Number,
            default: 0,
        },
        cod_amount: {
            type: Number,
            default: 0,
        },
        insurance_value: {
            type: Number,
        },
        start_date: {
            type: Date,
        },
        leadTime: {
            type: Date,
        },
        finish_date: {
            type: Date,
        },
        statusHistory: [
            {
                status: {
                    type: String,
                },
                updated_date: { type: Date },
            },
        ],
        status: {
            type: String,
            enum: [
                'ready_to_pick',
                'picking',
                'cancel',
                'money_collect_picking',
                'picked',
                'storing',
                'transporting',
                'sorting',
                'delivering',
                'money_collect_delivering',
                'delivered',
                'delivery_fail',
                'waiting_to_return',
                'return',
                'return_transporting',
                'return_sorting',
                'returning',
                'return_fail',
                'returned',
                'exception',
                'damage',
                'lost',
            ],
            default: 'ready_to_pick',
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

const Delivery = mongoose.model('Delivery', deliverySchema);

export default Delivery;
