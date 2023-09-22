import { PAYMENT_WITH_MOMO, PAYMENT_WITH_ATM, PAYMENT_WITH_CREDIT_CARD } from '../utils/paymentConstants.js';

const MomoMethod = {
    [PAYMENT_WITH_MOMO]: 'captureWallet',
    [PAYMENT_WITH_ATM]: 'payWithATM',
    [PAYMENT_WITH_CREDIT_CARD]: 'payWithCC',
};

function parseMethodFromString(value) {
    validateMomoMethod(value);
    return MomoMethod[value];
}

function validateMomoMethod(value) {
    return MomoMethod.hasOwnProperty(value);
}

export { MomoMethod, parseMethodFromString, validateMomoMethod };
