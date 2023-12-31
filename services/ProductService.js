import mongoose from 'mongoose';
import slug from 'slug';
import Category from '../models/category.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import Variant from '../models/variant.model.js';
import { cloudinaryUpload } from '../utils/cloudinary.js';
import {
    InternalServerError,
    InvalidDataError,
    ItemNotFoundError,
    UnprocessableContentError,
} from '../utils/errors.js';
import { extractKeywords } from '../utils/extractKeywords.js';
import { priceRangeFilter, productQueryParams, ratingFilter, validateConstants } from '../utils/searchConstants.js';

const getProducts = async (pageParameter) => {
    const sortBy = validateConstants(productQueryParams, 'sort', pageParameter.sortBy || 'default');
    let statusFilter = validateConstants(productQueryParams, 'status', 'default');
    const keywordFilter = pageParameter.keyword
        ? {
              $text: {
                  //enclosed keyword will be treated as a phrase ($and) instead of individual words ($or)
                  $search: `\"${pageParameter.keyword}\"`,
                  $caseSensitive: false,
                  $diacriticSensitive: false,
              },
          }
        : {};
    const sort = pageParameter.keyword ? { score: { $meta: 'textScore' }, ...sortBy } : { ...sortBy };
    //Check if category existed
    let categoryIds = [];
    if (!pageParameter.category) {
        categoryIds = await Category.find({ disabled: false }).select({ _id: 1 }).lean();
    } else {
        const findCategory = await Category.findOne({ slug: pageParameter.category, disabled: false })
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
        ...keywordFilter,
        ...categoryFilter,
        ...statusFilter,
        ...priceRangeFilter(pageParameter.minPrice, pageParameter.maxPrice),
        ...ratingFilter(pageParameter.rating),
    };

    const count = await Product.countDocuments(productFilter);
    const paginationResult = { products: [], page: 0, pages: 0, total: 0 };
    //Check if product match keyword
    if (count != 0) {
        const products = await Product.find(productFilter)
            .limit(pageParameter.limit)
            .skip(pageParameter.limit * pageParameter.page)
            .sort({ ...sort })
            .populate('category')
            .populate('variants')
            .lean();
        paginationResult.products = products;
        paginationResult.page = pageParameter.page;
        paginationResult.pages = Math.ceil(count / pageParameter.limit);
        paginationResult.total = count;
    }
    return paginationResult;
};

const getProductsByAdmin = async (pageParameter) => {
    pageParameter.sortBy = validateConstants(
        productQueryParams,
        'sort',
        pageParameter.sortBy ? pageParameter.sortBy : 'newest',
    );
    let statusFilter = validateConstants(productQueryParams, 'status', pageParameter.status);

    pageParameter.keyword = pageParameter.keyword
        ? {
              $or: [
                  {
                      name: {
                          $regex: pageParameter.keyword,
                          $options: 'i',
                      },
                  },
                  {
                      slug: {
                          $regex: pageParameter.keyword,
                          $options: 'i',
                      },
                  },
                  {
                      keywords: {
                          $elemMatch: {
                              $eq: pageParameter.keyword,
                          },
                      },
                  },
              ],
          }
        : {};

    //Check if category existed
    let categoryIds = [];
    if (!pageParameter.category) {
        categoryIds = await Category.find({ disabled: false }).select({ _id: 1 }).lean();
    } else {
        const findCategory = await Category.findOne({ slug: pageParameter.category, disabled: false })
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
        ...pageParameter.keyword,
        ...categoryFilter,
        ...statusFilter,
        ...priceRangeFilter(pageParameter.minPrice, pageParameter.maxPrice),
        ...ratingFilter(pageParameter.rating),
    };
    const count = await Product.countDocuments(productFilter);
    const paginationResult = { products: [], page: 0, pages: 0, total: 0 };
    //Check if product match keyword
    if (count != 0) {
        const products = await Product.find(productFilter)
            .limit(pageParameter.limit)
            .skip(pageParameter.limit * pageParameter.page)
            .sort(pageParameter.sortBy)
            .populate('category')
            .populate('variants')
            .lean();
        paginationResult.products = products;
        paginationResult.page = pageParameter.page;
        paginationResult.pages = Math.ceil(count / pageParameter.limit);
        paginationResult.total = count;
    }
    return paginationResult;
};

const getProductSearchResults = async (searchParamter) => {
    searchParamter.keyword = searchParamter.keyword
        ? {
              $or: [
                  {
                      name: {
                          $regex: searchParamter.keyword,
                          $options: 'i',
                      },
                  },
                  {
                      slug: {
                          $regex: searchParamter.keyword,
                          $options: 'i',
                      },
                  },
              ],
          }
        : {};
    const productFilter = {
        ...searchParamter.keyword,
    };
    return await Product.find(productFilter).limit(searchParamter.limit).select('name').lean();
};

const getProductRecommend = async (searchParamter) => {
    const sortBy = validateConstants(productQueryParams, 'sort', 'default');
    let statusFilter = validateConstants(productQueryParams, 'status', 'default');
    let category = null;
    if (searchParamter.productId) {
        const product = await Product.findOne({ _id: searchParamter.productId });
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
    let recommendResult = { products: [], page: 0, pages: 0, total: 0 };
    //Check if product match keyword
    if (count != 0) {
        const products = await Product.find(productFilter)
            .limit(searchParamter.limit)
            .skip(searchParamter.limit * searchParamter.page)
            .sort(sortBy)
            .populate('category')
            .populate('variants')
            .lean();
        recommendResult.products = products;
        recommendResult.page = searchParamter.page;
        recommendResult.pages = Math.ceil(count / searchParamter.limit);
        recommendResult.total = count;
    }
    return recommendResult;
};

const getAllProductsByAdmin = async (req, res) => {
    return await Product.find().sort({ createdAt: -1 }).lean();
};

const getProductBySlug = async (slug) => {
    const product = await Product.findOne({ slug: slug }).populate(['variants', 'category']).lean();
    if (!product) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại');
    }
    return product;
};

const getProductById = async (productId) => {
    const product = await Product.findOne({ _id: productId }).populate(['variants', 'category']).lean();
    if (!product) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại');
    }
    return product;
};

const createProduct = async (request) => {
    const findProduct = Product.exists({ name: request.name });
    const findCategory = Category.findOne({ _id: request.category }).lean();
    const [existedProduct, existedCategory] = await Promise.all([findProduct, findCategory]);
    if (existedProduct) {
        throw new InvalidDataError('Tên sản phẩm đã tồn tại');
    }
    if (!existedCategory) {
        throw new UnprocessableContentError('Thể loại không tồn tại');
    }

    const variantsValue = {};
    request.variants.forEach((variant) => {
        if (!variant.price) {
            throw new InvalidDataError('Giá của các sản phẩm không được để trống');
        }
        if (!variant.quantity) {
            throw new InvalidDataError('Số lượng của các sản phẩm không được để trống');
        }

        variant.price = parseInt(variant.price);
        variant.quantity = parseInt(variant.quantity);

        if (isNaN(variant.price) || variant.price < 0) {
            throw new InvalidDataError('Giá của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (isNaN(variant.quantity) || variant.quantity < 0) {
            throw new InvalidDataError('Sớ lượng của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (!variant.attributes) {
            throw new InvalidDataError('Danh sách thuộc tính các biến thể không được để trống');
        }
        variant.attributes.map((attr) => {
            if (!attr.name || attr.name.trim() == '') {
                throw new InvalidDataError('Tên các thuộc tính của biến thể sản phẩm không được để trống');
            }
            if (!attr.value || attr.value.trim() == '') {
                throw new InvalidDataError('Giá trị thuộc tính của các biến thể sản phẩm không được để trống');
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

    if (countVariant < request.variants.length) {
        throw new InvalidDataError('Giá trị của các biến thể không được trùng nhau');
    }
    //generate slug
    let generatedSlug = slug(request.name);
    const existSlug = await Product.exists({ slug: generatedSlug });
    if (existSlug) {
        generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
    }

    //Generate list keywords
    const generateKeywords = request.keywords || [];
    generateKeywords.push(existedCategory.name, existedCategory.slug, generatedSlug, request.brand);
    const extractKeywordsName = extractKeywords(request.name);
    generateKeywords.push(...extractKeywordsName);

    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    let newProduct;
    await session.withTransaction(async () => {
        const product = new Product({
            name: request.name,
            slug: generatedSlug,
            description: request.description,
            category: request.category,
            weight: request.weight,
            length: request.length,
            height: request.height,
            width: request.height,
            brand: request.brand,
            keywords: request.keywords,
        });
        if (request.variants && request.variants.length > 0) {
            let totalQuantity = 0;
            let minPrice = 0;
            let minPriceSale = -1;

            const variantIds = [];
            const createVariant = request.variants.map(async (variant) => {
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
            if (request.imageFile && request.imageFile.length > 0) {
                const uploadListImage = request.imageFile.map(async (image) => {
                    const uploadImage = await cloudinaryUpload(image, 'FashionShop/products');
                    if (!uploadImage) {
                        throw new InternalServerError('Xảy ra lỗi trong quá trình đăng tải hình ảnh sản phẩm');
                    }
                    return uploadImage.secure_url;
                });
                const imageList = await Promise.all(uploadListImage);
                images.push(...imageList);
            }
            if (images.length === 0) {
                throw new InvalidDataError('Thiếu hình ảnh. Vui lòng đăng tải ít nhất 1 hình ảnh');
            }
            product.images = images;
            product.variants = variantIds;
            product.price = minPrice;
            product.priceSale = minPriceSale;
            product.quantity = totalQuantity;
        }
        newProduct = await (await product.save({ session })).populate('variants');
    }, transactionOptions);
    session.endSession();
    return newProduct;
};

const updateProduct = async (productId, request) => {
    //Check variants value
    const variantsValue = {};
    let count = 0;
    request.variants.forEach((variant) => {
        if (!variant.price) {
            throw new InvalidDataError('Giá của các sản phẩm không được để trống');
        }
        if (!variant.quantity) {
            throw new InvalidDataError('Số lượng của các sản phẩm không được để trống');
        }

        variant.price = parseInt(variant.price);
        variant.quantity = parseInt(variant.quantity);

        if (isNaN(variant.price) || variant.price < 0) {
            throw new InvalidDataError('Giá của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (isNaN(variant.quantity) || variant.quantity < 0) {
            throw new InvalidDataError('Sớ lượng của các sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0');
        }
        if (!variant.attributes) {
            throw new InvalidDataError('Danh sách thuộc tính các biến thể không được để trống');
        }
        variant.attributes.map((attr) => {
            if (!attr.name || attr.name.trim() == '') {
                throw new InvalidDataError('Tên các thuộc tính của biến thể sản phẩm không được để trống');
            }
            if (!attr.value || attr.value.trim() == '') {
                throw new InvalidDataError('Giá trị thuộc tính của các biến thể sản phẩm không được để trống');
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
    if (countVariant < count) {
        throw new InvalidDataError('Giá trị của các biến thể không được trùng nhau');
    }

    const currentProduct = await Product.findOne({ _id: productId });
    if (!currentProduct) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại');
    }
    if (currentProduct.updatedVersion != request.updatedVersion) {
        throw new UnprocessableContentError(
            'Sản phẩm vừa được cập nhật thông tin, vui lòng làm mới lại trang để lấy thông tin mới nhất',
        );
    }
    currentProduct.updatedVersion = Number(currentProduct.updatedVersion) + 1;
    const session = await mongoose.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
    };
    let updatedProduct;
    await session.withTransaction(async () => {
        //update product
        const generateKeywords = request.keywords || [];

        if (currentProduct.name != request.name) {
            const existedProduct = await Product.exists({ name: request.name });
            if (existedProduct) {
                throw new InvalidDataError('Tên sản phẩm đã tồn tại');
            }
            currentProduct.name = request.name;
            //generate slug
            let generatedSlug = slug(request.name);
            const existSlug = await Product.exists({ slug: generatedSlug });
            if (existSlug) {
                generatedSlug = generatedSlug + '-' + Math.round(Math.random() * 10000).toString();
            }
            currentProduct.slug = generatedSlug;
            const extractKeywordsName = extractKeywords(request.name);
            generateKeywords.push(...extractKeywordsName, generatedSlug);
        } else {
            const extractKeywordsName = extractKeywords(currentProduct.name);
            generateKeywords.push(...extractKeywordsName, currentProduct.slug);
        }
        if (currentProduct.category != request.category) {
            const existedCategory = await Category.findById(request.category).lean();
            if (!existedCategory) {
                throw new UnprocessableContentError('Thể loại không tồn tại');
            }
            currentProduct.category = existedCategory._id;
            generateKeywords.push(existedCategory.name, existedCategory.slug);
        } else {
            generateKeywords.push(currentProduct.category.name, currentProduct.category.slug);
        }
        generateKeywords.push(request.brand);
        currentProduct.description = request.description || currentProduct.description;
        currentProduct.brand = request.brand || currentProduct.brand;
        currentProduct.keywords = generateKeywords || currentProduct.keywords;

        //update variant
        const oldVariantsId = currentProduct.variants;

        const updateVariantsId = [];
        let totalQuantity = 0;
        let minPrice = 0;
        let minPriceSale = -1;
        const variantUpdates = request.variants.map(async (variant) => {
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
                        throw new UnprocessableContentError(`Mã biến thể"${variant._id}" cần cập nhật không tồn tại`);
                    } else {
                        variantUpdate.attributes = variant.attributes || variantUpdate.attributes;
                        variantUpdate.price = variant.price || variantUpdate.price;
                        variantUpdate.priceSale = variant.priceSale || variantUpdate.priceSale;
                        variantUpdate.quantity = variant.quantity || variantUpdate.quantity;
                        await variantUpdate.save({ session });
                        updateVariantsId.push(variantUpdate._id);
                    }
                }
            } else if (variant.status == -1) {
                if (oldVariantsId.indexOf(variant._id) != -1) {
                    const variantUpdate = await Variant.findById(variant._id);
                    if (!variantUpdate) {
                        throw new UnprocessableContentError(`Mã biến thể"${variant._id}" cần xóa không tồn tại`);
                    }
                    await variantUpdate.remove({ session });
                } else {
                    throw new InvalidDataError(
                        `Mã biến thể "${variant._id}" cần xóa không thuộc danh sách các biến thể của sản phẩm này`,
                    );
                }
            } else {
                throw new InvalidDataError('Tồn tại biến thể sản phẩm không hợp lệ');
            }
        });
        await Promise.all(variantUpdates);
        currentProduct.variants = updateVariantsId;
        currentProduct.price = minPrice;
        currentProduct.priceSale = minPriceSale;
        currentProduct.quantity = totalQuantity;
        currentProduct.weight = request.weight;
        currentProduct.length = request.length;
        currentProduct.height = request.height;
        currentProduct.width = request.width;
        // upload image to cloundinary
        const updateImages = request.images || [];
        if (request.imageFile && request.imageFile.length > 0) {
            const uploadListImage = request.imageFile.map(async (image) => {
                const uploadImage = await cloudinaryUpload(image, 'FashionShop/products');
                if (!uploadImage) {
                    throw new InternalServerError('Xảy ra lỗi trong quá trình đăng tải hình ảnh sản phẩm');
                }
                return uploadImage.secure_url;
            });
            const imageList = await Promise.all(uploadListImage);
            updateImages.push(...imageList);
        }
        if (updateImages.length === 0) {
            throw new InvalidDataError('Thiếu hình ảnh. Vui lòng đăng tải ít nhất 1 hình ảnh của sản phẩm');
        }
        currentProduct.images = updateImages;
        updatedProduct = await (await currentProduct.save({ session })).populate(['variants', 'category']);
    }, transactionOptions);
    session.endSession();
    return updatedProduct;
};

const reviewProduct = async (productId, request, currentUser) => {
    const product = await Product.findOne({ _id: productId });
    if (!product) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại');
    }
    const order = await Order.findOne({
        user: currentUser._id,
        status: 'completed',
        'orderItems.product': product._id,
        'orderItems.isAbleToReview': true,
    });
    if (!order) {
        throw new InvalidDataError('Bạn cần mua sản phẩm này để có thể đánh giá nó');
    }
    order.orderItems.map((orderItem, index) => {
        if (orderItem.product.toString() == product._id.toString()) {
            order.orderItems[index].isAbleToReview = false;
        }
    });
    const review = {
        name: currentUser.name,
        rating: Number(request.rating),
        content: String(request.content),
        user: currentUser._id,
    };
    product.reviews.push(review);
    product.rating =
        product.reviews.reduce((previousValue, currentReview) => previousValue + currentReview.rating, 0) /
        product.reviews.length;

    await Promise.all([product.save(), order.save()]);
    return 'Đánh giá thành công';
};

const hideProduct = async (productId) => {
    const disabledProduct = await Product.findOneAndUpdate({ _id: productId }, { disabled: true });
    if (!disabledProduct) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại!');
    }
    await Variant.updateMany({ product: productId }, { $set: { disabled: true } });
    return 'Ẩn sản phẩm thành công';
};

const unhideProduct = async (productId) => {
    const disabledProduct = await Product.findOneAndUpdate({ _id: productId }, { disabled: false });
    if (!disabledProduct) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại!');
    }
    await Variant.updateMany({ product: productId }, { $set: { disabled: false } });

    return 'Bỏ ẩn sản phẩm thành công';
};

const restoreProduct = async (productId) => {
    const deletedProduct = await Product.findOneAndUpdate({ _id: productId }, { deleted: false });
    if (!deletedProduct) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại');
    }
    await Variant.updateMany({ product: productId }, { $set: { deleted: false } });
    return 'Khôi phục sản phẩm thành công';
};

const deleteProduct = async (productId) => {
    const deletedProduct = await Product.findOneAndUpdate({ _id: productId }, { deleted: true });
    if (!deletedProduct) {
        throw new ItemNotFoundError('Sản phẩm không tồn tại');
    }
    await Variant.updateMany({ product: productId }, { $set: { deleted: true } });
    return 'Xóa sản phẩm thành công. Bạn có thể khôi phục trong vòng 30 ngày trước khi sản phẩm này bị xóa hoàn toàn';
};

const ProductService = {
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
export default ProductService;
