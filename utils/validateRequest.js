import { InvalidDataError } from './errors.js';
import { validationResult } from 'express-validator';

const validateRequest = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        throw new InvalidDataError(message);
    }
};

export default validateRequest;
