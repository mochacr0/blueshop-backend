import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import ProductService from '../services/ProductService.js';
import { multerUpload } from '../utils/multer.js';
import validate from '../middleware/validate.middleware.js';

const ProductController = express.Router();
ProductController.get('/slug/:slug', asyncHandler(ProductService.getProductBySlug));
ProductController.get('/search', asyncHandler(ProductService.getProductSearchResults));
ProductController.get('/recommend', asyncHandler(ProductService.getProductRecommend));
ProductController.get(
    '/all-products',
    protect,
    auth('staff', 'admin'),
    asyncHandler(ProductService.getAllProductsByAdmin),
);
ProductController.get('/admin', protect, auth('staff', 'admin'), asyncHandler(ProductService.getProductsByAdmin));
ProductController.get('/:id', validate.getProductById, asyncHandler(ProductService.getProductById));
ProductController.get('/', asyncHandler(ProductService.getProducts));
ProductController.post(
    '/',
    multerUpload.array('imageFile'),
    validate.createProduct,
    protect,
    auth('staff', 'admin'),
    asyncHandler(ProductService.createProduct),
);
ProductController.post(
    '/:id/review',
    validate.review,
    protect,
    auth('user'),
    asyncHandler(ProductService.reviewProduct),
);
ProductController.put(
    '/:id',
    multerUpload.array('imageFile'),
    validate.updateProduct,
    protect,
    auth('staff', 'admin'),
    asyncHandler(ProductService.updateProduct),
);
ProductController.patch(
    '/:id/hide',
    validate.hide,
    protect,
    auth('staff', 'admin'),
    asyncHandler(ProductService.hideProduct),
);
ProductController.patch(
    '/:id/unhide',
    validate.unhide,
    protect,
    auth('staff', 'admin'),
    asyncHandler(ProductService.unhideProduct),
);
ProductController.patch(
    '/:id/restore',
    validate.restore,
    protect,
    auth('staff', 'admin'),
    asyncHandler(ProductService.restoreProduct),
);
ProductController.delete(
    '/:id',
    validate.delete,
    protect,
    auth('staff', 'admin'),
    asyncHandler(ProductService.deleteProduct),
);
export default ProductController;
