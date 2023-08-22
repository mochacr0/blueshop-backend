import * as fs from 'fs';
import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import Category from '../models/category.model.js';
import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';
import Variant from '../models/variant.model.js';
import { productQueryParams, validateConstants, priceRangeFilter, ratingFilter } from '../utils/searchConstants.js';
import { cloudinaryUpload, cloudinaryRemove } from '../utils/cloudinary.js';
import { Result, validationResult } from 'express-validator';
import slug from 'slug';
import { extractKeywords } from '../utils/extractKeywords.js';

const getProducts = async (req, res) => {
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 12;
    const rating = parseInt(req.query.rating) >= 0 && parseInt(req.query.rating) <= 5 ? parseInt(req.query.rating) : 0;
    const maxPrice = parseInt(req.query.maxPrice) >= 0 ? parseInt(req.query.maxPrice) : null;
    const minPrice = parseInt(req.query.minPrice) >= 0 ? parseInt(req.query.minPrice) : null;
    let page = parseInt(req.query.page) >= 0 ? parseInt(req.query.page) : 0;
    const sortBy = validateConstants(productQueryParams, 'sort', req.query.sortBy || 'default');
    let statusFilter = validateConstants(productQueryParams, 'status', 'default');
    const keyword = req.query.keyword
        ? {
              $text: {
                  $search: req.query.keyword,
                  // $language: 'en',
                  $caseSensitive: false,
                  $diacriticSensitive: false,
              },
          }
        : {};
    const sort = req.query.keyword ? { ...sortBy, score: { $meta: 'textScore' } } : { ...sortBy };
    // const keyword = req.query.keyword
    //     ? {
    //           $or: [
    //               {
    //                   name: {
    //                       $regex: req.query.keyword,
    //                       $options: 'i',
    //                   },
    //               },
    //               {
    //                   slug: {
    //                       $regex: req.query.keyword,
    //                       $options: 'i',
    //                   },
    //               },

    //               {
    //                   keywords: {
    //                       $elemMatch: {
    //                           $eq: req.query.keyword,
    //                       },
    //                   },
    //               },
    //           ],
    //       }
    //     : {};
    //Check if category existed
    let categoryName = req.query.category || null;
    let categoryIds = [];
    if (!categoryName) {
        categoryIds = await Category.find({ disabled: false }).select({ _id: 1 }).lean();
    } else {
        const findCategory = await Category.findOne({ slug: categoryName, disabled: false })
            .select({
                _id: 1,
                children: 1,
            })
            .lean();
        if (findCategory) {
            categoryIds.push(findCategory._id, ...findCategory.children);
        }
    }
    const categoryFilter = categoryIds.length > 0 ? { category: categoryIds } : {};

    const productFilter = {
        ...keyword,
        ...categoryFilter,
        ...statusFilter,
        ...priceRangeFilter(minPrice, maxPrice),
        ...ratingFilter(rating),
    };

    const count = await Product.countDocuments(productFilter);
    //Check if product match keyword
    if (count == 0) {
        res.status(200).json({
            message: 'Success',
            data: { products: [], page: 0, pages: 0, total: 0 },
        });
    }
    //else
    const products = await Product.find(productFilter)
        .limit(limit)
        .skip(limit * page)
        .sort({ ...sort })
        .populate('category')
        .populate('variants')
        .lean();

    res.json({
        message: 'Success',
        data: { products, page, pages: Math.ceil(count / limit), total: count },
    });
};

const getProductsByAdmin = async (req, res) => {
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 12;
    const rating = parseInt(req.query.rating) >= 0 && parseInt(req.query.rating) <= 5 ? parseInt(req.query.rating) : 0;
    const maxPrice = parseInt(req.query.maxPrice) >= 0 ? parseInt(req.query.maxPrice) : null;
    const minPrice = parseInt(req.query.minPrice) >= 0 ? parseInt(req.query.minPrice) : null;
    let page = parseInt(req.query.page) >= 0 ? parseInt(req.query.page) : 0;
    const status = req.query.status || null;
    let sortBy = req.query.sortBy || null;
    sortBy = validateConstants(productQueryParams, 'sort', sortBy ? sortBy : 'newest');
    let statusFilter = validateConstants(productQueryParams, 'status', status);

    const keyword = req.query.keyword
        ? {
              $or: [
                  {
                      name: {
                          $regex: req.query.keyword,
                          $options: 'i',
                      },
                  },
                  {
                      slug: {
                          $regex: req.query.keyword,
                          $options: 'i',
                      },
                  },
                  {
                      keywords: {
                          $elemMatch: {
                              $eq: req.query.keyword,
                          },
                      },
                  },
              ],
          }
        : {};

    //Check if category existed
    let categoryName = req.query.category || null;
    let categoryIds = [];
    if (!categoryName) {
        categoryIds = await Category.find({ disabled: false }).select({ _id: 1 }).lean();
    } else {
        const findCategory = await Category.findOne({ slug: categoryName, disabled: false })
            .select({
                _id: 1,
                children: 1,
            })
            .lean();
        if (findCategory) {
            categoryIds.push(findCategory._id, ...findCategory.children);
        }
    }
    const categoryFilter = categoryIds.length > 0 ? { category: categoryIds } : {};

    const productFilter = {
        ...keyword,
        ...categoryFilter,
        ...statusFilter,
        ...priceRangeFilter(minPrice, maxPrice),
        ...ratingFilter(rating),
    };
    const count = await Product.countDocuments(productFilter);
    //Check if product match keyword
    if (count == 0) {
        res.status(200).json({
            message: 'Success',
            data: { products: [], page: 0, pages: 0, total: 0 },
        });
    }
    //else
    const products = await Product.find(productFilter)
        .limit(limit)
        .skip(limit * page)
        .sort(sortBy)
        .populate('category')
        .populate('variants')
        .lean();
    res.status(200).json({
        message: 'Success',
        data: { products, page, pages: Math.ceil(count / limit), total: count },
    });
};
const getProductSearchResults = async (req, res) => {
    const limit = Number(req.query.limit) || 12; //EDIT HERE
    const keyword = req.query.keyword
        ? {
              $or: [
                  {
                      name: {
                          $regex: req.query.keyword,
                          $options: 'i',
                      },
                  },
                  {
                      slug: {
                          $regex: req.query.keyword,
                          $options: 'i',
                      },
                  },
              ],
          }
        : {};
    const productFilter = {
        ...keyword,
    };
    const keywords = await Product.find(productFilter).limit(limit).select('name').lean();
    res.status(200).json({ message: 'Success', data: { keywords } });
};

const getProductRecommend = async (req, res) => {
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 12;
    let page = parseInt(req.query.page) >= 0 ? parseInt(req.query.page) : 0;
    const sortBy = validateConstants(productQueryParams, 'sort', 'default');
    let statusFilter = validateConstants(productQueryParams, 'status', 'default');
    const productId = req.query.id || '';
    let category = null;
    if (productId) {
        const product = await Product.findOne({ _id: productId });
        if (product) {
            category = product.category;
        }
    }
    let categoryIds = [];
    if (!category) {
        categoryIds = await Category.find({ disabled: false }).select({ _id: 1 }).lean();
    } else {
        const findCategory = await Category.findOne({ _id: category, disabled: false })
            .select({
                _id: 1,
                children: 1,
            })
            .lean();
        if (findCategory) {
            categoryIds.push(findCategory._id, ...findCategory.children);
        }
    }
    const categoryFilter = categoryIds.length > 0 ? { category: categoryIds } : {};

    const productFilter = {
        ...categoryFilter,
        ...statusFilter,
    };

    const count = await Product.countDocuments(productFilter);
    //Check if product match keyword
    if (count == 0) {
        res.status(200).json({
            message: 'Success',
            data: { products: [], page: 0, pages: 0, total: 0 },
        });
    }
    //else
    const products = await Product.find(productFilter)
        .limit(limit)
        .skip(limit * page)
        .sort(sortBy)
        .populate('category')
        .populate('variants')
        .lean();

    res.json({
        message: 'Success',
        data: { products, page, pages: Math.ceil(count / limit), total: count },
    });
};

// const getProductRecommend = async (req, res) => {
//     const limit = parseInt(req.query.limit) || 12;
//     const page = parseInt(req.query.page) || 0;
//     const status = validateConstants(productQueryParams, 'status', 'default');
//     // const sortBy = validateConstants(productQueryParams, 'sort', req.query.sortBy || 'newest');
//     const sortBy = { totalSale: -1 };
//     const productId = req.query.id || '';
//     let productName = null,
//         category = null;
//     if (productId) {
//         const product = await Product.findOne({ _id: productId });
//         if (product) {
//             productName = product.name;
//             category = product.category;
//         }
//     }
//     const keyword = productName
//         ? {
//               $text: {
//                   $search: productName,
//                   // $language: 'en',
//                   $caseSensitive: true,
//                   $diacriticSensitive: false,
//               },
//           }
//         : {};

//     const sort = productName ? { ...sortBy, score: { $meta: 'textScore' } } : { ...sortBy };

//     const productFilter = {
//         ...keyword,
//         ...status,
//     };
//     if (category) {
//         productFilter.category = category;
//     }
//     const count = await Product.countDocuments(productFilter);
//     //Check if product match keyword
//     if (count == 0) {
//         res.status(200).json({
//             message: 'Success',
//             data: { products: [], page: 0, pages: 0, total: 0 },
//         });
//     }
//     const products = await Product.aggregate([
//         { $match: { ...productFilter } },
//         { $sample: { size: count } },
//         { $sort: { ...sort } },
//         { $skip: limit * page },
//         { $limit: limit },
//         { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
//         { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
//         { $lookup: { from: 'variants', localField: 'variants', foreignField: '_id', as: 'variants' } },
//         { $addFields: { variants: { $ifNull: ['$variants', []] } } },
//     ])
//         // .limit(limit)
//         // .skip(limit * page)
//         // .sort({ sort })
//         .exec()
//         .then((results) => {
//             res.status(200).json({
//                 message: 'Success',
//                 data: { products: results, page, pages: Math.ceil(count / limit), total: count },
//             });
//         });
//     // .sort(sortBy)
//     // .populate('category')
//     // .populate('variants')
//     // .lean();
// };

const getAllProductsByAdmin = async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json({ message: 'Success', data: { products } });
};

const getProductBySlug = async (req, res) => {
    const slug = req.params.slug.toString().trim() || '';
    const product = await Product.findOne({ slug: slug }).populate(['variants', 'category']).lean();
    if (!product) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại');
    }
    res.status(200).json({ message: 'Success', data: { product } });
};

const getProductById = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const product = await Product.findOne({ _id: req.params.id }).populate(['variants', 'category']).lean();
    if (!product) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại');
    }
    res.status(200).json({ message: 'Success', data: { product } });
};

const createProduct = async (req, res, next) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.files && req.files.length > 0) {
            await req.files.map(async (image) => {
                fs.unlink(image.path, (error) => {
                    if (error) {
                        throw new Error(error);
                    }
                });
            });
        }
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    let { name, description, category, brand, weight, length, height, width } = req.body;
    const variants = JSON.parse(req.body.variants) || [];
    const keywords = JSON.parse(req.body.keywords) || [];
    const imageFile = req.body.imageFile ? JSON.parse(req.body.imageFile) : [];

    const findProduct = Product.exists({ name });
    const findCategory = Category.findOne({ _id: category }).lean();
    const [existedProduct, existedCategory] = await Promise.all([findProduct, findCategory]);
    if (existedProduct) {
        res.status(400);
        throw new Error('Tên sản phẩm đã tồn tại');
    }
    if (!existedCategory) {
        res.status(400);
        throw new Error('Thể loại không tồn tại');
    }

    const variantsValue = {};
    variants.map((variant) => {
        if (!variant.price) {
            res.status(400);
            throw new Error('Giá của các sản phẩm không được để trống');
        }
        if (Number(variant.price) == NaN) {
            res.status(400);
            throw new Error('Giá của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (!variant.quantity) {
            res.status(400);
            throw new Error('Giá của các sản phẩm không được để trống');
        }
        if (Number(variant.quantity) == NaN) {
            res.status(400);
            throw new Error('Giá của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (!variant.attributes) {
            res.status(400);
            throw new Error('Danh sách thuộc tính các biến thể không được để trống');
        }
        variant.attributes.map((attr) => {
            if (!attr.name || attr.name.trim() == '') {
                res.status(400);
                throw new Error('Tên các thuộc tính của biến thể sản phẩm không được để trống');
            }
            if (!attr.value || attr.value.trim() == '') {
                res.status(400);
                throw new Error('Giá trị thuộc tính của các biến thể sản phẩm không được để trống');
            }
            if (!variantsValue[`${attr.name}`]) {
                variantsValue[`${attr.name}`] = [];
            }
            variantsValue[`${attr.name}`].push(attr.value);
        });
    });
    const countVariant = Object.keys(variantsValue).reduce((accumulator, key) => {
        const variantsSet = new Set(variantsValue[key]);
        return accumulator * variantsSet.size;
    }, 1);
    if (countVariant < variants.length) {
        res.status(400);
        throw new Error('Giá trị của các biến thể không được trùng nhau');
    }
    //generate slug
    let generatedSlug = slug(name);
    const existSlug = await Product.exists({ slug: generatedSlug });
    if (existSlug) {
        generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
    }

    //Generate list keywords
    const generateKeywords = keywords || [];
    generateKeywords.push(existedCategory.name, existedCategory.slug, generatedSlug, brand);
    const extractKeywordsName = extractKeywords(name);
    generateKeywords.push(...extractKeywordsName);

    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    try {
        await session.withTransaction(async () => {
            const product = new Product({
                name,
                slug: generatedSlug,
                description,
                category,
                weight,
                length,
                height,
                width,
                brand,
                keywords,
            });
            if (variants && variants.length > 0) {
                let totalQuantity = 0;
                let minPrice = 0;
                let minPriceSale = -1;

                const variantIds = [];
                const createVariant = variants.map(async (variant) => {
                    if (!variant.priceSale) {
                        variant.priceSale = variant.price;
                    }
                    if (minPriceSale == -1) {
                        minPriceSale = variant.priceSale;
                        minPrice = variant.price;
                    }
                    if (minPriceSale > variant.priceSale) {
                        minPriceSale = variant.priceSale;
                        minPrice = variant.price;
                    }
                    totalQuantity += Number(variant.quantity);

                    const newVariant = new Variant({ product: product._id, ...variant });
                    await newVariant.save({ session });
                    variantIds.push(newVariant._id);
                });
                await Promise.all(createVariant);

                // upload image to cloundinary
                const images = [];
                if (imageFile && imageFile.length > 0) {
                    const uploadListImage = imageFile.map(async (image) => {
                        const uploadImage = await cloudinaryUpload(image, 'FashionShop/products');
                        if (!uploadImage) {
                            res.status(502);
                            throw new Error('Xảy ra lỗi trong quá trình đăng tải hình ảnh sản phẩm');
                        }
                        return uploadImage.secure_url;
                    });
                    const imageList = await Promise.all(uploadListImage);
                    images.push(...imageList);
                }
                if (images.length === 0) {
                    res.status(400);
                    throw new Error('Thiếu hình ảnh. Vui lòng đăng tải ít nhất 1 hình ảnh');
                }
                product.images = images;
                product.variants = variantIds;
                product.price = minPrice;
                product.priceSale = minPriceSale;
                product.quantity = totalQuantity;
            }
            const newProduct = await (await product.save({ session })).populate('variants');

            res.status(201).json({ message: 'Thêm sản phẩm thành công', data: { newProduct } });
        }, transactionOptions);
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

const updateProduct = async (req, res, next) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.files && req.files.length > 0) {
            await req.files.map(async (image) => {
                fs.unlink(image.path, (error) => {
                    if (error) {
                        throw new Error(error);
                    }
                });
            });
        }
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }

    const { name, description, category, brand, weight, length, height, width, updatedVersion } = req.body;

    const variants = JSON.parse(req.body.variants) || [];
    const keywords = JSON.parse(req.body.keywords) || [];
    const images = JSON.parse(req.body.images) || [];
    const imageFile = req.body.imageFile ? JSON.parse(req.body.imageFile) : [];
    //Check variants value
    const variantsValue = {};
    let count = 0;
    variants.map((variant) => {
        if (!variant.price) {
            res.status(400);
            throw new Error('Giá của các sản phẩm không được để trống');
        }
        if (Number(variant.price) == NaN) {
            res.status(400);
            throw new Error('Giá của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (!variant.quantity) {
            res.status(400);
            throw new Error('Giá của các sản phẩm không được để trống');
        }
        if (Number(variant.quantity) == NaN) {
            res.status(400);
            throw new Error('Giá của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (!variant.attributes) {
            res.status(400);
            throw new Error('Danh sách thuộc tính các biến thể không được để trống');
        }
        if (variant.status != -1) {
            variant.attributes.map((attr) => {
                if (!attr.name || attr.name.trim() == '') {
                    res.status(400);
                    throw new Error('Tên các thuộc tính của biến thể sản phẩm không được để trống');
                }
                if (!attr.value || attr.value.trim() == '') {
                    res.status(400);
                    throw new Error('Giá trị thuộc tính của các biến thể sản phẩm không được để trống');
                }
                if (!variantsValue[`${attr.name}`]) {
                    variantsValue[`${attr.name}`] = [];
                }
                variantsValue[`${attr.name}`].push(attr.value);
            });
            count++;
        }
    });
    const countVariant = Object.keys(variantsValue).reduce((accumulator, key) => {
        const variantsSet = new Set(variantsValue[key]);
        return accumulator * variantsSet.size;
    }, 1);
    if (countVariant < count) {
        res.status(400);
        throw new Error('Giá trị của các biến thể không được trùng nhau');
    }

    const currentProduct = await Product.findOne({ _id: req.params.id });
    if (!currentProduct) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại');
    }
    if (currentProduct.updatedVersion != updatedVersion) {
        res.status(400);
        throw new Error('Sản phẩm vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất');
    }
    currentProduct.updatedVersion = Number(currentProduct.updatedVersion) + 1;
    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    try {
        await session.withTransaction(async () => {
            //update product
            const generateKeywords = keywords || [];

            if (currentProduct.name != name) {
                const existedProduct = await Product.exists({ name });
                if (existedProduct) {
                    await session.abortTransaction();
                    res.status(400);
                    throw new Error('Tên sản phẩm đã tồn tại');
                }
                currentProduct.name = name;
                //generate slug
                let generatedSlug = slug(name);
                const existSlug = await Product.exists({ slug: generatedSlug });
                if (existSlug) {
                    generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
                }
                currentProduct.slug = generatedSlug;
                const extractKeywordsName = extractKeywords(name);
                generateKeywords.push(...extractKeywordsName, generatedSlug);
            } else {
                const extractKeywordsName = extractKeywords(currentProduct.name);
                generateKeywords.push(...extractKeywordsName, currentProduct.slug);
            }
            if (currentProduct.category != category) {
                const existedCategory = await Category.findById(category).lean();
                if (!existedCategory) {
                    await session.abortTransaction();
                    res.status(400);
                    throw new Error('Thể loại không tồn tại');
                }
                currentProduct.category = existedCategory._id;
                generateKeywords.push(existedCategory.name, existedCategory.slug);
            } else {
                generateKeywords.push(currentProduct.category.name, currentProduct.category.slug);
            }
            generateKeywords.push(brand);
            currentProduct.description = description || currentProduct.description;
            currentProduct.brand = brand || currentProduct.brand;
            currentProduct.keywords = generateKeywords || currentProduct.keywords;

            //update variant
            const oldVariantsId = currentProduct.variants;

            const updateVariantsId = [];
            let totalQuantity = 0;
            let minPrice = 0;
            let minPriceSale = -1;
            const variantUpdates = variants.map(async (variant) => {
                if (variant.status == 1 || variant.status == 0) {
                    if (!variant.priceSale) {
                        variant.priceSale = variant.price;
                    }

                    if (minPriceSale == -1) {
                        minPriceSale = variant.priceSale;
                        minPrice = variant.price;
                    }
                    if (minPriceSale > variant.priceSale) {
                        minPriceSale = variant.priceSale;
                        minPrice = variant.price;
                    }
                    totalQuantity += Number(variant.quantity);
                    if (variant.status == 1) {
                        const newVariant = new Variant({
                            product: currentProduct._id,
                            ...variant,
                        });
                        await newVariant.save({ session });
                        updateVariantsId.push(newVariant._id);
                    } else if (oldVariantsId.indexOf(variant._id) != -1) {
                        const variantUpdate = await Variant.findById(variant._id);
                        if (!variantUpdate) {
                            await session.abortTransaction();
                            res.status(404);
                            throw new Error(`Mã biến thể"${variant._id}" cần cập nhật không tồn tại`);
                        } else {
                            variantUpdate.attributes = variant.attributes || variantUpdate.attributes;
                            variantUpdate.price = variant.price || variantUpdate.price;
                            variantUpdate.priceSale = variant.priceSale || variantUpdate.priceSale;
                            // variantUpdate.image = variant.image || variantUpdate.image;
                            variantUpdate.quantity = variant.quantity || variantUpdate.quantity;
                            await variantUpdate.save({ session });
                            updateVariantsId.push(variantUpdate._id);
                        }
                    }
                } else if (variant.status == -1) {
                    if (oldVariantsId.indexOf(variant._id) != -1) {
                        const variantUpdate = await Variant.findById(variant._id);
                        if (!variantUpdate) {
                            await session.abortTransaction();
                            res.status(404);
                            throw new Error(`Mã biến thể"${variant._id}" cần xóa không tồn tại`);
                        }
                        await variantUpdate.remove({ session });
                    } else {
                        await session.abortTransaction();
                        res.status(400);
                        throw new Error(
                            `Mã biến thể "${variant._id}" cần xóa không thuộc danh sách các biến thể của sản phẩm này`,
                        );
                    }
                } else {
                    await session.abortTransaction();
                    res.status(400);
                    throw new Error('Tồn tại biến thể sản phẩm không hợp lệ');
                }
            });
            await Promise.all(variantUpdates);
            currentProduct.variants = updateVariantsId;
            currentProduct.price = minPrice;
            currentProduct.priceSale = minPriceSale;
            currentProduct.quantity = totalQuantity;
            currentProduct.weight = weight;
            currentProduct.length = length;
            currentProduct.height = height;
            currentProduct.width = width;
            // upload image to cloundinary
            const updateImages = images || [];
            if (imageFile && imageFile.length > 0) {
                const uploadListImage = imageFile.map(async (image) => {
                    const uploadImage = await cloudinaryUpload(image, 'FashionShop/products');
                    if (!uploadImage) {
                        res.status(502);
                        throw new Error('Xảy ra lỗi trong quá trình đăng tải hình ảnh sản phẩm');
                    }
                    return uploadImage.secure_url;
                });
                const imageList = await Promise.all(uploadListImage);
                updateImages.push(...imageList);
            }
            if (updateImages.length === 0) {
                await session.abortTransaction();
                res.status(400);
                throw new Error('Thiếu hình ảnh. Vui lòng đăng tải ít nhất 1 hình ảnh của sản phẩm');
            }
            currentProduct.images = updateImages;
            const updatedProduct = await (await currentProduct.save({ session })).populate(['variants', 'category']);

            res.status(200).json({ message: 'Cập nhật Sản phẩm thành công', data: { updatedProduct } });
        }, transactionOptions);
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

const reviewProduct = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const { rating, content } = req.body;
    const productId = req.params.id || '';
    const product = await Product.findOne({ _id: productId });
    if (!product) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại');
    }
    const order = await Order.findOne({
        user: req.user._id,
        status: 'completed',
        'orderItems.product': product._id,
        'orderItems.isAbleToReview': true,
    });
    if (!order) {
        res.status(400);
        throw new Error('Bạn cần mua sản phẩm này để có thể đánh giá nó');
    }
    order.orderItems.map((orderItem, index) => {
        if (orderItem.product.toString() == product._id.toString()) {
            order.orderItems[index].isAbleToReview = false;
        }
    });
    const review = {
        name: req.user.name,
        rating: Number(rating),
        content: String(content),
        user: req.user._id,
    };
    product.reviews.push(review);
    product.rating =
        product.reviews.reduce((previousValue, currentReview) => previousValue + currentReview.rating, 0) /
        product.reviews.length;

    await Promise.all([product.save(), order.save()]);

    res.status(201).json({ message: 'Đánh giá thành công' });
};
const hideProduct = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const productId = req.params.id || null;
    const disabledProduct = await Product.findOneAndUpdate({ _id: productId }, { disabled: true });
    if (!disabledProduct) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại!');
    }
    const disabledVariant = await Variant.updateMany({ product: productId }, { $set: { disabled: true } });

    res.status(200).json({ message: 'Ẩn sản phẩm thành công' });
};
const unhideProduct = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const productId = req.params.id || null;
    const disabledProduct = await Product.findOneAndUpdate({ _id: productId }, { disabled: false });
    if (!disabledProduct) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại!');
    }
    const disabledVariant = await Variant.updateMany({ product: productId }, { $set: { disabled: false } });

    res.status(200).json({ message: 'Bỏ ẩn sản phẩm thành công' });
};
const restoreProduct = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const productId = req.params.id || null;
    const deletedProduct = await Product.findOneAndUpdate({ _id: productId }, { deleted: false });
    if (!deletedProduct) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại');
    }
    const deletedVariant = await Variant.updateMany({ product: productId }, { $set: { deleted: false } });
    res.status(200).json({
        message: 'Khôi phục sản phẩm thành công',
    });
};
const deleteProduct = async (req, res) => {
    // Validate the request data using express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;
        return res.status(400).json({ message: message });
    }
    const productId = req.params.id || null;
    const deletedProduct = await Product.findOneAndUpdate({ _id: productId }, { deleted: true });
    if (!deletedProduct) {
        res.status(404);
        throw new Error('Sản phẩm không tồn tại');
    }
    const deletedVariant = await Variant.updateMany({ product: productId }, { $set: { deleted: true } });
    res.status(200).json({
        message:
            'Xóa sản phẩm thành công. Bạn có thể khôi phục trong vòng 30 ngày trước khi sản phẩm này bị xóa hoàn toàn',
    });
};

const productController = {
    getProductBySlug,
    getProductById,
    getProductSearchResults,
    getProducts,
    getProductRecommend,
    getAllProductsByAdmin,
    getProductsByAdmin,
    createProduct,
    updateProduct,
    reviewProduct,
    hideProduct,
    unhideProduct,
    restoreProduct,
    deleteProduct,
};
export default productController;
