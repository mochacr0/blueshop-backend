import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import userController from '../services/UserService.js';
import validate from '../middleware/validate.middleware.js';
import { passportGoogleConfig } from '../config/oauth2.google.config.js';
import passport from 'passport';
import generateAuthToken from '../utils/generateToken.js';

const userRouter = express.Router();
passportGoogleConfig(passport);

userRouter.get('/profile', protect, asyncHandler(userController.getProfile));
userRouter.get('/', protect, auth('staff', 'admin'), asyncHandler(userController.getUsersByAdmin));
userRouter.post('/login', validate.login, asyncHandler(userController.login));
userRouter.post('/refresh-token', asyncHandler(userController.refreshToken));
userRouter.post('/register', validate.register, asyncHandler(userController.register));
userRouter.put('/profile', validate.updateProfile, protect, asyncHandler(userController.updateProfile));
userRouter.post(
    '/address/add-user-address',
    validate.userAddress,
    protect,
    asyncHandler(userController.createUserAddress),
);
userRouter.put(
    '/address/:id/update-user-address',
    validate.userAddress,
    protect,
    asyncHandler(userController.updateUserAddress),
);
userRouter.delete('/address/:id/remove-user-address', protect, asyncHandler(userController.removeUserAddress));
userRouter.get('/address/get-user-address-list', protect, asyncHandler(userController.getUserAddress));
userRouter.get('/discount-code/get-user-discount-code-list', protect, asyncHandler(userController.getUserDiscountCode));
userRouter.post(
    '/discount-code/user-add-discount-code',
    validate.addUserDiscountCode,
    protect,
    auth('user'),
    asyncHandler(userController.addUserDiscountCode),
);
userRouter.patch('/auth/verify-email', asyncHandler(userController.verifyEmail));
userRouter.patch('/auth/cancel-verify-email', asyncHandler(userController.cancelVerifyEmail));
userRouter.patch(
    '/auth/change-password',
    validate.changePassword,
    protect,
    asyncHandler(userController.changePassword),
);
userRouter.patch('/auth/forgot-password', validate.forgotPassword, asyncHandler(userController.forgotPassword));
userRouter.patch('/auth/reset-password', validate.resetPassword, asyncHandler(userController.resetPassword));
userRouter.patch('/auth/cancel-reset-password', asyncHandler(userController.cancelResetPassword));
userRouter.get('/oauth2/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
userRouter.get('/login/oauth2/code/google', passport.authenticate('google', { session: false }), (req, res, next) => {
    console.log(req);
    res.redirect(
        `${process.env.CLIENT_PAGE_URL}?accessToken=${req.user.accessToken}&refreshToken=${req.user.refreshToken}&expiresIn=${req.user.expiresIn}`,
    );
});
export default userRouter;
