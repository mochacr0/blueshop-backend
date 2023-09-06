import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import slug from 'slug';
import Category from '../models/category.model.js';
import Product from '../models/product.model.js';
import { cloudinaryRemove, cloudinaryUpload } from '../utils/cloudinary.js';
import {
    InternalServerError,
    InvalidDataError,
    ItemNotFoundError,
    UnprocessableContentError,
} from '../utils/errors.js';

const getCategories = async (level) => {
    const filter = {};
    if (level) {
        filter.level = level;
    }
    return await Category.find(filter).sort({ _id: -1 }).lean();
};

const getCategoryTree = async () => {
    return await Category.find({ level: 1 }).populate('children').sort({ _id: -1 }).lean();
};

const getCategoryById = async (categoryId) => {
    const category = await Category.findOne({ _id: categoryId }).populate('children', 'parent').lean();
    if (!category) {
        throw new ItemNotFoundError('Danh mục không tồn tại');
    }
    return category;
};

const createCategory = async (request) => {
    const categoryExists = await Category.exists({ name: request.name.trim() });
    if (categoryExists) {
        throw new InvalidDataError('Danh mục đã tồn tại');
    }

    //generate slug
    let generatedSlug = slug(request.name);
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
    let newCategory;
    await session.withTransaction(async () => {
        const category = new Category({
            name: request.name.trim(),
            slug: generatedSlug,
            level: request.level,
            description: request.description || '',
        });

        let parentCategory;
        if (category.level > 1) {
            if (!request.parent || request.parent.trim() === '') {
                throw new InvalidDataError('Nếu danh mục có cấp độ lớn hơn 1 thì phải chọn danh mục mẹ');
            }

            parentCategory = await Category.findOne({ _id: request.parent });
            if (!parentCategory) {
                throw new UnprocessableContentError('Danh mục mẹ không tồn tại');
            }
            if (parentCategory.level >= category.level) {
                throw new InvalidDataError('Danh mục mẹ phải có cấp độ nhỏ hơn cấp độ danh mục muốn tạo');
            }
            category.parent = parentCategory._id;
            parentCategory.children.push(category._id);
        } else {
            category.parent = category._id;
        }

        if (request.children && request.children.length > 0) {
            let childrenCategory = [];
            await Promise.all(
                request.children.map(async (item) => {
                    const childrenCategoryExists = await Category.exists({ name: item.name.trim() });
                    if (childrenCategoryExists) {
                        throw new InvalidDataError('Danh mục đã tồn tại');
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
                        level: Number(request.level) + 1,
                        description: item.description || '',
                    });
                    await newChildrenCategory.save({ session });
                    childrenCategory.push(newChildrenCategory._id);
                }),
            );
            category.children = childrenCategory;
        }
        let imageUrl = '';
        if (request.imageFile && request.imageFile.trim() !== '') {
            const uploadImage = await cloudinaryUpload(request.imageFile, 'FashionShop/categories');
            if (!uploadImage) {
                throw new InternalServerError('Xảy ra lỗi trong quá trình đăng tải hình ảnh danh mục');
            }
            imageUrl = uploadImage.secure_url;
            category.image = imageUrl;
        }
        newCategory = await (await category.save({ session })).populate('children');
        if (parentCategory) {
            await parentCategory.save({ session });
        }
    }, transactionOptions);
    session.endSession();
    return newCategory;
};

const updateCategory = async (categoryId, request) => {
    //find category by id
    const currentCategory = await Category.findOne({ _id: categoryId });
    if (!currentCategory) {
        throw new ItemNotFoundError('Danh mục không tồn tại');
    }

    let newParentCat, currentParentCat;
    if (currentCategory.updatedVersion != request.updatedVersion) {
        throw new InvalidDataError(
            'Danh mục vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất',
        );
    }
    currentCategory.updatedVersion = Number(currentCategory.updatedVersion) + 1;
    if (currentCategory.name != request.name.trim()) {
        //check the existence of the category
        const categoryExists = await Category.exists({ name: request.name.trim() });
        if (categoryExists) {
            throw new InvalidDataError('Danh mục đã tồn tại');
        }
        currentCategory.name = request.name.trim();
        //generate slug
        let generatedSlug = slug(request.name);
        const existSlug = await Category.exists({ slug: generatedSlug });
        if (existSlug) {
            generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
        }
        currentCategory.slug = generatedSlug;
    }
    currentCategory.description = request.description;
    if (currentCategory.parent != request.parent || currentCategory.level != request.level) {
        currentCategory.level = request.level || currentCategory.level;

        // check parent category
        newParentCat = await Category.findOne({ _id: request.parent });
        if (!newParentCat) {
            throw new UnprocessableContentError('Danh mục mẹ không tồn tại');
        }
        if (
            newParentCat.level > currentCategory.level ||
            (newParentCat.level == currentCategory.level &&
                (newParentCat._id != currentCategory._id || currentCategory.level > 1))
        ) {
            throw new InvalidDataError('Danh mục mẹ phải có cấp độ nhỏ hơn cấp độ danh mục muốn cập nhật');
        }

        if (currentCategory.parent !== request.parent) {
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
    if (request.imageFile && request.imageFile.trim() !== '' && currentCategory.image != request.imageFile) {
        const uploadImage = await cloudinaryUpload(request.imageFile, 'FashionShop/categories');
        if (!uploadImage) {
            throw new InternalServerError('Xảy ra lỗi khi upload ảnh');
        }
        imageUrl = uploadImage.secure_url;
    } else if (request.image && request.image.trim() !== '' && currentCategory.image != request.image) {
        const uploadImage = await cloudinaryUpload(request.image, 'FashionShop/categories');
        if (!uploadImage) {
            throw new InternalServerError('Xảy ra lỗi khi upload ảnh');
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
    return updateCategory;
};

const deleteCategory = async (categoryId) => {
    const category = await Category.findOne({ _id: categoryId });
    if (!category) {
        throw new ItemNotFoundError('Danh mục không tồn tại');
    }

    if (category.children.length > 0) {
        throw new InvalidDataError('Danh mục danh tồn tại danh mục con. không thể xóa được');
    }

    const categoryInProduct = await Product.exists({ category: category._id });
    if (categoryInProduct) {
        throw new InvalidDataError('Đang tồn tại sản phẩm có thể loại là danh mục này. không thể xóa được');
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
    if (category.image && category.image.length > 0) {
        let url = category.image;
        const publicId = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
        await cloudinaryRemove('FashionShop/categories/' + publicId);
    }
    await category.remove();
    if (parentCat) {
        await parentCat.save();
    }
    return 'Xóa danh mục thành công';
};

const CategoryService = {
    createCategory,
    getCategories,
    getCategoryTree,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
export default CategoryService;
