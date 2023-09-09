const getClientUrl = () => {
    if (process.env.NODE_ENV == 'development') {
        return process.env.CLIENT_PAGE_DEVELOPMENT_URL;
    } else {
        return process.env.CLIENT_PAGE_PRODUCTION_URL;
    }
};

const getHostUrl = (req) => {
    const hostUrl = `https://${req.get('host')}`;
    return hostUrl;
    // console.log('urlObject', urlObject);
    // console.log('protocol', req.protocol);
    // return urlObject.origin; //http://localhost:5000
};

export { getClientUrl, getHostUrl };
