import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import ProductService from '../services/ProductService.js';
import { multerUpload } from '../utils/multer.js';
import validate from '../middleware/validate.middleware.js';
import { validateProductRequest, validateRequest } from '../utils/validateRequest.js';

const ProductController = express.Router();

ProductController.get(
    '/slug/:slug',
    asyncHandler(async (req, res) => {
        const slug = req.params.slug.toString().trim() || '';
        res.json(await ProductService.getProductBySlug(slug));
    }),
);

ProductController.get(
    '/search',
    asyncHandler(async (req, res) => {
        const searchParamter = {
            limit: Number(req.query.limit) || 12,
            keyword: req.query.keyword,
        };
        res.json(await ProductService.getProductSearchResults(searchParamter));
    }),
);

ProductController.get(
    '/recommend',
    asyncHandler(async (req, res) => {
        const searchParamter = {
            limit: parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 12,
            page: parseInt(req.query.page) >= 0 ? parseInt(req.query.page) : 0,
            productId: req.query.id || '',
        };
        res.json(await ProductService.getProductRecommend(searchParamter));
    }),
);

ProductController.get(
    '/all-products',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        res.json(await ProductService.getAllProductsByAdmin());
    }),
);

ProductController.get(
    '/admin',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        const pageParameter = {
            limit: parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 1,
            rating: parseInt(req.query.rating) >= 0 && parseInt(req.query.rating) <= 5 ? parseInt(req.query.rating) : 0,
            maxPrice: parseInt(req.query.maxPrice) >= 0 ? parseInt(req.query.maxPrice) : null,
            minPrice: parseInt(req.query.minPrice) >= 0 ? parseInt(req.query.minPrice) : null,
            page: parseInt(req.query.page) >= 0 ? parseInt(req.query.page) : 0,
            status: req.query.status || null,
            sortBy: req.query.sortBy || null,
            keyword: req.query.keyword,
            category: req.query.category || null,
        };
        res.json(await ProductService.getProductsByAdmin(pageParameter));
    }),
);

ProductController.get(
    '/:id',
    validate.getProductById,
    asyncHandler(async (req, res) => {
        const productId = req.params.id;
        res.json(await ProductService.getProductById(productId));
    }),
);

ProductController.get(
    '/',
    asyncHandler(async (req, res) => {
        const pageParameter = {
            limit: parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 12,
            rating: parseInt(req.query.rating) >= 0 && parseInt(req.query.rating) <= 5 ? parseInt(req.query.rating) : 0,
            maxPrice: parseInt(req.query.maxPrice) >= 0 ? parseInt(req.query.maxPrice) : null,
            minPrice: parseInt(req.query.minPrice) >= 0 ? parseInt(req.query.minPrice) : null,
            page: parseInt(req.query.page) >= 0 ? parseInt(req.query.page) : 0,
            status: req.query.status || null,
            sortBy: req.query.sortBy || null,
            keyword: req.query.keyword,
            category: req.query.category || null,
        };
        res.json(await ProductService.getProducts(pageParameter));
    }),
);

ProductController.post(
    '/',
    multerUpload.array('imageFile'),
    validate.createProduct,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateProductRequest(req);
        const createProductRequest = {
            name: req.body.name,
            description: req.body.description,
            category: req.body.category,
            brand: req.body.brand,
            weight: req.body.weight,
            length: req.body.length,
            height: req.body.height,
            width: req.body.height,
            variants: JSON.parse(req.body.variants) || [],
            keywords: JSON.parse(req.body.keywords) || [],
            imageFile: req.body.imageFile ? JSON.parse(req.body.imageFile) : [],
        };
        res.json(await ProductService.createProduct(createProductRequest));
    }),
);

ProductController.post(
    '/:id/review',
    validate.review,
    protect,
    auth('user'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const productId = req.params.id || '';
        const reviewRequest = {
            rating: req.body.rating,
            content: req.body.content,
        };
        res.json(await ProductService.reviewProduct(productId, reviewRequest, req.user));
    }),
);

ProductController.put(
    '/:id',
    multerUpload.array('imageFile'),
    validate.updateProduct,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateProductRequest(req);
        const productId = req.params.id || null;
        const updateProductRequest = {
            name: req.body.name,
            description: req.body.description,
            category: req.body.category,
            brand: req.body.brand,
            weight: req.body.weight,
            length: req.body.length,
            height: req.body.height,
            width: req.body.width,
            updatedVersion: req.body.updatedVersion,
            variants: JSON.parse(req.body.variants) || [],
            keywords: JSON.parse(req.body.keywords) || [],
            images: JSON.parse(req.body.images) || [],
            imageFile: req.body.imageFile ? JSON.parse(req.body.imageFile) : [],
        };
        res.json(await ProductService.updateProduct(productId, updateProductRequest));
    }),
);
ProductController.patch(
    '/:id/hide',
    validate.hide,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const productId = req.params.id || null;
        res.json(await ProductService.hideProduct(productId));
    }),
);

ProductController.patch(
    '/:id/unhide',
    validate.unhide,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const productId = req.params.id || null;
        res.json(await ProductService.unhideProduct(productId));
    }),
);

ProductController.patch(
    '/:id/restore',
    validate.restore,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const productId = req.params.id || null;
        res.json(await ProductService.restoreProduct(productId));
    }),
);

ProductController.delete(
    '/:id',
    validate.delete,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        const productId = req.params.id || null;
        res.json(await ProductService.deleteProduct(productId));
    }),
);

export default ProductController;
