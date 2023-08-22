import * as fs from 'fs';
import { GHN_Request } from '../utils/request.js';
import { validationResult } from 'express-validator';
import Order from '../models/order.model.js';
import schedule, { scheduleJob } from 'node-schedule';
import Delivery from '../models/delivery.model.js';
import { deliveryQueryParams, validateConstants } from '../utils/searchConstants.js';

const getDeliveries = async (req, res) => {
    const limit = Number(req.query.limit) || 20; //EDIT HERE
    const page = Number(req.query.page) || 0;
    const sortBy = validateConstants(deliveryQueryParams, 'sort', req.query.sortBy);
    const deliveryStatusFilter = validateConstants(deliveryQueryParams, 'status', req.query.status);
    const deliveryFilter = {
        ...deliveryStatusFilter,
    };
    const count = await Delivery.countDocuments(deliveryFilter);
    const deliveries = await Delivery.find({ ...deliveryFilter })
        .populate(['delivery', 'paymentInformation'])
        .limit(limit)
        .skip(limit * page)
        .sort({ ...sortBy })
        .lean();
    res.status(200).json({ data: { deliveries, page, pages: Math.ceil(count / limit), total: count } });
};

const getDistrict = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const province_id = Number(req.params.id) || null;
    const config = {
        data: JSON.stringify({
            province_id,
        }),
    };
    await GHN_Request.get('/master-data/district', config)
        .then((response) => {
            res.status(200).json({ message: 'Success', data: { districts: response.data.data } });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new Error(error.response.data.message || error.message || '');
        });
};
const getWard = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const district_id = Number(req.params.id) || null;

    const config = {
        data: JSON.stringify({
            district_id,
        }),
    };
    await GHN_Request.get('/master-data/ward', config)
        .then((response) => {
            res.status(200).json({ message: 'Success', data: { wards: response.data.data } });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new Error(error.response.data.message || error.message || '');
        });
};
const getProvince = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }

    await GHN_Request.get('/master-data/province')
        .then((response) => {
            res.status(200).json({ message: 'Success', data: { provinces: response.data.data } });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new Error(error.response.data.message || error.message || '');
        });
};
const calculateFee = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const {
        to_district_id,
        to_ward_code,
        height = null,
        length = null,
        weight,
        width = null,
        insurance_value = null,
        coupon = null,
    } = req.body;

    const deliveryServices = [];
    const services = await GHN_Request.get('/v2/shipping-order/available-services', {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            from_district: 1454,
            to_district: to_district_id,
        }),
    })
        .then((response) => {
            return response.data.data;
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new Error(error.response.data.message || error.message || '');
        });

    const getService = services.map(async (serviceItem) => {
        const result = { service_id: serviceItem.service_id, short_name: serviceItem.short_name };
        const calculateFeeRequest = GHN_Request.get('v2/shipping-order/fee', {
            data: JSON.stringify({
                shop_id: Number(process.env.GHN_SHOP_ID),
                service_id: serviceItem.service_id,
                to_district_id,
                to_ward_code,
                height,
                length,
                weight,
                width,
                insurance_value,
                coupon,
            }),
        })
            .then((response) => {
                return response.data.data;
            })
            .catch((error) => {
                res.status(error.response.data.code || 500);
                throw new Error(error.response.data.message || error.message || '');
            });

        const leadTimeRequest = GHN_Request.get('v2/shipping-order/leadtime', {
            data: JSON.stringify({
                shop_id: Number(process.env.GHN_SHOP_ID),
                service_id: serviceItem.service_id,
                to_district_id,
                to_ward_code,
            }),
        })
            .then((response) => {
                return response.data.data;
            })
            .catch((error) => {
                res.status(error.response.data.code || 500);
                throw new Error(error.response.data.message || error.message || '');
            });
        const [feeResult, leadTimeResult] = await Promise.all([calculateFeeRequest, leadTimeRequest]);
        result.fee = feeResult.total;
        result.leadTime = leadTimeResult.leadtime * 1000;
        deliveryServices.push(result);
    });
    await Promise.all(getService);

    res.status(200).json({ message: 'Success', data: { deliveryServices } });
};

const estimatedDeliveryTime = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { from_district_id, from_ward_code, service_id, to_district_id, to_ward_code } = req.body;

    const config = {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            from_district_id,
            from_ward_code,
            service_id,
            to_district_id,
            to_ward_code,
        }),
    };
    await GHN_Request.get('v2/shipping-order/leadtime', config)
        .then((response) => {
            res.status(200).json({ message: 'Success', data: { leadTime: response.data.data } });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new Error(error.response.data.message || error.message || '');
        });
};
const services = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { to_district } = req.body;
    const config = {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            from_district: 1454,
            to_district,
        }),
    };
    await GHN_Request.get('/v2/shipping-order/available-services', config)
        .then((response) => {
            res.status(200).json({ message: 'Success', data: { services: response.data.data } });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new Error(error.response.data.message || error.message || '');
        });
};
const preview = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const orderId = req.params.id;
    const required_note = req.body.requiredNote || null;
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate('delivery');
    if (!order) {
        res.status(400);
        throw new Error('Đơn hàng không tồn tại');
    }
    const config = {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            payment_type_id: 1,
            note: order.delivery.note || '',
            required_note: required_note || order.delivery.required_note,
            // client_order_code: order.user,
            to_name: order.delivery.to_name,
            to_phone: order.delivery.to_phone,
            to_address: order.delivery.to_address,
            to_ward_name: order.delivery.to_ward_name,
            to_district_name: order.delivery.to_district_name,
            to_province_name: order.delivery.to_province_name,
            cod_amount: order.totalPayment,
            // content,
            weight: order.delivery.weight,
            length: order.delivery.length,
            width: order.delivery.width,
            height: order.delivery.height,
            insurance_value: order.delivery.insurance_value,
            service_id: order.delivery.service_id,
            // pickup_time,
            items: order.delivery.items,
        }),
    };
    const deliveryInfo = await GHN_Request.get('/v2/shipping-order/preview', config)
        .then((response) => {
            return response.data.data;
        })
        .catch((error) => {
            res.status(error.response.data.code || 502);
            throw new Error(error.response.data.message || error.message || null);
        });

    res.status(200).json({ data: { deliveryInfo } });
};
const printOrder = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const orderId = req.params.id || '';
    const pageSize = req.params.pageSize || 'A5';
    if (!orderId || orderId.trim() == '') {
        res.status(400);
        throw new Error('Đơn hàng không tồn tại');
    }
    if (pageSize != '52x70' && pageSize != 'A5' && pageSize != '80x80') {
        res.status(400);
        throw new Error('Kích thước giấy in không hợp lệ');
    }
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate('delivery').lean();
    if (!order) {
        res.status(400);
        throw new Error('Đơn hàng không tồn tại');
    }
    if (!order.delivery.deliveryCode || order.delivery?.deliveryCode.trim() == '') {
        res.status(400);
        throw new Error('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
    }
    const config = {
        data: JSON.stringify({
            order_codes: [order.delivery.deliveryCode],
        }),
    };
    await GHN_Request.get('v2/a5/gen-token', config)
        .then((response) => {
            res.status(200).json({
                message: 'Success',
                data: {
                    url: `${process.env.GHN_REQUEST_URL}/a5/public-api/print${pageSize}?token=${response.data.data.token}`,
                },
            });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new Error(
                error.response.data.message.code_message_value || error.response.data.message || error.message || '',
            );
        });
};
const updateCOD = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const orderId = req.params.id || '';
    const cod_amount = Number(req.body.cod_amount);
    if (!orderId || orderId.trim() == '') {
        res.status(400);
        throw new Error('Đơn hàng không tồn tại');
    }
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate(['delivery', 'paymentInformation']);
    if (!order) {
        res.status(400);
        throw new Error('Đơn hàng không tồn tại');
    }
    switch (order.status) {
        case 'placed':
            res.status(400);
            throw new Error('Đơn hàng đã được xác nhận');
        case 'confirm':
            res.status(400);
            throw new Error('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
        case 'delivered':
            res.status(400);
            throw new Error('Đơn hàng đã được giao thành công');
        case 'completed':
            res.status(400);
            throw new Error('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            res.status(400);
            throw new Error('Đơn hàng đã bị hủy');
        default:
            break;
    }

    if (!order.delivery.deliveryCode || order.delivery?.deliveryCode.trim() == '') {
        res.status(400);
        throw new Error('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
    } else {
        const config = {
            data: JSON.stringify({
                order_code: order.delivery.deliveryCode,
                cod_amount: cod_amount,
            }),
        };
        await GHN_Request.get('/v2/shipping-order/updateCOD', config)
            .then(async (response) => {
                order.delivery.cod_amount = cod_amount;
                await order.delivery.save();
                res.status(200).json({
                    message: 'Success',
                    data: null,
                });
            })
            .catch((error) => {
                res.status(error.response.data.code || 500);
                throw new Error(
                    error.response.data.message.code_message_value ||
                        error.response.data.message ||
                        error.message ||
                        '',
                );
            });
    }
};
const updateStatus = async (req, res) => {
    const orderId = req.params.id || '';
    const deliveryCode = Number(req.body.OrderCode);
    if (!deliveryCode || deliveryCode.trim() == '') {
        res.status(400);
        throw new Error('Đơn giao hàng không tồn tại');
    }
    const delivery = await Delivery.findOne({ deliveryCode: deliveryCode }).populate(['order']);
    if (!delivery) {
        res.status(400);
        throw new Error('Đơn giao hàng không tồn tại');
    }
    switch (delivery.status) {
        case 'placed':
            res.status(400);
            throw new Error('Đơn hàng đã được xác nhận');
        case 'confirm':
            res.status(400);
            throw new Error('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
        case 'delivered':
            res.status(400);
            throw new Error('Đơn hàng đã được giao thành công');
        case 'completed':
            res.status(400);
            throw new Error('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            res.status(400);
            throw new Error('Đơn hàng đã bị hủy');
        default:
            break;
    }

    if (!delivery.delivery.deliveryCode || delivery.delivery?.deliveryCode.trim() == '') {
        res.status(400);
        throw new Error('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
    } else {
        const config = {
            data: JSON.stringify({
                order_code: delivery.delivery.deliveryCode,
                cod_amount: cod_amount,
            }),
        };
        await GHN_Request.get('/v2/shipping-order/updateCOD', config)
            .then(async (response) => {
                delivery.delivery.cod_amount = cod_amount;
                await delivery.delivery.save();
                res.status(200).json({
                    message: 'Success',
                    data: null,
                });
            })
            .catch((error) => {
                res.status(error.response.data.code || 500);
                throw new Error(
                    error.response.data.message.code_message_value ||
                        error.response.data.message ||
                        error.message ||
                        '',
                );
            });
    }
};
const deliveryController = {
    getDeliveries,
    getDistrict,
    getWard,
    getProvince,
    calculateFee,
    estimatedDeliveryTime,
    services,
    preview,
    printOrder,
    updateCOD,
    updateStatus,
};
export default deliveryController;
