import dotenv from 'dotenv';
import schedule, { scheduleJob } from 'node-schedule';
import crypto from 'crypto';
import User from '../models/user.model.js';
import Cart from '../models/cart.model.js';
import DiscountCode from '../models/discountCode.model.js';
import Token from '../models/token.model.js';
import { sendMail } from '../utils/nodemailler.js';
import generateAuthToken from '../utils/generateToken.js';
import { htmlMailVerify, htmlResetEmail } from '../common/LayoutMail.js';
import image from '../assets/images/index.js';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

dotenv.config();

const getUsersByAdmin = async (req, res) => {
    const users = await User.find().lean();
    res.status(200).json({ message: 'Success', data: { users } });
};

const login = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        if (user.isVerified === false) {
            res.status(401);
            throw new Error(
                'Tài khoản của bạn chưa được xác minh. Vui lòng kiểm tra email của bạn để xác minh tài khoản trước khi đăng nhập.',
            );
        }
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            avatar: user.avatar,
            gender: user.gender,
            birthday: user.birthday,
            address: user.address,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        const generateToken = generateAuthToken(user._id);
        const newToken = await new Token({
            user: user._id,
            ...generateToken,
        }).save();
        if (!newToken) {
            res.status(500);
            throw new Error('Authentication token generation failed');
        }
        res.status(200).json({
            message: 'Success',
            data: {
                user: userData,
                accessToken: generateToken.accessToken,
                refreshToken: generateToken.refreshToken,
            },
        });
    } else {
        res.status(401);
        throw new Error('Email hoặc mật khẩu sai');
    }
};
const refreshToken = async (req, res) => {
    if (!req.body.refreshToken || req.body.refreshToken?.toString().trim() == '') {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
    const refreshToken = req.body.refreshToken.toString();

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET);
        const userId = decoded._id || null;
        // const user = await User.findOne({ _id: userId, isVerified: true }).select('-password');
        const verifyToken = await Token.findOne({ user: userId, refreshToken: refreshToken }).populate({
            path: 'user',
            select: '-password',
        });

        if (!verifyToken || !verifyToken.user) {
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
        const generateToken = generateAuthToken(verifyToken.user._id);
        verifyToken.accessToken = generateToken.accessToken;
        verifyToken.refreshToken = generateToken.refreshToken;
        verifyToken.expiresIn = generateToken.expiresIn;
        await verifyToken.save();
        const userData = {
            _id: verifyToken.user._id,
            name: verifyToken.user.name,
            email: verifyToken.user.email,
            role: verifyToken.user.role,
            phone: verifyToken.user.phone,
            avatar: verifyToken.user.avatar,
            gender: verifyToken.user.gender,
            birthday: verifyToken.user.birthday,
            address: verifyToken.user.address,
            createdAt: verifyToken.user.createdAt,
            updatedAt: verifyToken.user.updatedAt,
        };
        res.status(200).json({
            data: {
                user: userData,
                accessToken: generateToken.accessToken,
                refreshToken: generateToken.refreshToken,
            },
        });
    } catch (error) {
        res.status(401);
        throw new Error('Not authorized, token failed');
    }
};
const register = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }

    const { name, phone, password } = req.body;
    const email = req.body.email.toString().toLowerCase();
    const userExists = await User.exists({ email });
    if (userExists) {
        res.status(400);
        throw new Error('Tài khoản đã tồn tại');
    }

    const user = await User.create({
        name,
        email,
        phone,
        password,
    });
    const emailVerificationToken = user.getEmailVerificationToken();
    await user.save();
    const url = `${process.env.CLIENT_PAGE_URL}/register/confirm?emailVerificationToken=${emailVerificationToken}`;
    const html = htmlMailVerify(emailVerificationToken);

    //start cron-job
    let scheduledJob = schedule.scheduleJob(`*/${process.env.EMAIL_VERIFY_EXPIED_TIME_IN_MINUTE} * * * *`, async () => {
        const foundUser = await User.findOneAndDelete({
            _id: user._id,
            isVerified: false,
        }).lean();
        scheduledJob.cancel();
    });

    //set up message options
    const messageOptions = {
        recipient: user.email,
        subject: 'Xác thực tài khoản Fashion Shop',
        html: html,
    };

    //send verify email
    await sendMail(messageOptions);
    res.status(200).json({
        message:
            'Đăng ký tài khoản thành công. Vui lòng truy cập email của bạn để xác minh tài khoản của bạn. Yêu cầu đăng ký sẽ hết hạn trong vòng 24 giờ.',
    });
};

const verifyEmail = async (req, res) => {
    const emailVerificationToken = req.query.emailVerificationToken?.toString().trim() || '';
    if (!emailVerificationToken || emailVerificationToken == '') {
        res.status(400);
        throw new Error('Mã thông báo xác minh email không tồn tại');
    }
    const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
    const user = await User.findOne({ emailVerificationToken: hashedToken, isVerified: false });
    if (!user) {
        res.status(400);
        throw new Error('Mã thông báo xác minh email không tồn tại');
    }
    user.isVerified = true;
    user.emailVerificationToken = null;
    const verifiedUser = await user.save();
    if (!verifiedUser) {
        res.status(502);
        throw new Error('Xác minh tài khoản không thành công');
    }
    const userData = {
        _id: verifiedUser._id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        role: verifiedUser.role,
        phone: verifiedUser.phone,
        avatar: verifiedUser.avatar,
        gender: verifiedUser.gender,
        birthday: verifiedUser.birthday,
        address: verifiedUser.address,
        createdAt: verifiedUser.createdAt,
        updatedAt: verifiedUser.updatedAt,
    };
    const cart = await Cart.create({
        user: verifiedUser._id,
        cartItems: [],
    });
    const generateToken = generateAuthToken(verifiedUser._id);
    const newToken = await new Token({
        user: verifiedUser._id,
        ...generateToken,
    }).save();
    if (!newToken) {
        res.status(502);
        throw new Error('Authentication token generation failed');
    }
    res.status(200).json({
        message: 'Xác minh Tài khoản thành công',
        data: {
            user: userData,
            accessToken: generateToken.accessToken,
            refreshToken: generateToken.refreshToken,
        },
    });
};

const cancelVerifyEmail = async (req, res, next) => {
    const emailVerificationToken = req.query.emailVerificationToken.toString().trim();
    if (!emailVerificationToken || emailVerificationToken === '') {
        res.status(400);
        throw new Error('Mã thông báo xác minh email không hợp lệ');
    }
    const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
    const user = await User.findOneAndDelete({ emailVerificationToken: hashedToken, isVerified: false }).lean();
    if (!user) {
        res.status(400);
        throw new Error('Mã thông báo xác minh email không tồn tại');
    }
    res.status(200).json({ message: 'Hủy xác minh email thành công' });
};

const forgotPassword = async (req, res, next) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: true });

    if (!user) {
        res.status(400);
        throw new Error('Tài khoản không tồn tại');
    }

    // Reset password
    const resetPasswordToken = user.getResetPasswordToken();
    await user.save();

    // Send reset password email
    const resetPasswordUrl = `${process.env.CLIENT_PAGE_URL}/reset?resetPasswordToken=${resetPasswordToken}`;
    const html = htmlResetEmail({ link: resetPasswordUrl, email, urlLogo: image.logo });

    // Set up message options
    const messageOptions = {
        recipient: user.email,
        subject: 'Đặt lại mật khẩu',
        html,
    };

    // Send reset password email
    await sendMail(messageOptions);
    res.status(200).json({
        message: 'Yêu cầu đặt lại mật khẩu thành công. Hãy kiểm tra hộp thư email của bạn',
    });
};

const resetPassword = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { newPassword } = req.body;
    const { resetPasswordToken } = req.query;
    const hashedToken = crypto.createHash('sha256').update(resetPasswordToken).digest('hex');
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        isVerified: true,
    });
    if (!user) {
        res.status(400);
        throw new Error('Mã thông báo đặt lại mật khẩu không tồn tại');
    }
    if (user.resetPasswordTokenExpiryTime < Date.now()) {
        res.status(400);
        throw new Error('Yêu cầu đặt lại mật khẩu đã hết hạn');
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiryTime = null;
    await user.save();
    await Token.deleteMany({ user: user._id }).lean();
    res.status(200).json({ message: 'Mật khẩu của bạn đã được đặt lại' });
};

const cancelResetPassword = async (req, res) => {
    const resetPasswordToken = req.query.resetPasswordToken?.toString().trim();
    if (!resetPasswordToken || resetPasswordToken === '') {
        res.status(400);
        throw new Error('Mã thông báo đặt lại mật khẩu không hợp lệ');
    }
    const hashedToken = crypto.createHash('sha256').update(resetPasswordToken).digest('hex');
    const user = await User.findOneAndUpdate(
        {
            resetPasswordToken: hashedToken,
            // resetPasswordTokenExpiryTime: {
            //     $gte: Date.now() * process.env.RESET_PASSWORD_EXPIRY_TIME_IN_MINUTE * 60 * 1000,
            // },
            isVerified: true,
        },
        {
            resetPasswordToken: null,
            resetPasswordTokenExpiryTime: null,
        },
    ).lean();
    if (!user) {
        res.status(400);
        throw new Error('Mã thông báo đặt lại mật khẩu không tồn tại');
    }
    res.status(200).json({ message: 'Hủy yêu cầu đặt lại mật khẩu thành công' });
};

const getProfile = async (req, res) => {
    const user = await User.findById(req.user._id)
        .select({
            password: 0,
            isVerified: 0,
            emailVerificationToken: 0,
            resetPasswordToken: 0,
            resetPasswordTokenExpiryTime: 0,
        })
        .lean();
    if (!user) {
        res.status(404);
        throw new Error('Tài khoản không tồn tại');
    }
    res.status(200).json({
        data: {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                gender: user.gender,
                birthday: user.birthday,
                address: user.address,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        },
    });
};

const updateProfile = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }

    const user = await User.findById(req.user._id);
    if (user) {
        user.name = req.body.name || user.name;
        user.phone = req.body.phone || user.phone;
        user.gender = req.body.gender || user.gender;
        // user.avatar = req.body.avatar || user.avatar;
        user.birthday = req.body.birthday || user.birthday;
        // user.address = req.body.address || user.address;
        const updatedUser = await user.save();
        res.status(200).json({
            message: 'Cập nhật thông tin tài khoản thành công',
            data: {
                user: {
                    _id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    phone: updatedUser.phone,
                    avatar: updatedUser.avatar,
                    gender: updatedUser.gender,
                    birthday: updatedUser.birthday,
                    createdAt: updatedUser.createdAt,
                    updatedAt: updatedUser.updatedAt,
                },
            },
        });
    } else {
        res.status(404);
        throw new Error('Tài khoản không tồn tại');
    }
};

const changePassword = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('Tài khoản không tồn tại');
    }
    if (await user.matchPassword(currentPassword)) {
        user.password = newPassword;
        await user.save();
        await Token.deleteMany({ user: user._id });
        res.status(200).json({
            message: 'Thay đổi mật khẩu thành công',
        });
    } else {
        res.status(400);
        throw new Error('Mật khẩu hiện tại không đúng');
    }
};

const getUserAddress = async (req, res) => {
    res.json({
        message: 'Success',
        data: {
            addressList: req.user.address || [],
        },
    });
};

const createUserAddress = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }

    const { name, phone, province, district, ward, specificAddress } = req.body;
    let { isDefault } = req.body || false;
    if (isDefault) {
        req.user.address.map((item) => {
            item.isDefault = false;
        });
    }
    if (req.user.address.length == 0) {
        isDefault = true;
    }
    req.user.address.push({ name, phone, province, district, ward, specificAddress, isDefault });
    await req.user.save();
    res.status(201).json({ message: 'Thêm địa chỉ thành công', data: { addressList: req.user.address } });
};
const updateUserAddress = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const addressId = req.params.id || null;
    const { name, phone, province, district, ward, specificAddress, isDefault } = req.body;
    let count = 0;
    req.user.address.map((item) => {
        if (isDefault) {
            item.isDefault = false;
        }
        if (item._id == addressId) {
            if (isDefault == false && item.isDefault == true) {
                throw new Error(
                    'Không thể bỏ xác nhận đặt làm địa chỉ mặc định khi địa chỉ đang được chọn làm mặc định',
                );
            }
            item.name = name;
            item.phone = phone;
            item.province = province;
            item.district = district;
            item.ward = ward;
            item.specificAddress = specificAddress;
            item.isDefault = isDefault;
            count++;
        }
    });
    if (count <= 0) {
        res.status(404);
        throw new Error('Địa chỉ không tồn tại');
    }
    await req.user.save();
    res.status(200).json({ message: 'Cập nhật địa chỉ thành công', data: { addressList: req.user.address } });
};
const removeUserAddress = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const addressId = req.params.id || null;
    const newAddressList = req.user.address.filter((item) => {
        if (item._id == addressId) {
            if (item.isDefault) {
                res.status(400);
                throw new Error('Không thể xóa địa chỉ đang được đặt làm địa chỉ mặc định');
            } else {
                return false;
            }
        } else {
            return true;
        }
    });
    if (newAddressList.length == req.user.address.length) {
        res.status(404);
        throw new Error('Địa chỉ không tồn tại');
    }
    req.user.address = newAddressList;
    await req.user.save();
    res.status(200).json({ message: 'Xóa địa chỉ thành công', data: { addressList: req.user.address } });
};
const getUserDiscountCode = async (req, res) => {
    await req.user.populate('discountCode');
    res.json({
        message: 'Success',
        data: {
            discountCodeList: req.user.discountCode,
        },
    });
};
const addUserDiscountCode = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const code = req.body.discountCode;
    const existedDiscountCode = await DiscountCode.findOne({ code: code, disabled: false }).lean();
    if (!existedDiscountCode) {
        res.status(404);
        throw new Error('Mã giảm giá không tồn tại');
    }
    if (existedDiscountCode.endDate < Date.now()) {
        res.status(404);
        throw new Error('Mã giảm giá Đã hết hạn');
    }
    if (existedDiscountCode.isUsageLimit) {
        if (existedDiscountCode.used >= existedDiscountCode.usageLimit) {
            res.status(400);
            throw new Error('Mã giảm giá đã được sử dụng hết');
        }
    }
    if (req.user.discountCode.indexOf(existedDiscountCode._id) != -1) {
        res.status(400);
        throw new Error('Mã giảm giá đã tồn tại trong danh sách mã giảm giá của bạn');
    }
    req.user.discountCode.push(existedDiscountCode._id);
    await req.user.save();
    await req.user.populate('discountCode');
    // const user = await User.findById(req.user._id).populate('discountCode');
    res.status(201).json({
        message: 'Success',
        data: {
            discountCodeList: req.user.discountCode || [],
        },
    });
};
const userController = {
    login,
    refreshToken,
    register,
    getProfile,
    updateProfile,
    createUserAddress,
    updateUserAddress,
    getUserAddress,
    removeUserAddress,
    getUserDiscountCode,
    addUserDiscountCode,
    changePassword,
    getUsersByAdmin,
    verifyEmail,
    forgotPassword,
    resetPassword,
    cancelVerifyEmail,
    cancelResetPassword,
};
export default userController;
