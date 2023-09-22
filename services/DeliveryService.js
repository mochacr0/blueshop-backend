import { validationResult } from 'express-validator';
import Delivery from '../models/delivery.model.js';
import Order from '../models/order.model.js';
import {
    InternalServerError,
    InvalidDataError,
    UnavailableServiceError,
    UnprocessableContentError,
} from '../utils/errors.js';
import { GHN_Request } from '../utils/request.js';
import { deliveryQueryParams, validateConstants } from '../utils/searchConstants.js';

const getDeliveries = async (pageParameter) => {
    const sortBy = validateConstants(deliveryQueryParams, 'sort', pageParameter.sortBy);
    const deliveryStatusFilter = validateConstants(deliveryQueryParams, 'status', pageParameter.status);
    const deliveryFilter = {
        ...deliveryStatusFilter,
    };
    const count = await Delivery.countDocuments(deliveryFilter);
    const deliveries = await Delivery.find({ ...deliveryFilter })
        .populate(['delivery', 'paymentInformation'])
        .limit(pageParameter.limit)
        .skip(pageParameter.limit * pageParameter.page)
        .sort({ ...sortBy })
        .lean();
    return { deliveries, page, pages: Math.ceil(count / limit), total: count };
};

const getDistrictsByProvinceId = async (provinceId) => {
    let disctricts = [];
    const config = {
        data: JSON.stringify({
            province_id: provinceId,
        }),
    };
    await GHN_Request.get('/master-data/district', config)
        .then((response) => {
            disctricts = response.data.data;
        })
        .catch((error) => {
            throw new InternalServerError(error.response.data.message || error.message || '');
        });
    return disctricts;
};

const getWardsByDistrictId = async (districtId) => {
    let wards = [];
    const config = {
        data: JSON.stringify({
            district_id: districtId,
        }),
    };
    await GHN_Request.get('/master-data/ward', config)
        .then((response) => {
            wards = response.data.data;
        })
        .catch((error) => {
            throw new InternalServerError(error.response.data.message || error.message || '');
        });
    return wards;
};

const getProvince = async () => {
    let provinces = [];
    await GHN_Request.get('/master-data/province')
        .then((response) => {
            provinces = response.data.data;
        })
        .catch((error) => {
            throw new InternalServerError(error.response.data.message || error.message || '');
        });
    return provinces;
};

const calculateFee = async (request) => {
    const deliveryServices = [];
    const services = await GHN_Request.get('/v2/shipping-order/available-services', {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            from_district: 1454,
            to_district: request.to_district_id,
        }),
    })
        .then((response) => {
            return response.data.data;
        })
        .catch((error) => {
            throw new InternalServerError(error.response.data.message || error.message || '');
        });

    const getService = services.map(async (serviceItem) => {
        const result = { service_id: serviceItem.service_id, short_name: serviceItem.short_name };
        const calculateFeeRequest = GHN_Request.get('v2/shipping-order/fee', {
            data: JSON.stringify({
                shop_id: Number(process.env.GHN_SHOP_ID),
                service_id: serviceItem.service_id,
                to_district_id: request.to_district_id,
                to_ward_code: request.to_ward_code,
                height: request.height,
                length: request.length,
                weight: request.weight,
                width: request.width,
                insurance_value: request.insurance_value,
                coupon: request.coupon,
            }),
        })
            .then((response) => {
                return response.data.data;
            })
            .catch((error) => {
                console.error(error.response.data.message || error.message || '');
            });

        const leadTimeRequest = GHN_Request.get('v2/shipping-order/leadtime', {
            data: JSON.stringify({
                shop_id: Number(process.env.GHN_SHOP_ID),
                service_id: serviceItem.service_id,
                to_district_id: request.to_district_id,
                to_ward_code: request.to_ward_code,
            }),
        })
            .then((response) => {
                return response.data.data;
            })
            .catch((error) => {
                throw new InternalServerError(error.response.data.message || error.message || '');
            });
        const [feeResult, leadTimeResult] = await Promise.all([calculateFeeRequest, leadTimeRequest]);
        if (feeResult != null && leadTimeResult != null) {
            result.fee = feeResult.total;
            result.leadTime = leadTimeResult.leadtime * 1000;
            deliveryServices.push(result);
        }
    });
    await Promise.all(getService);
    if (deliveryServices.length == 0) {
        throw new UnavailableServiceError('There are no available services');
    }
    return deliveryServices;
};

const estimatedDeliveryTime = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
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
            res.json({ message: 'Success', data: { leadTime: response.data.data } });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new InternalServerError(error.response.data.message || error.message || '');
        });
};
const services = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.json({ message: message });
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
            res.json({ message: 'Success', data: { services: response.data.data } });
        })
        .catch((error) => {
            res.status(error.response.data.code || 500);
            throw new InternalServerError(error.response.data.message || error.message || '');
        });
};
const preview = async (orderId, requiredNote) => {
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate('delivery');
    if (!order) {
        throw new UnprocessableContentError('Đơn hàng không tồn tại');
    }
    const config = {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            payment_type_id: 1,
            note: order.delivery.note || '',
            required_note: requiredNote || order.delivery.required_note,
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
    let deliveryInfo;
    try {
        const httpResponse = await GHN_Request.get('/v2/shipping-order/preview', config);
        deliveryInfo = httpResponse?.data?.data;
    } catch (error) {
        throw new InternalServerError(error.response.data.message || error.message || null);
    }
    return deliveryInfo;
};

const printOrder = async (orderId, pageSize) => {
    if (!orderId || orderId.trim() == '') {
        throw new UnprocessableContentError('Đơn hàng không tồn tại');
    }
    if (pageSize != '52x70' && pageSize != 'A5' && pageSize != '80x80') {
        throw new InvalidDataError('Kích thước giấy in không hợp lệ');
    }
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate('delivery').lean();
    if (!order) {
        throw new UnprocessableContentError('Đơn hàng không tồn tại');
    }
    if (!order.delivery.deliveryCode || order.delivery?.deliveryCode.trim() == '') {
        throw new InvalidDataError('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
    }
    const config = {
        data: JSON.stringify({
            order_codes: [order.delivery.deliveryCode],
        }),
    };
    try {
        const httpResponse = await GHN_Request.get('v2/a5/gen-token', config);
        const deliveryLabelUrl = `${process.env.GHN_REQUEST_URL}/a5/public-api/print${pageSize}?token=${httpResponse.data.data.token}`;
        return deliveryLabelUrl;
    } catch (error) {
        throw new InternalServerError(
            error.response.data.message.code_message_value || error.response.data.message || error.message || '',
        );
    }
};
const updateCOD = async (orderId, codAmount) => {
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate(['delivery', 'paymentInformation']);
    if (!order) {
        throw new UnprocessableContentError('Đơn hàng không tồn tại');
    }
    switch (order.status) {
        case 'placed':
            throw new InvalidDataError('Đơn hàng đã được xác nhận');
        case 'confirm':
            throw new InvalidDataError('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
        case 'delivered':
            throw new InvalidDataError('Đơn hàng đã được giao thành công');
        case 'completed':
            throw new InvalidDataError('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            throw new InvalidDataError('Đơn hàng đã bị hủy');
        default:
            break;
    }

    if (!order.delivery.deliveryCode || order.delivery?.deliveryCode.trim() == '') {
        throw new InvalidDataError('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
    }
    const config = {
        data: JSON.stringify({
            order_code: order.delivery.deliveryCode,
            cod_amount: codAmount,
        }),
    };
    try {
        await GHN_Request.get('/v2/shipping-order/updateCOD', config);
    } catch (errro) {
        throw new InternalServerError(
            error.response.data.message.code_message_value || error.response.data.message || error.message || '',
        );
    }
    order.delivery.cod_amount = codAmount;
    return await order.delivery.save();
};

const updateStatus = async (req, res) => {
    const orderId = req.params.id || '';
    const deliveryCode = Number(req.body.OrderCode);
    if (!deliveryCode || deliveryCode.trim() == '') {
        throw new UnprocessableContentError('Đơn giao hàng không tồn tại');
    }
    const delivery = await Delivery.findOne({ deliveryCode: deliveryCode }).populate(['order']);
    if (!delivery) {
        throw new UnprocessableContentError('Đơn giao hàng không tồn tại');
    }
    switch (delivery.status) {
        case 'placed':
            throw new InvalidDataError('Đơn hàng đã được xác nhận');
        case 'confirm':
            throw new InvalidDataError('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
        case 'delivered':
            throw new InvalidDataError('Đơn hàng đã được giao thành công');
        case 'completed':
            throw new InvalidDataError('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            throw new InvalidDataError('Đơn hàng đã bị hủy');
        default:
            break;
    }

    if (!delivery.delivery.deliveryCode || delivery.delivery?.deliveryCode.trim() == '') {
        throw new InvalidDataError('Đơn hàng chưa tạo đơn giao của đơn vị vận chuyển');
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
                res.json({
                    message: 'Success',
                    data: null,
                });
            })
            .catch((error) => {
                res.status(error.response.data.code || 500);
                throw new InternalServerError(
                    error.response.data.message.code_message_value ||
                        error.response.data.message ||
                        error.message ||
                        '',
                );
            });
    }
};

const DeliveryService = {
    getDeliveries,
    getDistrictsByProvinceId,
    getWardsByDistrictId,
    getProvince,
    calculateFee,
    estimatedDeliveryTime,
    services,
    preview,
    printOrder,
    updateCOD,
    updateStatus,
};
export default DeliveryService;
