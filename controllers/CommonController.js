import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, auth } from '../middleware/auth.middleware.js';
import CommonService from '../services/CommonService.js';
const CommonController = express.Router();
CommonController.get('/summary', protect, auth('staff', 'admin'), asyncHandler(CommonService.summary));
export default CommonController;
