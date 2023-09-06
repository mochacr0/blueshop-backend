import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import CategoryService from '../services/CategoryService.js';
import validate from '../middleware/validate.middleware.js';
import { multerUpload } from '../utils/multer.js';

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
    asyncHandler(CategoryService.getCategoryById),
);
CategoryController.get('/', asyncHandler(CategoryService.getCategories));
CategoryController.post(
    '/',
    multerUpload.single('imageFile'),
    validate.createCategory,
    protect,
    auth('staff', 'admin'),
    asyncHandler(CategoryService.createCategory),
);
CategoryController.put(
    '/:id',
    multerUpload.single('imageFile'),
    validate.updateCategory,
    protect,
    auth('staff', 'admin'),
    asyncHandler(CategoryService.updateCategory),
);
CategoryController.delete('/:id', protect, auth('staff', 'admin'), asyncHandler(CategoryService.deleteCategory));

export default CategoryController;
