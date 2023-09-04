import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import UserService from '../services/UserService.js';
import validate from '../middleware/validate.middleware.js';
import { passportGoogleConfig } from '../config/oauth2.google.config.js';
import passport from 'passport';
import generateAuthToken from '../utils/generateToken.js';

const UserController = express.Router();
passportGoogleConfig(passport);

UserController.get('/profile', protect, asyncHandler(UserService.getProfile));
UserController.get('/', protect, auth('staff', 'admin'), asyncHandler(UserService.getUsersByAdmin));
UserController.post('/login', validate.login, asyncHandler(UserService.login));
UserController.post('/refresh-token', asyncHandler(UserService.refreshToken));
UserController.post('/register', validate.register, asyncHandler(UserService.register));
UserController.put('/profile', validate.updateProfile, protect, asyncHandler(UserService.updateProfile));
UserController.post(
    '/address/add-user-address',
    validate.userAddress,
    protect,
    asyncHandler(UserService.createUserAddress),
);
UserController.put(
    '/address/:id/update-user-address',
    validate.userAddress,
    protect,
    asyncHandler(UserService.updateUserAddress),
);
UserController.delete('/address/:id/remove-user-address', protect, asyncHandler(UserService.removeUserAddress));
UserController.get('/address/get-user-address-list', protect, asyncHandler(UserService.getUserAddress));
UserController.get(
    '/discount-code/get-user-discount-code-list',
    protect,
    asyncHandler(UserService.getUserDiscountCode),
);
UserController.post(
    '/discount-code/user-add-discount-code',
    validate.addUserDiscountCode,
    protect,
    auth('user'),
    asyncHandler(UserService.addUserDiscountCode),
);
UserController.patch('/auth/verify-email', asyncHandler(UserService.verifyEmail));
UserController.patch('/auth/cancel-verify-email', asyncHandler(UserService.cancelVerifyEmail));
UserController.patch(
    '/auth/change-password',
    validate.changePassword,
    protect,
    asyncHandler(UserService.changePassword),
);
UserController.patch('/auth/forgot-password', validate.forgotPassword, asyncHandler(UserService.forgotPassword));
UserController.patch('/auth/reset-password', validate.resetPassword, asyncHandler(UserService.resetPassword));
UserController.patch('/auth/cancel-reset-password', asyncHandler(UserService.cancelResetPassword));
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
