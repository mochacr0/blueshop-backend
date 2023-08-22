import mongoose from 'mongoose';
import * as fs from 'fs';
import Category from '../models/category.model.js';
import Product from '../models/product.model.js';
import { check, validationResult } from 'express-validator';
import { cloudinaryUpload, cloudinaryRemove } from '../utils/cloudinary.js';
import { ObjectId } from 'mongodb';
import slug from 'slug';

const getCategories = async (req, res) => {
    const level = req.query.level;
    const filter = {};
    if (level) {
        filter.level = level;
    }
    const categories = await Category.find(filter).sort({ _id: -1 }).lean();
    return res.json({ message: 'Success', data: { categories } });
};
const getCategoryTree = async (req, res) => {
    const categories = await Category.find({ level: 1 }).populate('children').sort({ _id: -1 }).lean();
    return res.json({ message: 'Success', data: { categories } });
};
const getCategoryById = async (req, res) => {
    const categoryId = req.params.id || '';

    const category = await Category.findOne({ _id: categoryId }).populate('children', 'parent').lean();
    if (!category) {
        res.status(404);
        throw new Error('Danh mục không tồn tại');
    }
    return res.json({ message: 'Success', data: { category: category } });
};
const createCategory = async (req, res, next) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { name, level, parent, description } = req.body;
    const children = req.body.children ? JSON.parse(req.body.children) : [];
    const imageFile = req.body.imageFile ? JSON.parse(req.body.imageFile) : '';
    const categoryExists = await Category.exists({ name: name.trim() });
    if (categoryExists) {
        res.status(400);
        throw new Error('Danh mục đã tồn tại');
    }

    //generate slug
    let generatedSlug = slug(name);
    const existSlug = await Category.exists({ slug: generatedSlug });
    if (existSlug) {
        generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
    }

    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    try {
        await session.withTransaction(async () => {
            const category = new Category({
                name: name.trim(),
                slug: generatedSlug,
                level,
                description: description || '',
            });

            let parentCategory;
            if (category.level > 1) {
                if (!parent || parent.trim() === '') {
                    await session.abortTransaction();
                    res.status(400);
                    throw new Error('Nếu danh mục có cấp độ lớn hơn 1 thì phải chọn danh mục mẹ');
                }

                parentCategory = await Category.findOne({ _id: parent });
                if (!parentCategory) {
                    await session.abortTransaction();
                    res.status(404);
                    throw new Error('Danh mục mẹ không tồn tại');
                }
                if (parentCategory.level >= category.level) {
                    await session.abortTransaction();
                    res.status(400);
                    throw new Error('Danh mục mẹ phải có cấp độ nhỏ hơn cấp độ danh mục muốn tạo');
                }
                category.parent = parentCategory._id;
                parentCategory.children.push(category._id);
            } else {
                category.parent = category._id;
            }

            if (children && children.length > 0) {
                let childrenCategory = [];
                await Promise.all(
                    children.map(async (item) => {
                        const childrenCategoryExists = await Category.exists({ name: item.name.trim() });
                        if (childrenCategoryExists) {
                            await session.abortTransaction();
                            res.status(400);
                            throw new Error('Danh mục đã tồn tại');
                        }
                        //generate slug
                        let generatedSlug = slug(item.name);
                        const existSlug = await Category.exists({ slug: generatedSlug });
                        if (existSlug) {
                            generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
                        }
                        const newChildrenCategory = new Category({
                            name: item.name.trim(),
                            slug: generatedSlug,
                            parent: category._id,
                            level: Number(level) + 1,
                            description: item.description || '',
                        });
                        await newChildrenCategory.save({ session });
                        childrenCategory.push(newChildrenCategory._id);
                    }),
                );
                category.children = childrenCategory;
            }
            let imageUrl = '';
            if (imageFile && imageFile.trim() !== '') {
                const uploadImage = await cloudinaryUpload(imageFile, 'FashionShop/categories');
                if (!uploadImage) {
                    await session.abortTransaction();
                    res.status(502);
                    throw new Error('Xảy ra lỗi trong quá trình đăng tải hình ảnh danh mục');
                }
                imageUrl = uploadImage.secure_url;
                category.image = imageUrl;
            }

            const newCategory = await (await category.save({ session })).populate('children');
            if (parentCategory) {
                await parentCategory.save({ session });
            }
            res.status(201).json({ message: 'Thêm danh mục thành công', data: { newCategory } });
        }, transactionOptions);
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

const updateCategory = async (req, res, next) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const categoryId = req.params.id || null;

    //find category by id
    const currentCategory = await Category.findOne({ _id: categoryId });
    if (!currentCategory) {
        res.status(404);
        throw new Error('Danh mục không tồn tại');
    }

    const { name, description, level, image, parent, updatedVersion } = req.body;
    const imageFile = req.body.imageFile ? JSON.parse(req.body.imageFile) : '';
    let newParentCat, currentParentCat;
    if (currentCategory.updatedVersion != updatedVersion) {
        res.status(400);
        throw new Error('Danh mục vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất');
    }
    currentCategory.updatedVersion = Number(currentCategory.updatedVersion) + 1;
    if (currentCategory.name != name.trim()) {
        //check the existence of the category
        const categoryExists = await Category.exists({ name: name.trim() });
        if (categoryExists) {
            res.status(400);
            throw new Error('Danh mục đã tồn tại');
        }
        currentCategory.name = name.trim();
        //generate slug
        let generatedSlug = slug(name);
        const existSlug = await Category.exists({ slug: generatedSlug });
        if (existSlug) {
            generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
        }
        currentCategory.slug = generatedSlug;
    }
    currentCategory.description = description;
    if (currentCategory.parent != parent || currentCategory.level != level) {
        currentCategory.level = level || currentCategory.level;

        // check parent category
        newParentCat = await Category.findOne({ _id: parent });
        if (!newParentCat) {
            res.status(404);
            throw new Error('Danh mục mẹ không tồn tại');
        }
        if (
            newParentCat.level > currentCategory.level ||
            (newParentCat.level == currentCategory.level &&
                (newParentCat._id != currentCategory._id || currentCategory.level > 1))
        ) {
            res.status(400);
            throw new Error('Danh mục mẹ phải có cấp độ nhỏ hơn cấp độ danh mục muốn cập nhật');
        }

        if (currentCategory.parent !== parent) {
            //delete children category in parent category
            currentParentCat = await Category.findById(currentCategory.parent);
            if (currentParentCat) {
                let index = currentParentCat.children.indexOf(currentCategory._id);
                if (index !== -1) {
                    currentParentCat.children.splice(index, 1);
                }
            }
            if (newParentCat._id.toString() != currentCategory._id.toString()) {
                newParentCat.children.push(currentCategory._id);
            }
            currentCategory.parent = newParentCat._id;
        }
    }

    let imageUrl = '';
    if (imageFile && imageFile.trim() !== '' && currentCategory.image != imageFile) {
        const uploadImage = await cloudinaryUpload(imageFile, 'FashionShop/categories');
        if (!uploadImage) {
            throw new Error('Some category image were not uploaded due to an unknown error');
        }
        imageUrl = uploadImage.secure_url;
    } else if (image && image.trim() !== '' && currentCategory.image != image) {
        const uploadImage = await cloudinaryUpload(image, 'FashionShop/categories');
        if (!uploadImage) {
            throw new Error('Some category image were not uploaded due to an unknown error');
        }
        imageUrl = uploadImage.secure_url;
    }
    if (imageUrl.length > 0) {
        currentCategory.image = imageUrl;
        let url = currentCategory.image;
        const publicId = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
        await cloudinaryRemove('FashionShop/categories/' + publicId);
    }

    const updateCategory = await currentCategory.save();
    if (newParentCat) {
        await newParentCat.save();
    }
    if (currentParentCat) {
        await currentParentCat.save();
    }
    res.status(200).json({ message: 'Cập nhật danh mục thành công', data: { updateCategory } });
};
const deleteCategory = async (req, res) => {
    const categoryId = req.params.id || null;

    const category = await Category.findOne({ _id: categoryId });
    if (!category) {
        res.status(404);
        throw new Error('Danh mục không tồn tại');
    }

    if (category.children.length > 0) {
        res.status(400);
        throw new Error('Danh mục danh tồn tại danh mục con. không thể xóa được');
    }

    const categoryInProduct = await Product.exists({ category: category._id });
    if (categoryInProduct) {
        res.status(400);
        throw new Error('Đang tồn tại sản phẩm có thể loại là danh mục này. không thể xóa được');
    }
    let parentCat;
    if (category.parent && category._id.toString() != category.parent.toString()) {
        parentCat = await Category.findById(category.parent);
        if (parentCat) {
            let index = parentCat.children.indexOf(category._id);
            if (index !== -1) {
                parentCat.children.splice(index, 1);
            }
        }
    }
    if (!category.image && category.image.length > 0) {
        let url = category.image;
        const publicId = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
        await cloudinaryRemove('FashionShop/categories/' + publicId);
    }
    await category.remove();
    if (parentCat) {
        await parentCat.save();
    }
    res.status(200).json({ message: 'Xóa danh mục thành công' });
};

const categoryController = {
    createCategory,
    getCategories,
    getCategoryTree,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
export default categoryController;
