import crypto from 'crypto';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Cart from '../models/cart.model.js';
import Delivery from '../models/delivery.model.js';
import DiscountCode from '../models/discountCode.model.js';
import Order from '../models/order.model.js';
import Payment from '../models/payment.model.js';
import Product from '../models/product.model.js';
import User from '../models/user.model.js';
import Variant from '../models/variant.model.js';
import TaskService from '../services/TaskService.js';
import {
    InternalServerError,
    InvalidDataError,
    ItemNotFoundError,
    UnauthenticatedError,
    UnprocessableContentError,
} from '../utils/errors.js';
import statusResponseFalse from '../utils/messageMoMo.js';
import { MAX_MINUTES_WAITING_TO_PAY, MAX_DAYS_WAITING_FOR_SHOP_CONFIRMATION } from '../utils/orderConstants.js';
import { createCheckStatusBody, createPaymentBody, createRefundTransBody } from '../utils/payment-with-momo.js';
import {
    PAYMENT_WITH_ATM,
    PAYMENT_WITH_CASH,
    PAYMENT_WITH_CREDIT_CARD,
    PAYMENT_WITH_MOMO,
} from '../utils/paymentConstants.js';
import { GHN_Request, momo_Request } from '../utils/request.js';
import { orderQueryParams, validateConstants } from '../utils/searchConstants.js';
import { getClientUrl } from '../utils/urlUtils.js';

//CONSTANT
const TYPE_DISCOUNT_MONEY = 1;
const TYPE_DISCOUNT_PERCENT = 2;

const PAYMENT_DEFAULT_ORDER_INFO = 'Thanh toán đơn hàng tại BlueShop';

const getOrdersByUserId = async (userId, pageParameter, currentUser) => {
    if (currentUser.role !== 'staff' && currentUser.role !== 'admin') {
        if (currentUser._id != userId) {
            throw new UnauthenticatedError('Bị cấm. Bạn không thể truy cập thông tin đơn hàng của người khác.');
        }
    }
    const orderFilter = { user: currentUser._id };
    if (pageParameter.status) {
        orderFilter.status = pageParameter.status;
    }
    const count = await Order.countDocuments({ ...orderFilter });
    const orders = await Order.find({ ...orderFilter })
        .populate(['delivery', 'paymentInformation'])
        .limit(pageParameter.limit)
        .skip(pageParameter.limit * pageParameter.page)
        .sort({ createdAt: 'desc' })
        .lean();
    return {
        orders: orders,
        page: pageParameter.page,
        pages: Math.ceil(count / pageParameter.limit),
        total: count,
    };
};

const getOrderById = async (orderId, currentUser) => {
    const order = await Order.findOne({ _id: orderId }).populate(['delivery', 'paymentInformation']).lean();
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại');
    }
    if (currentUser.role !== 'staff' && currentUser.role !== 'admin') {
        if (currentUser._id.toString() !== order.user.toString()) {
            throw new ItemNotFoundError('Đơn hàng không tồn tại');
        }
    }
    return order;
};

const getOrders = async (pageParameter) => {
    const sortBy = validateConstants(orderQueryParams, 'sort', pageParameter.sortBy);
    const orderStatusFilter = validateConstants(orderQueryParams, 'status', pageParameter.status);
    const orderFilter = {
        ...orderStatusFilter,
    };
    const count = await Order.countDocuments(orderFilter);
    const orders = await Order.find({ ...orderFilter })
        .populate(['delivery', 'paymentInformation'])
        .limit(pageParameter.limit)
        .skip(pageParameter.limit * pageParameter.page)
        .sort({ ...sortBy })
        .lean();

    return {
        orders: orders,
        page: pageParameter.page,
        pages: Math.ceil(count / pageParameter.limit),
        total: count,
    };
};

const checkOrderProductList = async (size, orderItems) => {
    const result = {
        orderItemIds: [],
        orderedProductList: [],
        totalProductPrice: 0,
    };
    await Promise.all(
        orderItems.map(async (orderItem) => {
            const orderedVariant = await Variant.findOne({
                _id: orderItem.variant,
                disabled: false,
                deleted: false,
            }).populate('product');
            if (!orderedVariant?.product?._id) {
                throw new Error(`Sản phẩm "${orderItem.name ? orderItem.name : orderItem.variant}" không tồn tại`);
            }
            if (orderedVariant.quantity < orderItem.quantity) {
                throw new Error(
                    `Số lượng đặt hàng của sản phẩm "${orderedVariant.product.name}" vượt quá số lượng trong kho`,
                );
            }
            size.height += orderedVariant.product.height * orderItem.quantity;
            size.weight += orderedVariant.product.weight * orderItem.quantity;
            size.length += orderedVariant.product.length;
            size.width += orderedVariant.product.width;
            result.totalProductPrice += orderedVariant.priceSale * orderItem.quantity;
            result.orderItemIds.push(orderItem.variant);
            result.orderedProductList.push({
                _id: orderedVariant.product._id,
                priceSale: orderedVariant.priceSale,
                quantity: orderItem.quantity,
            });
        }),
    );
    return result;
};

const calculateFee = async (shippingAddress, size, price) => {
    if (size.weight == 0) {
        size.weight = 1;
    }
    const config = {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            service_id: Number(shippingAddress.service_id),
            to_district_id: Number(shippingAddress.to_district_id),
            to_ward_code: String(shippingAddress.to_ward_code),
            height: size.height,
            length: size.length,
            weight: size.weight,
            width: size.width,
            insurance_value: price,
        }),
    };
    try {
        const httpResponse = await GHN_Request.get('v2/shipping-order/fee', config);
        return httpResponse.data.data.total;
    } catch (error) {
        throw new InternalServerError(error.response.data.message || error.message || '');
    }
};

const estimatedDeliveryTime = async (shippingAddress) => {
    const config = {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            service_id: Number(shippingAddress.service_id),
            to_district_id: Number(shippingAddress.to_district_id),
            to_ward_code: String(shippingAddress.to_ward_code),
        }),
    };
    try {
        const httpResponse = await GHN_Request.get('v2/shipping-order/leadtime', config);
        return httpResponse.data.data.leadtime;
    } catch (error) {
        throw new InternalServerError(error.response.data.message || error.message || '');
    }
};

const getAddressName = async (shippingAddress) => {
    const address = {
        ...shippingAddress,
        provinceName: '',
        districtName: '',
        wardName: '',
    };
    let provinces = [];
    // Get province
    try {
        const httpResponse = await GHN_Request.get('/master-data/province');
        provinces = httpResponse.data.data;
    } catch (error) {
        throw new InternalServerError(error.response.data.message || error.message || '');
    }
    provinces.map((item) => {
        if (item.ProvinceID == shippingAddress.to_province_id) {
            address.provinceName = item.ProvinceName;
        }
    });

    //Get district
    let districts = [];
    try {
        const httpResponse = await GHN_Request.get('/master-data/district', {
            data: JSON.stringify({
                province_id: shippingAddress.to_province_id,
            }),
        });
        districts = httpResponse.data.data;
    } catch (error) {
        throw new InternalServerError(error.response.data.message || error.message || '');
    }
    districts.map((item) => {
        if (item.DistrictID == shippingAddress.to_district_id) {
            address.districtName = item.DistrictName;
        }
    });

    //Get ward
    let wards = [];
    try {
        const httpResponse = await GHN_Request.get('/master-data/ward', {
            data: JSON.stringify({
                district_id: shippingAddress.to_district_id,
            }),
        });
        wards = httpResponse.data.data;
    } catch (error) {
        throw new InternalServerError(error.response.data.message || error.message || '');
    }
    wards.map((item) => {
        if (item.WardCode == shippingAddress.to_ward_code) {
            address.wardName = item.WardName;
        }
    });
    if (!address.provinceName) {
        throw new InvalidDataError('Tỉnh/Thành phố không hợp lệ');
    }
    if (!address.districtName) {
        throw new InvalidDataError('Quận/Huyện không hợp lệ');
    }
    if (!address.wardName) {
        throw new InvalidDataError('Xã/Phường không hợp lệ');
    }
    return address;
    // catch (error) {
    //     result.error = 1;
    //     result.message = error.message;
    //     return result;
    // }
};

const createOrder = async (request, hostUrl, currentUser) => {
    const user = await User.findOne({ _id: currentUser._id });

    const size = {
        height: 0,
        weight: 0,
        length: 0,
        width: 0,
    };

    const productCheckResult = await checkOrderProductList(size, request.orderItems);
    const calculateDeliveryFee = calculateFee(request.shippingAddress, size, productCheckResult.totalProductPrice);
    const calculateLeadTime = estimatedDeliveryTime(request.shippingAddress);
    const getAddress = getAddressName(request.shippingAddress);
    const [deliveryFee, leadTime, address] = await Promise.all([calculateDeliveryFee, calculateLeadTime, getAddress]);

    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    let newOrder;
    await session.withTransaction(async () => {
        const dataOrderItem = [];
        const createOrderItems = request.orderItems.map(async (orderItem) => {
            const orderedVariant = await Variant.findOneAndUpdate(
                {
                    _id: orderItem.variant,
                    quantity: { $gte: orderItem.quantity },
                    disabled: false,
                    deleted: false,
                },
                { $inc: { quantity: -orderItem.quantity } },
                { new: true },
            )
                .session(session)
                .lean();
            if (!orderedVariant) {
                await session.abortTransaction();
                throw new InvalidDataError(`Sản phẩm có ID "${orderItem.variant}" đã hết hàng`);
            }
            const orderedProduct = await Product.findOneAndUpdate(
                { _id: orderedVariant.product, disabled: false, deleted: false },
                { $inc: { totalSales: +orderItem.quantity, quantity: -orderItem.quantity } },
            )
                .session(session)
                .lean();
            if (!orderedProduct) {
                await session.abortTransaction();
                throw new UnprocessableContentError(`Sản phẩm có ID "${orderItem.variant}" không tồn tại`);
            }

            const newOrderItem = {
                variant: orderItem.variant,
                product: orderedProduct._id,
                name: orderedProduct.name,
                attributes: orderedVariant.attributes,
                image: orderedVariant.image || orderedProduct.images[0] || null,
                price: orderedVariant.priceSale,
                quantity: orderItem.quantity,
            };
            if (!newOrderItem.image) {
                newOrderItem.image = orderedProduct.images[0] || null;
            }
            dataOrderItem.push(newOrderItem);
        });
        await Promise.all(createOrderItems);
        if (dataOrderItem.length < request.orderItems.length) {
            await session.abortTransaction();
            throw new InternalServerError('Xảy ra lỗi khi tạo đơn hàng, vui lòng làm mới trang và đặt hàng lại');
        }
        // create order information
        const orderInfor = new Order({
            orderItems: dataOrderItem,
            user: currentUser._id,
            username: currentUser.name,
            totalProductPrice: productCheckResult.totalProductPrice || 0,
            shippingPrice: deliveryFee,
            totalDiscount: 0,
            status: 'placed',
            statusHistory: { status: 'placed', updateBy: currentUser._id },
        });

        //Check discount code
        if (request.discountCode) {
            const code = String(request.discountCode) || '';
            const discountCodeExist = await DiscountCode.findOne({ code: code, disabled: false });
            if (!discountCodeExist) {
                throw new UnprocessableContentError('Mã giảm giá không tồn tại');
            }
            if (discountCodeExist.startDate > new Date()) {
                throw new InvalidDataError(`Mã giảm giá có hiệu lực từ ngày ${Date(discountCodeExist.startDate)}`);
            }
            if (discountCodeExist.endDate < new Date()) {
                throw new InvalidDataError('Mã giảm giá đã hết hạn');
            }
            if (discountCodeExist.isUsageLimit && discountCodeExist.usageLimit <= discountCodeExist.used) {
                throw new InvalidDataError('Mã giảm giá đã được sử dụng hết');
            }
            if (discountCodeExist.userUseMaximum > 1) {
                const countUser = discountCodeExist.usedBy.filter((item) => {
                    return item.toString() == currentUser._id.toString();
                });
                if (countUser.length >= discountCodeExist.userUseMaximum) {
                    throw new InvalidDataError('Bạn đã hết lượt sử dụng mã giảm giá này');
                }
            } else if (discountCodeExist.usedBy.includes(currentUser._id)) {
                throw new InvalidDataError('Bạn đã hết lượt sử dụng mã giảm giá này');
            }
            // Tổng giá sản phẩm nằm trong danh sách được giảm giá của discount code
            let totalPriceProductDiscounted = 0;
            if (discountCodeExist.applyFor == 1) {
                totalPriceProductDiscounted = productCheckResult.totalProductPrice;
            } else {
                let count = 0;
                productCheckResult.orderedProductList.forEach((item) => {
                    if (discountCodeExist.applicableProducts.includes(item._id)) {
                        totalPriceProductDiscounted += item.priceSale * item.quantity;
                        count++;
                    }
                });
                if (count == 0) {
                    await session.abortTransaction();
                    throw new InvalidDataError('Mã giảm giá không được áp dụng cho các sản phẩm này');
                }
            }
            let discount;
            if (discountCodeExist.discountType == TYPE_DISCOUNT_MONEY) {
                if (totalPriceProductDiscounted >= discountCodeExist.discount) {
                    discount = discountCodeExist.discount;
                } else {
                    discount = totalPriceProductDiscounted;
                }
            } else if (discountCodeExist.discountType == TYPE_DISCOUNT_PERCENT) {
                discount = ((totalPriceProductDiscounted * discountCodeExist.discount) / 100).toFixed(3);
                if (discount > discountCodeExist.maximumDiscount) {
                    discount = discountCodeExist.maximumDiscount;
                }
            }
            discountCodeExist.usedBy.push(currentUser._id);
            discountCodeExist.used++;
            await discountCodeExist.save({ session });

            orderInfor.totalDiscount = discount;
        }

        const totalPayment = orderInfor.totalProductPrice + deliveryFee - orderInfor.totalDiscount;
        if (totalPayment >= 0) {
            orderInfor.totalPayment = totalPayment;
        } else {
            orderInfor.totalPayment = 0;
        }
        let leadDateTime = new Date(leadTime * 1000);

        if (leadDateTime == 'Invalid Date') {
            leadDateTime = null;
        }

        const newShippingInfor = new Delivery({
            order: orderInfor._id,
            client: currentUser._id,
            to_name: address.to_name,
            to_phone: address.to_phone,
            to_province_name: address.provinceName,
            to_district_name: address.districtName,
            to_ward_name: address.wardName,
            to_province_id: address.to_province_id,
            to_district_id: address.to_district_id,
            to_ward_code: address.to_ward_code,
            to_address: address.to_address,
            note: request.note || '',
            service_id: Number(request.shippingAddress.service_id),
            items: orderInfor.orderItems,
            deliveryFee: deliveryFee,
            leadTime: leadDateTime,
            height: size.height,
            length: size.length,
            weight: size.weight,
            width: size.width,
            insurance_value: orderInfor.totalProductPrice,
        });
        const newShipping = await newShippingInfor.save({ session });
        if (!newShipping) {
            throw new InternalServerError('Gặp lỗi khi tạo thông tin giao hàng');
        }
        orderInfor.delivery = newShipping._id;

        const newPaymentInformation = new Payment({
            user: currentUser._id,
            order: orderInfor._id,
            paymentAmount: orderInfor.totalPayment,
        });
        newPaymentInformation.paymentMethod = request.paymentMethod;

        if (isMomoPaymentMethods(newPaymentInformation.paymentMethod)) {
            //Create payment information with momo
            const amount = Number(orderInfor.totalPayment).toFixed();
            const ipnUrl = `${hostUrl}/api/v1/orders/${orderInfor._id}/payment-notification`;
            const redirectUrl =
                process.env.NODE_ENV == 'development'
                    ? ipnUrl
                    : `${getClientUrl()}/order/${orderInfor._id}/waiting-payment`;
            // const ipnUrl = `http://localhost:5000/api/v1/orders/${orderInfor._id}/payment-notification`;
            // const redirectUrl = ipnUrl;
            const requestId = uuidv4();
            const requestBody = createPaymentBody(
                orderInfor._id,
                requestId,
                PAYMENT_DEFAULT_ORDER_INFO,
                amount,
                redirectUrl,
                ipnUrl,
                user.email,
                newPaymentInformation.paymentMethod,
            );
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                },
            };
            await momo_Request
                .post('/create', requestBody, config)
                .then((response) => {
                    newPaymentInformation.payUrl = response.data.payUrl;
                    newPaymentInformation.requestId = requestId;
                })
                .catch(async (error) => {
                    throw new InvalidDataError(error.response?.message || error.message);
                });
        } else if (newPaymentInformation.paymentMethod != PAYMENT_WITH_CASH) {
            throw new InvalidDataError('Phương thức thanh toán không hợp lệ');
        }
        newPaymentInformation.status = { state: 'initialized', description: 'Chưa thanh toán' };
        const createOrderPaymentInformation = await newPaymentInformation.save({ session });
        if (!createOrderPaymentInformation) {
            throw new InternalServerError('Gặp lỗi trong quá trình tạo thông tin thanh toán');
        }

        orderInfor.paymentInformation = createOrderPaymentInformation._id;

        await Cart.findOneAndUpdate(
            { user: currentUser._id },
            { $pull: { cartItems: { variant: { $in: productCheckResult.orderItemIds } } } },
        )
            .session(session)
            .lean();

        //set order expiry time
        let now = new Date();
        if (isMomoPaymentMethods(newPaymentInformation.paymentMethod)) {
            now.setMinutes(now.getMinutes() + MAX_MINUTES_WAITING_TO_PAY);
        } else {
            // now.setDate(now.getDate() + MAX_DAYS_WAITING_FOR_SHOP_CONFIRMATION);
            now.setMinutes(now.getMinutes() + MAX_DAYS_WAITING_FOR_SHOP_CONFIRMATION);
        }
        orderInfor.expiredAt = now;

        newOrder = await (await orderInfor.save({ session })).populate(['delivery', 'paymentInformation']);
        if (!newOrder) {
            throw new InternalServerError('Xảy ra lỗi trong quá trình tạo đơn hàng');
        }

        TaskService.scheduleCancelExpiredOrder(newOrder);

        await session.commitTransaction();
    }, transactionOptions);
    return newOrder;
};

// Update: CONFIRM ORDER
const confirmOrder = async (orderId, request, currentUser) => {
    const order = await Order.findOne({ _id: orderId, disabled: false });
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại!');
    }
    switch (order.status) {
        case 'confirm':
            throw new InvalidDataError('Đơn hàng đã được xác nhận');
        case 'delivering':
            throw new InvalidDataError('Đơn hàng đang ở trạng thái đang giao');
        case 'delivered':
            throw new InvalidDataError('Đơn hàng đã được giao thành công');
        case 'completed':
            throw new InvalidDataError('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            throw new InvalidDataError('Đơn hàng đã bị hủy');
        default:
            break;
    }
    if (order.expiredAt < new Date()) {
        throw new InvalidDataError('Đơn hàng đã hết hạn');
    }
    order.statusHistory.push({ status: 'confirm', description: request.description, updateBy: currentUser._id });
    order.status = 'confirm';
    return await order.save();
};

const confirmDelivery = async (orderId, request, currentUser) => {
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate(['delivery', 'paymentInformation']);
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại!');
    }
    switch (order.status) {
        case 'placed':
            throw new InvalidDataError('Đơn hàng chưa được xác nhận');
        case 'delivering':
            throw new InvalidDataError('Đơn hàng đã ở trạng thái đang giao');
        case 'delivered':
            throw new InvalidDataError('Đơn hàng đã được giao thành công');
        case 'completed':
            throw new InvalidDataError('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            throw new InvalidDataError('Đơn hàng đã bị hủy');
        default:
            break;
    }
    let cod_amount = 0;
    if (!order.paymentInformation.paid) {
        if (isMomoPaymentMethods(order.paymentInformation.paymentMethod)) {
            throw new InvalidDataError('Đơn hàng chưa được thanh toán');
        }
        cod_amount = order.totalPayment;
    }

    const config = {
        data: JSON.stringify({
            shop_id: Number(process.env.GHN_SHOP_ID),
            payment_type_id: 1,
            note: order.delivery.note || '',
            required_note: request.requiredNote || order.delivery.required_note,
            client_order_code: Math.round(Math.random() * 1000000000).toString(),
            to_name: order.delivery.to_name,
            to_phone: order.delivery.to_phone,
            to_address: order.delivery.to_address,
            to_ward_name: order.delivery.to_ward_name,
            to_district_name: order.delivery.to_district_name,
            to_province_name: order.delivery.to_province_name,
            cod_amount: cod_amount,
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
    const deliveryInfo = await GHN_Request.get('v2/shipping-order/create', config)
        .then((response) => {
            return response.data.data;
        })
        .catch((error) => {
            throw new InternalServerError(error.response.data.message || error.message || null);
        });
    order.delivery.start_date = new Date();
    order.delivery.leadTime = deliveryInfo.expected_delivery_time || order.delivery.leadTime;
    order.delivery.deliveryFee = deliveryInfo.total_fee || order.delivery.deliveryFee;
    order.delivery.deliveryCode = deliveryInfo.order_code || order.delivery.deliveryCode;
    order.statusHistory.push({
        status: 'delivering',
        description: request.description,
        updateBy: currentUser._id,
    });
    order.status = 'delivering';
    await order.delivery.save();
    return await (await order.save()).populate(['delivery', 'paymentInformation']);
};

const confirmDelivered = async (orderId, request, currentUser) => {
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate(['delivery', 'paymentInformation']);
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại!');
    }
    switch (order.status) {
        case 'placed':
            throw new InvalidDataError('Đơn hàng chưa được xác nhận');
        case 'confirm':
            throw new InvalidDataError('Đơn hàng đã ở trạng thái đang giao');
        case 'completed':
            throw new InvalidDataError('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            throw new InvalidDataError('Đơn hàng đã bị hủy');
        default:
            break;
    }
    order.paymentInformation.paid = true;
    order.paymentInformation.paidAt = new Date();
    order.paymentInformation.status = { state: 'paid', description: 'Đã thanh toán' };
    order.delivery.statusHistory.push({ status: 'delivered', updated_date: new Date() });
    order.delivery.status = 'delivered';
    order.delivery.finish_date = new Date();
    order.statusHistory.push({ status: 'delivered', description: request.description, updateBy: currentUser._id });
    order.status = 'delivered';
    await order.paymentInformation.save();
    await order.delivery.save();
    return await order.save();
};

const confirmReceived = async (orderId, request, currentUser) => {
    const order = await Order.findOne({ _id: orderId, disabled: false });
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại!');
    }
    switch (order.status) {
        case 'placed':
            throw new InvalidDataError('Đơn hàng chưa được xác nhận');
        case 'confirm':
            throw new InvalidDataError('Đơn hàng  chỉ mới xác nhận chưa bắt đầu giao hàng');
        case 'completed':
            throw new InvalidDataError('Đơn hàng đã được hoàn thành');
        case 'cancelled':
            throw new InvalidDataError('Đơn hàng đã bị hủy');
        default:
            break;
    }
    order.statusHistory.push({ status: 'completed', description: request.description, updateBy: currentUser._id });
    order.status = 'completed';
    order.orderItems = order.orderItems.map((orderItem) => {
        orderItem.isAbleToReview = true;
        return orderItem;
    });
    return await order.save();
};

const validateIpnSignature = (order, ipnRequest) => {
    const { resultCode, message, responseTime, extraData, signature, orderType, payType, transId } = ipnRequest;
    const orderPayment = order.paymentInformation;
    const rawSignature =
        'accessKey=' +
        process.env.MOMO_ACCESS_KEY +
        '&amount=' +
        orderPayment.paymentAmount +
        '&extraData=' +
        extraData +
        '&message=' +
        message +
        '&orderId=' +
        order._id +
        '&orderInfo=' +
        PAYMENT_DEFAULT_ORDER_INFO +
        '&orderType=' +
        orderType +
        '&partnerCode=' +
        process.env.MOMO_PARTNER_CODE +
        '&payType=' +
        payType +
        '&requestId=' +
        orderPayment.requestId +
        '&responseTime=' +
        responseTime +
        '&resultCode=' +
        resultCode +
        '&transId=' +
        transId;
    const craftedSignature = crypto
        .createHmac('sha256', process.env.MOMO_SECRET_KEY)
        .update(rawSignature)
        .digest('hex');
    if (craftedSignature != signature) {
        throw new InvalidDataError('Chữ ký IPN không hợp lệ');
    }
};

const orderPaymentNotification = async (ipnRequest) => {
    let order = await Order.findOne({ _id: ipnRequest.orderId, disabled: false }).populate('paymentInformation');
    if (!order) {
        throw new UnprocessableContentError('Đơn hàng không tồn tại!');
    }
    validateIpnSignature(order, ipnRequest);
    if (order.status == 'cancelled') {
        throw new InvalidDataError('Đơn hàng đã bị hủy');
    }
    if (order.paymentInformation.paid) {
        throw new InvalidDataError('Đơn hàng đã được thanh toán');
    }
    if (ipnRequest.resultCode != 0) {
        const message = statusResponseFalse[ipnRequest.resultCode] || statusResponseFalse[99];
        console.error(message);
        //cancle order
        const session = await mongoose.startSession();
        const transactionOptions = {
            readPreference: 'primary',
            readConcern: { level: 'local' },
            writeConcern: { w: 'majority' },
        };
        await session.withTransaction(async () => {
            await rollbackProductQuantites(order, session);
            await cancelDelivery(order, session);
            //update order status
            order.status = 'cancelled';
            order.statusHistory.push({ status: 'cancelled', description: 'Từ chối thanh toán' });
            order.expiredAt = null;
            const cancelledOrder = await order.save();
            if (!cancelledOrder) {
                throw new InternalServerError('Gặp lỗi khi hủy đơn hàng');
            }
            console.error('Thanh toán thất bại, người dùng từ chối thanh toán');
        }, transactionOptions);
        await session.endSession();
        return null;
    }
    //payment succeed, order is expired but not be cancelled due to cron job doesn't run as expected
    if (order.expiredAt < new Date()) {
        //cancel
        if (!order.paymentInformation.transId) {
            await getOrderPaymentStatus(order._id);
            await order.populate('paymentInformation');
        }
        await cancelExpiredOrder(order);
        return null;
    }
    order.paymentInformation.transId = ipnRequest.transId;
    order.paymentInformation.paid = true;
    order.paymentInformation.paidAt = new Date();
    order.paymentInformation.status = { state: 'paid', description: 'Đã thanh toán' };
    await order.paymentInformation.save();
    order.statusHistory.push({ status: 'paid', updateBy: order.user });
    const now = new Date();
    now.setMinutes(now.getMinutes() + MAX_DAYS_WAITING_FOR_SHOP_CONFIRMATION);
    order.expiredAt = now;
    const savedOrder = await order.save();
    TaskService.scheduleCancelExpiredOrder(savedOrder);
    return null;
};

const getOrderPaymentStatus = async (orderId) => {
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate('paymentInformation');
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại!');
    }
    //Create payment information with momo
    const requestBody = createCheckStatusBody(order._id, order.paymentInformation.requestId);
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
        },
    };
    let response;
    try {
        response = await momo_Request.post('/query', requestBody, config);
    } catch (error) {
        throw new InternalServerError(error.response?.message || error.message);
    }
    if (response.data.resultCode == 0) {
        order.paymentInformation.refundTrans = response.data.refundTrans || [];
        order.paymentInformation.transId = response.data.transId || null;
        order.paymentInformation.paid = true;
        const savedPayment = await order.paymentInformation.save();
        return savedPayment;
    }
};

const refundOrderInCancel = async (paymentInformation) => {
    if (!(isMomoPaymentMethods(paymentInformation.paymentMethod) && paymentInformation.paid)) {
        console.log('return không refund');
        return;
    }
    //Create payment information with momo
    // const requestBody = createRefundTransBody(orderId, order.paymentInformation.requestId);
    const requestBody = createRefundTransBody(
        uuidv4(),
        paymentInformation.paymentAmount,
        'Hoàn tiền qua ví Momo',
        paymentInformation.requestId,
        paymentInformation.transId,
    );
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
        },
    };
    await momo_Request
        .post('/refund', requestBody, config)
        .then(async (response) => {
            paymentInformation.status = { state: 'refunded', description: 'Hoàn tiền thành công' };
            await paymentInformation.save();
            console.log('done refund');
        })
        .catch(async (error) => {
            throw new InternalServerError(error.response?.message || error.message);
        });
};

const refundTrans = async (req, res) => {
    const orderId = req.params.id;
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate('paymentInformation');
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại!');
    }
    //Create payment information with momo
    // const requestBody = createRefundTransBody(orderId, order.paymentInformation.requestId);
    const requestBody = createRefundTransBody(
        uuidv4(),
        order.paymentInformation.paymentAmount,
        'Hoàn tiền qua ví Momo',
        order.paymentInformation.requestId,
        order.paymentInformation.transId,
    );
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
        },
    };
    await momo_Request
        .post('/refund', requestBody, config)
        .then((response) => {
            res.json(response.data);
        })
        .catch(async (error) => {
            throw new InternalServerError(error.response?.message || error.message);
        });
};

const adminPaymentOrder = async (orderId, currentUser) => {
    const order = await Order.findOne({ _id: orderId, disabled: false }).populate('paymentInformation');
    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại!');
    }
    if (order.paymentInformation.paid) {
        throw new InvalidDataError('Đơn hàng đã hoàn thành việc thanh toán');
    }
    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    let deliveredOrder;
    await session.withTransaction(async () => {
        order.paymentInformation.paid = true;
        order.paymentInformation.paidAt = new Date();
        order.statusHistory.push({
            status: 'paid',
            updateBy: currentUser._id,
        });
        if (order.delivery.deliveryCode && order.delivery?.deliveryCode.trim() != '') {
            const config = {
                data: JSON.stringify({
                    order_code: order.delivery.deliveryCode,
                    cod_amount: 0,
                }),
            };
            await GHN_Request.get('/v2/shipping-order/updateCOD', config)
                .then(async (response) => {
                    order.delivery.cod_amount = cod_amount;
                    await order.delivery.save({ session });
                })
                .catch((error) => {
                    throw new InternalServerError(
                        error.response.data.message.code_message_value ||
                            error.response.data.message ||
                            error.message ||
                            '',
                    );
                });
        }
        await order.paymentInformation.save({ session });
        deliveredOrder = await (await order.save({ session })).populate(['delivery', 'paymentInformation']);
    }, transactionOptions);
    session.endSession();
    return deliveredOrder;
};

const cancelOrder = async (orderId, request, currentUser) => {
    const order = await Order.findOne({ _id: orderId }).populate('delivery').populate('paymentInformation');

    if (!order) {
        throw new ItemNotFoundError('Đơn hàng không tồn tại');
    }
    if (currentUser.role == 'admin' || currentUser.role == 'staff') {
        switch (order.status) {
            case 'delivered':
                throw new InvalidDataError('Đơn hàng đã được giao thành công. Không thể hủy đơn hàng');
            case 'completed':
                throw new InvalidDataError('Đơn hàng đã được hoàn thành. Không thể hủy đơn hàng');
            case 'cancelled':
                throw new InvalidDataError('Đơn hàng đã bị hủy');
            default:
                break;
        }
    } else if (currentUser._id.toString() == order.user.toString()) {
        switch (order.status) {
            // case 'confirm':
            //     res.status(400);
            //     throw new Error('Đơn hàng đã được xác nhận. Không thể hủy đơn hàng');
            case 'delivering':
                throw new InvalidDataError('Đơn hàng đang được giao đến bạn. Không thể hủy đơn hàng');
            case 'delivered':
                throw new InvalidDataError('Đơn hàng đã được giao thành công. Không thể hủy đơn hàng');
            case 'completed':
                throw new InvalidDataError('Đơn hàng đã được hoàn thành. Không thể hủy đơn hàng');
            case 'cancelled':
                throw new InvalidDataError('Đơn hàng đã bị hủy');
            default:
                break;
        }
    } else {
        throw new ItemNotFoundError('Đơn hàng không tồn tại');
    }
    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    await session.withTransaction(async () => {
        await rollbackProductQuantites(order, session);
        await cancelDelivery(order, session);
        await refundOrderInCancel(order.paymentInformation);
        //update order status
        order.status = 'cancelled';
        order.statusHistory.push({ status: 'cancelled', description: request.description });
        const cancelledOrder = await order.save();
        if (!cancelledOrder) {
            throw new InternalServerError('Gặp lỗi khi hủy đơn hàng');
        }
    }, transactionOptions);
    await session.endSession();
    return 'Hủy đơn hàng thành công';
};

const rollbackProductQuantites = async (order, session) => {
    const variantQuantitiesUpdate = {};
    const productTotalSalesUpdate = {};
    for (const orderItem of order.orderItems) {
        const variantId = orderItem.variant;
        const quantity = orderItem.quantity;
        if (!variantQuantitiesUpdate[variantId]) {
            variantQuantitiesUpdate[variantId] = quantity;
        } else {
            variantQuantitiesUpdate[variantId] += quantity;
        }
        const productId = orderItem.product;
        if (!productTotalSalesUpdate[productId]) {
            productTotalSalesUpdate[productId] = quantity;
        } else {
            productTotalSalesUpdate[productId] += quantity;
        }
    }
    const productsRollback = [];
    const variantsRollback = [];
    for (const variantId of Object.keys(variantQuantitiesUpdate)) {
        variantsRollback.push(
            Variant.findOneAndUpdate({ _id: variantId }, { $inc: { quantity: variantQuantitiesUpdate[variantId] } })
                .session(session)
                .lean(),
        );
    }
    for (const productId of Object.keys(productTotalSalesUpdate)) {
        const quantity = productTotalSalesUpdate[productId];
        productsRollback.push(
            Product.findOneAndUpdate({ _id: productId }, { $inc: { totalSales: -quantity, quantity: quantity } })
                .session(session)
                .lean(),
        );
    }
    await Promise.all(variantsRollback.concat(productsRollback));
    // const updateOrderItems = order.orderItems.map(async (orderItem) => {
    //     await Product.findOneAndUpdate(
    //         { _id: orderItem.product },
    //         { $inc: { totalSales: -orderItem.quantity, quantity: +orderItem.quantity } },
    //     )
    //         .session(session)
    //         .lean();
    //     await Variant.findOneAndUpdate(
    //         { _id: orderItem.variant },
    //         { $inc: { quantity: orderItem.quantity } },
    //         { new: true },
    //     )
    //         .session(session)
    //         .lean();
    // });
    // await Promise.all(updateOrderItems);
};

const cancelDelivery = async (order, session) => {
    if (order.status == 'delivering' && order.delivery.deliveryCode) {
        const config = {
            data: JSON.stringify({
                shop_id: Number(process.env.GHN_SHOP_ID),
                order_codes: [new String(order.delivery.deliveryCode)],
            }),
        };
        const deliveryInfo = await GHN_Request.get('v2/switch-status/cancel', config)
            .then((response) => {
                return response.data.data;
            })
            .catch((error) => {
                res.status(error.response.data.code || 502);
                throw new InternalServerError(error.response.data.message || error.message || null);
            });

        if (!deliveryInfo) {
            await session.abortTransaction();
            res.status(502);
            throw new InternalServerError('Gặp lỗi khi hủy đơn giao hàng của đơn vị Giao Hàng Nhanh');
        }
    }
};

const cancelExpiredOrder = async (order) => {
    if (!order) {
        return;
    }
    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    await session.withTransaction(async () => {
        const expiredOrder = await Order.findOne({
            _id: order._id,
            status: 'placed',
            expiredAt: { $lte: new Date() },
        }).populate('paymentInformation');
        if (expiredOrder == null) {
            return;
        }
        let cancelReason;
        //payment expired
        if (
            !expiredOrder.paymentInformation.paid &&
            isMomoPaymentMethods(expiredOrder.paymentInformation.paymentMethod)
        ) {
            cancelReason = 'Hết hạn thanh toán';
        }
        //shop did not response
        else {
            cancelReason = 'Shop không phản hồi';
        }
        await OrderService.rollbackProductQuantites(expiredOrder, session);
        expiredOrder.status = 'cancelled';
        expiredOrder.statusHistory.push({ status: 'cancelled', description: cancelReason });
        const cancelledOrder = await expiredOrder.save();
        await OrderService.refundOrderInCancel(cancelledOrder.paymentInformation);
        console.log(`Đơn hàng ${expiredOrder._id} đã bị hủy vì ${cancelReason.toLowerCase()}`);
    }, transactionOptions);
    await session.endSession();
};

const cancelExpiredOrderWithRetry = async (order, retry) => {
    let attempt = 1;
    while (attempt <= retry) {
        try {
            await OrderService.cancelExpiredOrder(order);
            break;
        } catch (error) {
            console.error(`Hủy đơn hàng ${order._id} lần thứ ${attempt} thất bại. Lỗi: ${error.message}`);
            if (error.hasOwnProperty('errorLabels') && error.errorLabels.includes('TransientTransactionError')) {
                attempt++;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
                break;
            }
        }
    }
};

const cancelExpiredOrdersOnStarup = async () => {
    console.log('Running OrderService cancelExpiredOrdersOnStarup');
    const expiredOrders = await Order.find({ status: 'placed', expiredAt: { $lte: new Date() } });
    const cancelTasks = expiredOrders.map((order) => cancelExpiredOrderWithRetry(order, 3));
    await Promise.all(cancelTasks);
};

const isMomoPaymentMethods = (paymentMethod) => {
    return (
        paymentMethod == PAYMENT_WITH_MOMO ||
        paymentMethod == PAYMENT_WITH_ATM ||
        paymentMethod == PAYMENT_WITH_CREDIT_CARD
    );
};

const OrderService = {
    getOrdersByUserId,
    getOrderById,
    getOrders,
    createOrder,
    confirmOrder,
    confirmDelivery,
    confirmDelivered,
    confirmReceived,
    orderPaymentNotification,
    adminPaymentOrder,
    cancelOrder,
    getOrderPaymentStatus,
    refundTrans,
    refundOrderInCancel,
    rollbackProductQuantites,
    cancelDelivery,
    cancelExpiredOrder,
    cancelExpiredOrdersOnStarup,
};

export default OrderService;
