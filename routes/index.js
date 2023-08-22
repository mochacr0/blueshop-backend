import ImportData from './DataImport.js';
import productRouter from './product.route.js';
import userRouter from './user.route.js';
import orderRouter from './order.route.js';
import bannerRouter from './banner.route.js';
import cartRouter from './cart.route.js';
import categoryRouter from './category.route.js';
import discountCodeRouter from './discountCode.route.js';
import deliveryRouter from './delivery.route.js';
import testRouter from './test.route.js';
import commonRouter from './common.router.js';
const routes = (app) => {
    app.use('/api/v1/banners', bannerRouter);
    app.use('/api/v1/carts', cartRouter);
    app.use('/api/v1/categories', categoryRouter);
    app.use('/api/v1/deliveries', deliveryRouter);
    app.use('/api/v1/discount-codes', discountCodeRouter);
    app.use('/api/v1/imports', ImportData);
    app.use('/api/v1/orders', orderRouter);
    app.use('/api/v1/products', productRouter);
    app.use('/api/v1/users', userRouter);
    app.use('/api/v1/common', commonRouter);
    app.use('/api/v1/tests', testRouter);
};
export default routes;
