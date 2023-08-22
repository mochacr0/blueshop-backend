import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { stringify } from 'querystring';

dotenv.config();

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            required: false,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
            enum: ['admin', 'staff', 'user'],
            default: 'user',
        },
        avatar: {
            type: String,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
            default: 'other',
        },
        birthday: {
            type: Date,
        },
        address: [
            {
                name: { type: String },
                phone: { type: String },
                province: {
                    id: { type: Number },
                    name: { type: String },
                },
                district: {
                    id: { type: Number },
                    name: { type: String },
                },
                ward: {
                    id: { type: Number },
                    name: { type: String },
                },
                specificAddress: {
                    type: String,
                },
                isDefault: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        discountCode: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DiscountCode',
            },
        ],
        emailVerificationToken: {
            type: String,
            required: false,
        },
        isVerified: {
            type: Boolean,
            required: false,
            default: false,
        },
        resetPasswordToken: {
            type: String,
            required: false,
        },
        resetPasswordTokenExpiryTime: {
            type: Number,
            required: false,
        },
        updatedVersion: {
            type: Number,
            default: 0,
        },
        disabled: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

// Login
userSchema.methods.matchPassword = async function (enterPassword) {
    return await bcrypt.compare(enterPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
    const resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetPasswordToken).digest('hex');
    this.resetPasswordTokenExpiryTime = Date.now() + process.env.RESET_PASSWORD_EXPIRY_TIME_IN_MINUTE * 60 * 1000;
    return resetPasswordToken;
};

userSchema.methods.getEmailVerificationToken = function () {
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
    return emailVerificationToken;
};

// Register
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;
