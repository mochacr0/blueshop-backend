import { InvalidDataError } from './errors.js';
import { validationResult } from 'express-validator';

const validateRequest = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
};

const validateProductRequest = async (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.files && req.files.length > 0) {
            await req.files.map(async (image) => {
                fs.unlink(image.path, (error) => {
                    if (error) {
                        throw new InternalServerError(error);
                    }
                });
            });
        }
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
};

export { validateRequest, validateProductRequest };
