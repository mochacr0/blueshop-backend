import crypto from 'crypto';
import dotenv from 'dotenv';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import schedule from 'node-schedule';
import activationMail from '../common/templates/mail.activation.js';
import passwordResetEmail from '../common/templates/password.reset.js';
import Cart from '../models/cart.model.js';
import DiscountCode from '../models/discountCode.model.js';
import Token from '../models/token.model.js';
import User from '../models/user.model.js';
import {
    InternalServerError,
    InvalidDataError,
    ItemNotFoundError,
    UnauthorizedError,
    UnprocessableContentError,
} from '../utils/errors.js';
import generateAuthToken from '../utils/generateToken.js';
import { sendMail } from '../utils/nodemailler.js';

dotenv.config();

const getUsersByAdmin = () => {
    return User.find().lean();
};

const login = async (email, password) => {
    // Validate the request data using express-validator
    const user = await User.findOne({ email });
    if (!user) {
        throw new UnauthorizedError('Email không tồn tại');
    }
    const isPasswordMatched = await user.matchPassword(password);
    if (!isPasswordMatched) {
        throw new UnauthorizedError('Email hoặc mật khẩu sai');
    }
    if (user.isVerified === false) {
        throw new UnauthorizedError(
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
    return {
        user: userData,
        accessToken: generateToken.accessToken,
        refreshToken: generateToken.refreshToken,
    };
};

const refreshToken = async (refreshToken) => {
    if (!refreshToken || refreshToken?.toString().trim() == '') {
        throw new UnauthorizedError('Not authorized, no token');
    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET);
    } catch (err) {
        throw new UnauthorizedError('Not authorized, token failed');
    }
    const userId = decoded._id || null;
    const user = await User.findOne({ _id: userId });

    if (!user) {
        throw new UnauthorizedError('Not authorized, token failed');
    }

    const generateToken = generateAuthToken(user._id);
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
    return {
        user: userData,
        accessToken: generateToken.accessToken,
        refreshToken: generateToken.refreshToken,
    };
};

const register = async (request) => {
    // Validate the request data using express-validator

    const email = request.email.toString().toLowerCase();
    const userExists = await User.exists({ email });
    if (userExists) {
        throw new InvalidDataError('Tài khoản đã tồn tại');
    }

    const user = await User.create({
        name: request.name,
        email: email,
        phone: request.phone,
        password: request.password,
    });

    const emailVerificationToken = user.getEmailVerificationToken();
    await user.save();
    const html = activationMail(user.email, emailVerificationToken, user.name);

    //start cron-job
    let scheduledJob = schedule.scheduleJob(`*/${process.env.EMAIL_VERIFY_EXPIED_TIME_IN_MINUTE} * * * *`, async () => {
        await User.findOneAndDelete({
            _id: user._id,
            isVerified: false,
        }).lean();
        scheduledJob.cancel();
    });

    //set up message options
    const messageOptions = {
        recipient: user.email,
        subject: 'Xác thực tài khoản BlueShop',
        html: html,
    };

    //send verify email
    await sendMail(messageOptions);
};

const verifyEmail = async (emailVerificationToken) => {
    if (!emailVerificationToken || emailVerificationToken == '') {
        throw new InvalidDataError('Mã thông báo xác minh email không tồn tại');
    }
    const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
    const user = await User.findOne({ emailVerificationToken: hashedToken, isVerified: false });
    if (!user) {
        throw new UnprocessableContentError('Mã thông báo xác minh email không tồn tại');
    }
    user.isVerified = true;
    user.emailVerificationToken = null;
    const verifiedUser = await user.save();
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
    await Cart.create({
        user: verifiedUser._id,
        cartItems: [],
    });
    const generateToken = generateAuthToken(verifiedUser._id);
    // const newToken = await new Token({
    //     user: verifiedUser._id,
    //     ...generateToken,
    // }).save();
    // if (!newToken) {
    //     throw new InternalServerError('Authentication token generation failed');
    // }
    return {
        user: userData,
        accessToken: generateToken.accessToken,
        refreshToken: generateToken.refreshToken,
    };
};

const cancelVerifyEmail = async (req, res, next) => {
    const emailVerificationToken = req.query.emailVerificationToken.toString().trim();
    if (!emailVerificationToken || emailVerificationToken === '') {
        throw new InvalidDataError('Mã thông báo xác minh email không hợp lệ');
    }
    const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
    const user = await User.findOneAndDelete({ emailVerificationToken: hashedToken, isVerified: false }).lean();
    if (!user) {
        throw new UnprocessableContentError('Mã thông báo xác minh email không tồn tại');
    }
    res.json({ message: 'Hủy xác minh email thành công' });
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
        throw new UnprocessableContentError('Tài khoản không tồn tại');
    }

    // Reset password
    const resetPasswordToken = user.getResetPasswordToken();
    await user.save();

    // Send reset password email
    const resetPasswordUrl = `${process.env.CLIENT_PAGE_URL}/reset?resetPasswordToken=${resetPasswordToken}`;
    const html = passwordResetEmail(email, resetPasswordUrl, user.name);

    // Set up message options
    const messageOptions = {
        recipient: user.email,
        subject: 'Đặt lại mật khẩu',
        html,
    };

    // Send reset password email
    await sendMail(messageOptions);
    res.json({
        message: 'Yêu cầu đặt lại mật khẩu thành công. Hãy kiểm tra hộp thư email của bạn',
    });
};

const resetPassword = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
    const { newPassword } = req.body;
    const { resetPasswordToken } = req.query;
    const hashedToken = crypto.createHash('sha256').update(resetPasswordToken).digest('hex');
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        isVerified: true,
    });
    if (!user) {
        throw new UnprocessableContentError('Mã thông báo đặt lại mật khẩu không tồn tại');
    }
    if (user.resetPasswordTokenExpiryTime < Date.now()) {
        throw new InvalidDataError('Yêu cầu đặt lại mật khẩu đã hết hạn');
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiryTime = null;
    await user.save();
    res.json({ message: 'Mật khẩu của bạn đã được đặt lại' });
};

const cancelResetPassword = async (req, res) => {
    const resetPasswordToken = req.query.resetPasswordToken?.toString().trim();
    if (!resetPasswordToken || resetPasswordToken === '') {
        throw new InvalidDataError('Mã thông báo đặt lại mật khẩu không hợp lệ');
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
        throw new UnprocessableContentError('Mã thông báo đặt lại mật khẩu không tồn tại');
    }
    res.json({ message: 'Hủy yêu cầu đặt lại mật khẩu thành công' });
};

const getProfile = async (userId) => {
    const user = await User.findById(userId)
        .select({
            password: 0,
            isVerified: 0,
            emailVerificationToken: 0,
            resetPasswordToken: 0,
            resetPasswordTokenExpiryTime: 0,
        })
        .lean();
    if (!user) {
        throw new ItemNotFoundError('Tài khoản không tồn tại');
    }
    return user;
};

const updateProfile = async (userId, request) => {
    // Validate the request data using express-validator
    const user = await User.findById(userId);
    if (!user) {
        throw new UnprocessableContentError('Tài khoản không tồn tại');
    }
    user.name = request.name || user.name;
    user.phone = request.phone || user.phone;
    user.gender = request.gender || user.gender;
    user.birthday = request.birthday || user.birthday;
    const updatedUser = await user.save();
    return {
        _id: updatedUser._id,
        name: updatedUser.name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        gender: updatedUser.gender,
        birthday: updatedUser.birthday,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
    };
};

const changePassword = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new UnprocessableContentError('Tài khoản không tồn tại');
    }
    const isPasswordMatched = await user.matchPassword(currentPassword);
    if (!isPasswordMatched) {
        throw new InvalidDataError('Mật khẩu hiện tại không đúng');
    }
    user.password = newPassword;
    await user.save();
    res.json({
        message: 'Thay đổi mật khẩu thành công',
    });
};

const getUserAddress = async (currentUser) => {
    return currentUser.address;
};

const createUserAddress = async (request, currentUser) => {
    if (request.isDefault) {
        currentUser.address.map((item) => {
            item.isDefault = false;
        });
    }
    if (currentUser.address.length == 0) {
        request.isDefault = true;
    }

    currentUser.address.push(request);
    const savedUser = await currentUser.save();
    return savedUser.address;
};

const updateUserAddress = async (addressId, request, currentUser) => {
    // Validate the request data using express-validator
    let count = 0;
    currentUser.address.map((item) => {
        if (request.isDefault) {
            item.isDefault = false;
        }
        if (item._id == addressId) {
            if (!request.isDefault && item.isDefault) {
                throw new InvalidDataError(
                    'Không thể bỏ xác nhận đặt làm địa chỉ mặc định khi địa chỉ đang được chọn làm mặc định',
                );
            }
            item.name = request.name;
            item.phone = request.phone;
            item.province = request.province;
            item.district = request.district;
            item.ward = request.ward;
            item.specificAddress = request.specificAddress;
            item.isDefault = request.isDefault;
            count++;
        }
    });
    if (count <= 0) {
        throw new UnprocessableContentError('Địa chỉ không tồn tại');
    }
    const savedUser = await currentUser.save();
    return savedUser.address;
};

const removeUserAddress = async (addressId, currentUser) => {
    // Validate the request data using express-validator
    const newAddressList = currentUser.address.filter((item) => {
        if (item._id == addressId) {
            if (item.isDefault) {
                throw new InvalidDataError('Không thể xóa địa chỉ đang được đặt làm địa chỉ mặc định');
            } else {
                return false;
            }
        } else {
            return true;
        }
    });
    if (newAddressList.length == currentUser.address.length) {
        throw new UnprocessableContentError('Địa chỉ không tồn tại');
    }
    currentUser.address = newAddressList;
    const savedUser = await currentUser.save();
    return savedUser.address;
};

const getUserDiscountCode = async (currentUser) => {
    await currentUser.populate('discountCode');
    return currentUser.discountCode;
};

const addUserDiscountCode = async (discountCode, currentUser) => {
    const existedDiscountCode = await DiscountCode.findOne({ code: discountCode, disabled: false }).lean();
    if (!existedDiscountCode) {
        throw new UnprocessableContentError('Mã giảm giá không tồn tại');
    }
    if (existedDiscountCode.endDate < Date.now()) {
        throw new InvalidDataError('Mã giảm giá Đã hết hạn');
    }
    if (existedDiscountCode.isUsageLimit) {
        if (existedDiscountCode.used >= existedDiscountCode.usageLimit) {
            throw new InvalidDataError('Mã giảm giá đã được sử dụng hết');
        }
    }
    if (currentUser.discountCode.indexOf(existedDiscountCode._id) != -1) {
        throw new InvalidDataError('Mã giảm giá đã tồn tại trong danh sách mã giảm giá của bạn');
    }
    currentUser.discountCode.push(existedDiscountCode._id);
    const savedUser = await currentUser.save();
    await savedUser.populate('discountCode');
    return savedUser.discountCode;
};

const UserService = {
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
export default UserService;
