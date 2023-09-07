import express from 'express';
import asyncHandler from 'express-async-handler';
import { auth, protect } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import CategoryService from '../services/CategoryService.js';
import { multerUpload } from '../utils/multer.js';
import { validateRequest } from '../utils/validateRequest.js';

const CategoryController = express.Router();

CategoryController.get(
    '/get-category-tree',
    asyncHandler(async (req, res) => {
        res.json(await CategoryService.getCategoryTree());
    }),
);

CategoryController.get(
    '/:id',
    validate.getCategoryById,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        const categoryId = req.params.id || '';
        res.json(await CategoryService.getCategoryById(categoryId));
    }),
);

CategoryController.get(
    '/',
    asyncHandler(async (req, res) => {
        const { level } = req.query;
        res.json(await CategoryService.getCategories(level));
    }),
);

CategoryController.post(
    '/',
    multerUpload.single('imageFile'),
    validate.createCategory,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const createCategoryRequest = {
            name: req.body.name,
            level: req.body.level,
            parent: req.body.parent,
            description: req.body.description,
            children: req.body.children ? JSON.parse(req.body.children) : [],
            imageFile: req.body.imageFile ? JSON.parse(req.body.imageFile) : '',
        };
        res.json(await CategoryService.createCategory(createCategoryRequest));
    }),
);

CategoryController.put(
    '/:id',
    multerUpload.single('imageFile'),
    validate.updateCategory,
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        validateRequest(req);
        const categoryId = req.params.id || null;
        const updateCategoryRequest = {
            name: req.body.name,
            description: req.body.description,
            level: req.body.level,
            image: req.body.image,
            parent: req.body.parent,
            updatedVersion: req.body.updatedVersion,
            imageFile: req.body.imageFile ? JSON.parse(req.body.imageFile) : '',
        };
        res.json(await CategoryService.updateCategory(categoryId, updateCategoryRequest));
    }),
);

CategoryController.delete(
    '/:id',
    protect,
    auth('staff', 'admin'),
    asyncHandler(async (req, res) => {
        const categoryId = req.params.id || null;
        res.json(await CategoryService.deleteCategory(categoryId));
    }),
);

export default CategoryController;
