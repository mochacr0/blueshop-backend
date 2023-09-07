import express from 'express';
import asyncHandler from 'express-async-handler';
import passport from 'passport';
import { passportGoogleConfig } from '../config/oauth2.google.config.js';
import { auth, protect } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import UserService from '../services/UserService.js';
import { validateRequest } from '../utils/validateRequest.js';

const UserController = express.Router();
passportGoogleConfig(passport);

UserController.get(
    '/profile',
    protect,
    asyncHandler(async (req, res) => {
        res.json(await UserService.getProfile(req.user._id));
    }),
);

UserController.get(
    '/',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        res.json(await UserService.getUsersByAdmin());
    }),
);

UserController.post(
    '/login',
    validate.login,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const { email, password } = req.body;
        res.json(await UserService.login(email, password));
    }),
);

UserController.post(
    '/refresh-token',
    asyncHandler(async (req, res) => {
        res.json(await UserService.refreshToken(req.body.refreshToken));
    }),
);

UserController.post(
    '/register',
    validate.register,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const registerRequest = {
            email: req.body.email,
            name: req.body.name,
            phone: req.body.phone,
            password: req.body.password,
        };
        await UserService.register(registerRequest);
        res.json('Đăng ký thành công');
    }),
);

UserController.put(
    '/profile',
    validate.updateProfile,
    protect,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        res.json(await UserService.updateProfile(req.user._id, req.body));
    }),
);

UserController.post(
    '/address/add-user-address',
    validate.userAddress,
    protect,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const createAddressRequest = {
            name: req.body.name,
            phone: req.body.phone,
            province: req.body.province,
            district: req.body.district,
            ward: req.body.ward,
            specificAddress: req.body.specificAddress,
            isDefault: req.body.isDefault,
        };
        res.json(await UserService.createUserAddress(createAddressRequest, req.user));
    }),
);

UserController.put(
    '/address/:id/update-user-address',
    validate.userAddress,
    protect,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const updateAddressRequest = {
            name: req.body.name,
            phone: req.body.phone,
            province: req.body.province,
            district: req.body.district,
            ward: req.body.ward,
            specificAddress: req.body.specificAddress,
            isDefault: req.body.isDefault,
        };
        res.json(await UserService.updateUserAddress(req.params.id, updateAddressRequest, req.user));
    }),
);

UserController.delete(
    '/address/:id/remove-user-address',
    protect,
    asyncHandler(async (req, res) => {
        const addressId = req.params.id || null;
        res.json(await UserService.removeUserAddress(addressId, req.user));
    }),
);

UserController.get(
    '/address/get-user-address-list',
    protect,
    asyncHandler(async (req, res) => {
        res.json(await UserService.getUserAddress(req.user));
    }),
);

UserController.get(
    '/discount-code/get-user-discount-code-list',
    protect,
    asyncHandler(async (req, res) => {
        res.json(await UserService.getUserDiscountCode(req.user));
    }),
);

UserController.post(
    '/discount-code/user-add-discount-code',
    validate.addUserDiscountCode,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        res.json(await UserService.addUserDiscountCode(req.body.discountCode, req.user));
    }),
);

UserController.patch(
    '/auth/verify-email',
    asyncHandler(async (req, res) => {
        res.json(await UserService.verifyEmail(req.query.emailVerificationToken));
    }),
);

UserController.patch(
    '/auth/cancel-verify-email',
    asyncHandler(async (req, res) => {
        res.json(await UserService.cancelVerifyEmail(req.query.emailVerificationToken));
    }),
);

UserController.patch(
    '/auth/change-password',
    validate.changePassword,
    protect,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const { currentPassword, newPassword } = req.body;
        res.json(await UserService.changePassword(currentPassword, newPassword, req.user));
    }),
);

UserController.patch(
    '/auth/forgot-password',
    validate.forgotPassword,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        res.json(await UserService.forgotPassword(req.body.email));
    }),
);

UserController.patch(
    '/auth/reset-password',
    validate.resetPassword,
    asyncHandler(async (req, res) => {
        validateRequest(req);
        res.json(await UserService.resetPassword(req.query.resetPasswordToken, req.body.newPassword));
    }),
);

// UserController.patch('/auth/cancel-reset-password', asyncHandler(UserService.cancelResetPassword));
UserController.get('/oauth2/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
UserController.get(
    '/login/oauth2/code/google',
    passport.authenticate('google', { session: false }),
    (req, res, next) => {
        console.log(req);
        res.redirect(
            `${process.env.CLIENT_PAGE_URL}?accessToken=${req.user.accessToken}&refreshToken=${req.user.refreshToken}&expiresIn=${req.user.expiresIn}`,
        );
    },
);

export default UserController;
