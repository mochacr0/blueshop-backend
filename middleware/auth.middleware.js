import jwt, { decode } from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import Token from '../models/token.model.js';
import { UnauthorizedError, UnauthenticatedError } from '../utils/errors.js';

const protect = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.ACCESS_JWT_SECRET);
            const userId = decoded._id || null;
            // const user = await User.findOne({ _id: userId, isVerified: true }).select('-password');
            const verifyToken = await Token.findOne({ user: userId, accessToken: token }).populate({
                path: 'user',
                select: '-password',
            });

            if (!verifyToken || !verifyToken.user) {
                throw new UnauthorizedError('Not authorized, token failed');
            }
            req.user = verifyToken.user;
            return next();
        } catch (error) {
            console.log(error);
            throw new UnauthorizedError('Not authorized, token failed');
        }
    } else {
        throw new UnauthorizedError('Not authorized, no token');
    }
});

const getUserData = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.ACCESS_JWT_SECRET);
            const userId = decoded._id || null;
            // const user = await User.findOne({ _id: userId, isVerified: true }).select('-password');
            const verifyToken = await Token.findOne({ user: userId, accessToken: token }).populate({
                path: 'user',
                select: '-password',
            });

            if (verifyToken && verifyToken.user) {
                req.user = verifyToken.user;
            }
            return next();
        } catch (error) {
            return next();
        }
    } else {
        return next();
    }
});
// const protect = asyncHandler(async (req, res, next) => {
//     let token;
//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//         try {
//             token = req.headers.authorization.split(' ')[1];
//             const decoded = jwt.verify(token, process.env.ACCESS_JWT_SECRET);
//             const userId = decoded._id || null;
//             req.user = await User.findOne({ _id: userId, isVerified: true }).select('-password');
//             next();
//         } catch (error) {
//             res.status(401);
//             throw new Error('Not authorized, token failed');
//         }
//     }
//     if (!token) {
//         res.status(401);
//         throw new Error('Not authorized, no token');
//     }
// });

const auth =
    (...acceptedRoles) =>
    (req, res, next) => {
        const index = acceptedRoles.indexOf(req.user.role);
        if (index != -1) {
            next();
        } else {
            throw new UnauthenticatedError('Forbidden');
        }
    };
export { protect, auth, getUserData };
