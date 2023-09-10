import { PathNotFoundError } from '../utils/errors.js';

const notFound = (req, res, next) => {
    next(new PathNotFoundError(`Not found - ${req.originalUrl}`));
};

// const errorHandler = (err, req, res, next) => {
//     const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
//     const message = err.message || 'Something went wrong';
//     console.log(err);
//     if (statusCode == 500) {
//         // console.log(err);
//         res.status(500).json({
//             message: 'Xảy ra lỗi khi xử lý phía máy chủ',
//             stack: process.env.NODE_ENV === 'production' ? null : err.stack,
//         });
//     } else {
//         res.status(statusCode).json({
//             message: message,
//             stack: process.env.NODE_ENV === 'production' ? null : err.stack,
//         });
//     }
// };

const errorHandler = (err, req, res, next) => {
    console.log(err);
    let statusCode;
    try {
        statusCode = err.getStatusCode();
    } catch (error) {
        statusCode = 500;
    }
    if (statusCode == null || statusCode == undefined) {
        statusCode = 500;
    }
    const message = err.message || 'Something went wrong';
    if (statusCode == 500) {
        res.status(500).json({
            message: 'Xảy ra lỗi khi xử lý phía máy chủ',
            stack: process.env.NODE_ENV === 'production' ? null : err.stack,
        });
    } else {
        res.status(statusCode).json({
            message: message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack,
        });
    }
};

export { notFound, errorHandler };
