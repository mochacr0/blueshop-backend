import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import categoryController from '../controllers/category.controller.js';
import validate from '../middleware/validate.middleware.js';
import { multerUpload } from '../utils/multer.js';

const categoryRouter = express.Router();

categoryRouter.get('/get-category-tree', asyncHandler(categoryController.getCategoryTree));
categoryRouter.get(
    '/:id',
    validate.getCategoryById,
    protect,
    auth('staff', 'admin'),
    asyncHandler(categoryController.getCategoryById),
);
categoryRouter.get('/', asyncHandler(categoryController.getCategories));
categoryRouter.post(
    '/',
    multerUpload.single('imageFile'),
    validate.createCategory,
    protect,
    auth('staff', 'admin'),
    asyncHandler(categoryController.createCategory),
);
categoryRouter.put(
    '/:id',
    multerUpload.single('imageFile'),
    validate.updateCategory,
    protect,
    auth('staff', 'admin'),
    asyncHandler(categoryController.updateCategory),
);
categoryRouter.delete('/:id', protect, auth('staff', 'admin'), asyncHandler(categoryController.deleteCategory));

export default categoryRouter;
