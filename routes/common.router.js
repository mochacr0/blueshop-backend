import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import commonController from '../controllers/common.controller.js';
const commonRouter = express.Router();
commonRouter.get('/summary', protect, auth('staff', 'admin'), asyncHandler(commonController.summary));
export default commonRouter;
