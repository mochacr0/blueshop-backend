import jwt from 'jsonwebtoken';
const generateToken = (payload, secret, options) => {
    return jwt.sign(payload, secret, options);
};
const generateAuthToken = (id) => {
    const accessToken = generateToken({ _id: id }, process.env.ACCESS_JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN_MINUTE * 60 + 's',
    });
    const refreshToken = generateToken({ _id: id }, process.env.REFRESH_JWT_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN_MINUTE * 60 + 's',
    });
    const currentDate = new Date();
    return {
        accessToken,
        refreshToken,
        expiresIn: new Date(currentDate.getTime() + process.env.REFRESH_TOKEN_EXPIRES_IN_MINUTE * 60 * 1000),
    };
};
export default generateAuthToken;
