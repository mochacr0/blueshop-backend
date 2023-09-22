const getClientUrl = () => {
    if (process.env.NODE_ENV == 'development') {
        return process.env.CLIENT_PAGE_DEVELOPMENT_URL;
    } else {
        return process.env.CLIENT_PAGE_PRODUCTION_URL;
    }
};

const getHostUrl = (req) => {
    const urlObject = new URL(`${req.protocol}://${req.get('host')}`);
    return urlObject?.origin;
};

export { getClientUrl, getHostUrl };
