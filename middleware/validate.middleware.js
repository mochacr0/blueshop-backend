import { body, check, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';

const validate = {
    //====================Validate Banner==================
    createBanner: [
        check('title').trim().not().isEmpty().withMessage('Title is required'),
        check('type').custom((type) => {
            if (!type || type.trim() == '') {
                throw new Error('type is required');
            }
            if (type !== 'slider' && type !== 'banner') {
                throw new Error('type must be "slider" or "banner"');
            }
            return true;
        }),
    ],
    updateBanner: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID is not valid');
            }
            return true;
        }),
        check('title').trim().not().isEmpty().withMessage('Title is required'),
    ],

    //====================Validate Cart==================
    updateCartItem: [
        check('variantId').custom((variantId) => {
            if (!ObjectId.isValid(variantId)) {
                throw new Error('Variant ID is not valid');
            }
            return true;
        }),
        // .trim().not().isEmpty().withMessage('variantId is required'),
        check('quantity').custom((quantity) => {
            if (!quantity || quantity.trim() === '') {
                throw new Error('Quantity is required');
            }
            const _quantity = Number(quantity);
            if (!_quantity || _quantity <= 0) {
                throw new Error('The quantity must be an integer and must be greater than or equal to 0');
            }
            return true;
        }),
    ],
    addProductToCart: [
        check('variantId').custom((variantId) => {
            if (!ObjectId.isValid(variantId)) {
                throw new Error('Variant ID is not valid');
            }
            return true;
        }),
        check('quantity').custom((quantity) => {
            if (!quantity || quantity.trim() === '') {
                throw new Error('Quantity is required');
            }
            const _quantity = Number(quantity);
            if (!_quantity || _quantity <= 0) {
                throw new Error('The quantity must be an integer and must be greater than or equal to 0');
            }
            return true;
        }),
    ],
    removeCartItems: [
        check('variantIds').custom((variantIds) => {
            if (!variantIds || variantIds.length <= 0) {
                throw new Error('Variant ID is required');
            }
            variantIds.map((variant) => {
                if (!ObjectId.isValid(variant)) {
                    throw new Error('Variant ID: "' + variant + '" is not valid');
                }
            });
            return true;
        }),
    ],

    //====================Validate Category==================
    getCategoryById: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID không hợp lệ');
            }
            return true;
        }),
    ],
    createCategory: [
        check('name').trim().not().isEmpty().withMessage('Name is required'),
        check('level').custom((level) => {
            if (!level || String(level).trim() === '') {
                throw new Error('Level is required');
            }
            const _level = Number(level);
            if (!_level || _level < 1) {
                throw new Error('Level must be an integer and must be large or 1');
            }
            return true;
        }),
        // check('image').isURL().withMessage('URL image must be an url'),
        check('description').custom((description) => {
            if (description && typeof description != 'string') {
                throw new Error('Mô tả phải là kiểu chuỗi');
            }
            return true;
        }),
        check('parent').custom((parent) => {
            if (parent && !ObjectId.isValid(parent)) {
                throw new Error('Mã danh mục mẹ không hợp lệ');
            }
            return true;
        }),
        check('children').custom((children) => {
            if (children) {
                children = JSON.parse(children);
                if (children.length > 0) {
                    children.map((item) => {
                        if (!item.name) {
                            throw new Error('Tên của các danh mục con không được để trống');
                        }
                        if (typeof item.name != 'string') {
                            throw new Error('Tên của các danh mục con phải là kiểu chuỗi');
                        }
                        if (typeof item.description != 'string') {
                            throw new Error('Mô tả của các danh mục con phải là kiểu chuỗi');
                        }
                    });
                }
            }
            return true;
        }),
    ],
    updateCategory: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('Category ID is not valid');
            }
            return true;
        }),
        check('name').trim().not().isEmpty().withMessage('Name is required'),
        check('level').custom((level) => {
            if (!level || String(level).trim() === '') {
                throw new Error('Level is required');
            }
            const _level = Number(level);
            if (!_level || _level < 1) {
                throw new Error('Level must be an integer and must be large or 1');
            }
            return true;
        }),
        check('parent').custom((parent) => {
            if (!ObjectId.isValid(parent)) {
                throw new Error('Parent category ID is not valid');
            }
            return true;
        }),
    ],

    //====================Validate Discount Code==================
    createDiscountCode: [
        check('code')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Mã giảm giá không được để trống`')
            .matches(/^[A-Za-z0-9]{6,20}$/)
            .withMessage('Mã giảm giá chỉ chứa chữ cái từ a-z, A-Z và chữ số từ 0 đến 9 và độ dài từ 6 đến 20 ký tự'),
        check('name').trim().not().isEmpty().withMessage('Tên chương trình mã giảm giá không được để trống'),
        check('discountType')
            .notEmpty()
            .withMessage('Loại giảm giá không được để trống')
            .custom((discountType) => {
                if (discountType != 1 && discountType != 2) {
                    throw new Error('Loại mã giảm giá không hợp lệ');
                }
                return true;
            }),
        check('discount').custom((discount, { req }) => {
            if (!discount || String(discount).trim() === '') {
                throw new Error('Giá trị mã giảm giá không được để trống');
            }
            if (req.body.discountType == 1) {
                const _discount = Number(discount);
                if (!_discount || _discount < 0) {
                    throw new Error('Giá trị mã giảm giá phải lớn 0');
                }
            } else {
                const _discount = Number(discount);
                if (!_discount || _discount < 0 || _discount > 100) {
                    throw new Error('Phần trăm mã giảm giá phải từ 1 đến 100');
                }
            }
            return true;
        }),
        check('startDate')
            .notEmpty()
            .withMessage('Ngày bắt đầu không được để trống')
            .custom((startDate) => {
                startDate = new Date(startDate);
                if (startDate == 'Invalid Date') {
                    throw new Error('Ngày bắt bắt đầu hiệu lực không hợp lệ');
                }
                return true;
            }),

        check('endDate')
            .not()
            .isEmpty()
            .withMessage('Ngày kết thúc không được để trống')
            .custom((endDate, { req }) => {
                const startDate = new Date(req.body.startDate);
                endDate = new Date(endDate);
                if (startDate == 'Invalid Date') {
                    throw new Error('Ngày bắt đầu hiệu lực không hợp lệ');
                }
                if (endDate == 'Invalid Date') {
                    throw new Error('Ngày kết thúc hiệu lực không hợp lệ');
                }
                if (endDate < startDate || endDate <= new Date()) {
                    throw new Error('Ngày kết thúc hiệu lực phải lớn hơn thời gian bắt đầu và thời gian hiện tại');
                }
                return true;
            }),
        check('isUsageLimit')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Xác nhận giới hạn lượt sử dụng không được để trống')
            .isBoolean()
            .withMessage('Xác nhận giới hạn lượt sử dụng phải là kiểu đúng/sai'),
        check('usageLimit').custom((usageLimit, { req }) => {
            if (new Boolean(req.body.isUsageLimit)) {
                if (!usageLimit || String(usageLimit).trim() === '') {
                    throw new Error('Số lượt sử dụng mã giảm giá không được để trống');
                }
                const _usageLimit = Number(usageLimit);
                if (!_usageLimit || _usageLimit <= 0) {
                    throw new Error('Lượt sử dụng mã giảm giá phải lớn hơn hoặc bằng 1');
                }
            }

            return true;
        }),
        check('applicableProducts').custom((applicableProducts) => {
            applicableProducts.map((product) => {
                if (!ObjectId.isValid(product)) {
                    throw new Error('Mã sản phẩm: "' + product + '"Không hợp lệ');
                }
            });
            return true;
        }),
    ],
    updateDiscountCode: [
        check('code')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Mã giảm giá không được để trống`')
            .matches(/^[A-Za-z0-9]{6,10}$/)
            .withMessage('Mã giảm giá chỉ chứa chữ cái từ a-z, A-Z và chữ số từ 0 đến 9 và độ dài từ 6 đến 10 ký tự'),
        check('name').trim().not().isEmpty().withMessage('Mã giảm giá không được để trống'),
        check('discountType')
            .notEmpty()
            .withMessage('Loại giảm giá không được để trống')
            .custom((discountType) => {
                if (discountType != 1 && discountType != 2) {
                    throw new Error('Loại mã giảm giá không hợp lệ');
                }
                return true;
            }),
        check('discount').custom((discount, { req }) => {
            if (!discount || String(discount).trim() === '') {
                throw new Error('Giá trị mã giảm giá không được để trống');
            }
            if (req.body.discountType == 1) {
                const _discount = Number(discount);
                if (!_discount || _discount < 0) {
                    throw new Error('Giá trị mã giảm giá phải lớn 0');
                }
            } else {
                const _discount = Number(discount);
                if (!_discount || _discount < 0 || _discount > 100) {
                    throw new Error('Phần trăm mã giảm giá phải từ 1 đến 100');
                }
            }
            return true;
        }),
        check('startDate')
            .notEmpty()
            .withMessage('Ngày bắt đầu không được để trống')
            .custom((startDate) => {
                startDate = new Date(startDate);
                if (startDate == 'Invalid Date') {
                    throw new Error('Ngày bắt bắt đầu hiệu lực không hợp lệ');
                }
                return true;
            }),

        check('endDate')
            .not()
            .isEmpty()
            .withMessage('Ngày kết thúc không được để trống')
            .custom((endDate, { req }) => {
                const startDate = new Date(req.body.startDate);
                endDate = new Date(endDate);
                if (startDate == 'Invalid Date') {
                    throw new Error('Ngày bắt đầu hiệu lực không hợp lệ');
                }
                if (endDate == 'Invalid Date') {
                    throw new Error('Ngày kết thúc hiệu lực không hợp lệ');
                }
                if (endDate < startDate || endDate <= new Date()) {
                    throw new Error('Ngày kết thúc hiệu lực phải lớn hơn thời gian bắt đầu và thời gian hiện tại');
                }
                return true;
            }),
        check('isUsageLimit')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Xác nhận giới hạn lượt sử dụng không được để trống')
            .isBoolean()
            .withMessage('Xác nhận giới hạn lượt sử dụng phải là kiểu đúng/sai'),
        check('usageLimit').custom((usageLimit, { req }) => {
            if (new Boolean(req.body.isUsageLimit)) {
                if (!usageLimit || String(usageLimit).trim() === '') {
                    throw new Error('Số lượt sử dụng mã giảm giá không được để trống');
                }
                const _usageLimit = Number(usageLimit);
                if (!_usageLimit || _usageLimit < 0) {
                    throw new Error('Lượt sử dụng mã giảm giá phải lớn hơn hoặc bằng 0');
                }
            }

            return true;
        }),
        check('applicableProducts').custom((applicableProducts) => {
            applicableProducts.map((product) => {
                if (!ObjectId.isValid(product)) {
                    throw new Error('Mã sản phẩm: "' + product + '"Không hợp lệ');
                }
            });
            return true;
        }),
    ],

    discountCalculation: [
        check('orderItems')
            .isArray()
            .withMessage('Danh sách các sản phẩm đặt hàng phải là mảng')
            .notEmpty()
            .withMessage('Danh sách các sản phẩm đặt hàng không được để trống'),
        check('orderItems.*.variant').custom((variant) => {
            if (!ObjectId.isValid(variant)) {
                throw new Error(`ID biến thể sản phẩm "${variant}" không hợp lệ`);
            }
            return true;
        }),
        check('orderItems.*.quantity')
            .notEmpty()
            .withMessage('Số lượng sản phẩm đặt hàng không được để trống')
            .isInt({ min: 1 })
            .withMessage('Số lượng sản phẩm đặt hàng phải là số nguyên và phải lớn hơn 0'),
        check('discountCode')
            .notEmpty()
            .withMessage('Mã giảm giá không được để trống')
            .isString()
            .withMessage('Mã giảm giá phải là chuỗi kí tự'),
    ],
    //====================Validate User==================
    register: [
        check('name')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Tên không được để trống')
            .isLength({ max: 50 })
            .withMessage('Tên không được dài quá 50 ký tự'),
        check('email')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Email không được để trống')
            .isEmail()
            .withMessage('Địa chỉ email không hợp lệ'),
        check('phone')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Số điện thoại không được để trống')
            .matches(/((09|03|07|08|05)+([0-9]{8})\b)/g)
            .withMessage('Số điện thoại không hợp lệ'),
        check('password')
            .not()
            .isEmpty()
            .withMessage('Mật khẩu không được để trống')
            .matches(/^(?=.*[A-Za-z])(?=.*\d)[^\s]{6,255}$/)
            .withMessage('Mật khẩu phải từ 6 - 255 ký tự, ít nhất 1 chữ cái, 1 chữ số và không có khoảng trắng'),
        // check('confirmPassword').custom((confirmPassword, { req }) => {
        //     if (confirmPassword !== req.body.password) {
        //         throw new Error('Xác nhận mật khẩu không khớp');
        //     }
        //     return true;
        // }),
    ],
    login: [
        check('email')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Email không được để trống')
            .isEmail()
            .withMessage('Địa chỉ email không hợp lệ'),
        check('password').trim().not().isEmpty().withMessage('Mật khẩu không được để trống'),
    ],
    updateProfile: [
        check('name')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Tên không được để trống')
            .isLength({ max: 50 })
            .withMessage('Tên không được dài quá 50 ký tự'),
        check('phone')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Số điện thoại không được để trống')
            .matches(/((09|03|07|08|05)+([0-9]{8})\b)/g)
            .withMessage('Số điện thoại không hợp lệ'),
        check('gender')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Giới tính không được để trống')
            .custom((gender) => {
                if (gender !== 'male' && gender !== 'female' && gender !== 'other') {
                    throw new Error('Giới tính phải là "male" hoặc "female" hoặc "other"');
                }
                return true;
            }),
        check('birthday')
            .not()
            .isEmpty()
            .withMessage('Ngày sinh không được để trống')
            .isDate()
            .withMessage('Ngày sinh không hợp lệ')
            .custom((birthday) => {
                if (new Date(birthday) >= new Date()) {
                    throw new Error('Ngày sinh phải bé hơn thời gian hiện tại');
                }
                return true;
            }),
    ],
    userAddress: [
        check('name')
            .notEmpty()
            .withMessage('Tên người nhận không được để trống')
            .isLength({ max: 50 })
            .withMessage('Tên người nhận không được dài quá 50 ký tự'),
        check('phone')
            .notEmpty()
            .withMessage('Số điện thoại người nhận không được để trống')
            .matches(/((09|03|07|08|05)+([0-9]{8})\b)/g)
            .withMessage('Số điện thoại không hợp lệ'),
        check('province').notEmpty().withMessage('Tỉnh/Thành phố không được để trống'),
        check('province.id')
            .notEmpty()
            .withMessage('Mã Tỉnh/Thành phố không được để trống')
            .isInt()
            .withMessage('Mã Tỉnh/Thành phố phải là kiểu số nguyên'),
        check('province.name')
            .notEmpty()
            .withMessage('Tên Tỉnh/Thành phố không được để trống')
            .isString()
            .withMessage('Tên Tỉnh/Thành phố phải là kiểu chuỗi'),
        check('district').notEmpty().withMessage('Huyện/Quận không được để trống'),
        check('district.id')
            .notEmpty()
            .withMessage('Mã Huyện/Quận không được để trống')
            .isInt()
            .withMessage('Mã Huyện/Quận phải là kiểu số nguyên'),
        check('district.name')
            .notEmpty()
            .withMessage('Tên Huyện/Quận phố không được để trống')
            .isString()
            .withMessage('Tên Huyện/Quận phố phải là kiểu chuỗi'),
        check('ward').notEmpty().withMessage('Xã/Phường không được để trống'),
        check('ward.id')
            .notEmpty()
            .withMessage('Mã Xã/Phường không được để trống')
            .isInt()
            .withMessage('Mã Xã/Phường phải là kiểu số nguyên'),
        check('ward.name')
            .notEmpty()
            .withMessage('Tên Xã/Phường không được để trống')
            .isString()
            .withMessage('Tên Xã/Phường phải là kiểu chuỗi'),
        check('specificAddress')
            .notEmpty()
            .withMessage('Địa chỉ chi tiết không được để trống')
            .isString()
            .withMessage('Địa chỉ chi tiết phải là kiểu chuỗi'),
        check('isDefault')
            .notEmpty()
            .withMessage('Xác nhận đặt làm địa chỉ mặc định không được để trống')
            .isBoolean()
            .withMessage('Xác nhận đặt làm địa chỉ mặc định phải là kiểu chỉ định đúng/sai'),
    ],
    addUserDiscountCode: [
        check('discountCode')
            .notEmpty()
            .withMessage('Mã giảm giá không được để trống')
            .isString()
            .withMessage('Mã giảm giá phải là kiểu chuỗi'),
    ],
    forgotPassword: [
        check('email')
            .trim()
            .not()
            .isEmpty()
            .withMessage('Email không được để trống')
            .isEmail()
            .withMessage('Địa chỉ email không hợp lệ'),
    ],
    resetPassword: [
        check('newPassword')
            .not()
            .isEmpty()
            .withMessage('Mật khẩu không được để trống')
            .matches(/^(?=.*[A-Za-z])(?=.*\d)[^\s]{6,255}$/)
            .withMessage('Mật khẩu phải từ 6 - 255 ký tự, ít nhất 1 chữ cái, 1 chữ số và không có khoảng trắng'),
        // check('confirmPassword').custom((confirmPassword, { req }) => {
        //     if (confirmPassword !== req.body.password) {
        //         throw new Error('Xác nhận mật khẩu không khớp');
        //     }
        //     return true;
        // }),
        check('resetPasswordToken').not().isEmpty().withMessage('Token đặt lại mật khẩu không hợp lệ'),
    ],
    changePassword: [
        check('currentPassword').trim().not().isEmpty().withMessage('Mật khẩu hiện tại không được để trống'),
        check('newPassword')
            .not()
            .isEmpty()
            .withMessage('Mật khẩu mới không được để trống')
            .matches(/^(?=.*[A-Za-z])(?=.*\d)[^\s]{6,255}$/)
            .withMessage('Mật khẩu phải từ 6 - 255 ký tự, ít nhất 1 chữ cái, 1 chữ số và không có khoảng trắng'),
    ],

    //====================Validate Product==================
    getProductById: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID sản phẩm không hợp lệ');
            }
            return true;
        }),
    ],
    createProduct: [
        check('name')
            .trim()
            .notEmpty()
            .withMessage('Tên sản phẩm không được để trống')
            .isLength({ max: 255 })
            .withMessage('Tên sản phẩm không được dài quá 255 ký tự'),
        check('description').trim().notEmpty().withMessage('Mô tả sản phẩm không được để trống'),
        check('category')
            .notEmpty()
            .withMessage('Thể loại sản phẩm không được để trống')
            .custom((category) => {
                if (!ObjectId.isValid(category)) {
                    throw new Error('ID thể loại không hợp lệ');
                }
                return true;
            }),
        check('brand').trim().notEmpty().withMessage('Thương hiệu sản phẩm không được để trống'),
        check('weight')
            .notEmpty()
            .withMessage('Cân nặng của sản phẩm không được để trống')
            .isInt({ min: 1 })
            .withMessage('Cân nặng của sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 1'),
        check('height')
            .notEmpty()
            .withMessage('Chiều cao của sản phẩm không được để trống')
            .isInt({ min: 0.01 })
            .withMessage('Chiều cao của sản phẩm phải là số nguyên và phải lớn hơn 0'),
        check('length')
            .notEmpty()
            .withMessage('Chiều dài của sản phẩm không được để trống')
            .isInt({ min: 0.01 })
            .withMessage('Chiều dài của sản phẩm phải là số nguyên và phải lớn hơn 0'),
        check('width')
            .notEmpty()
            .withMessage('Chiều rộng của sản phẩm không được để trống')
            .isInt({ min: 0.01 })
            .withMessage('Chiều rộng của sản phẩm phải là số nguyên và phải lớn hơn 0'),

        check('variants').notEmpty().withMessage('Danh sách các biến thể không được để trống'),
        // .custom((variants) => {
        //     variants = JSON.parse(variants);
        // }),
        // check('variants.*.price')
        //     .notEmpty()
        //     .withMessage('Giá của các biến thể sản phẩm không được để trống')
        //     .isInt({ min: 0 })
        //     .withMessage('Giá của các biến thể sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0'),
        // // check('variants.*.priceSale')
        // //     .notEmpty()
        // //     .withMessage('Giá đã giảm của các biến thể sản phẩm không được để trống')
        // //     .isInt({ min: 0 })
        // //     .withMessage('Giá đã giảm của các biến thể sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0'),
        // check('variants.*.quantity')
        //     .notEmpty()
        //     .withMessage('Số lượng các biến thể sản phẩm không được để trống')
        //     .isInt({ min: 0 })
        //     .withMessage('Số lượng các biến thể sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0'),
        // check('variants.*.attributes')
        //     .notEmpty()
        //     .withMessage('Danh sách thuộc tính các biến thể không được để trống')
        //     .isArray()
        //     .withMessage('Danh sách thuộc tính của biến thể phải là mảng'),
        // check('variants.*.attributes.*.name')
        //     .trim()
        //     .notEmpty()
        //     .withMessage('Tên các thuộc tính của biến thể sản phẩm không được để trống'),
        // check('variants.*.attributes.*.value')
        //     .trim()
        //     .notEmpty()
        //     .withMessage('Giá trị các thuộc tính của biến thể sản phẩm không được để trống'),
    ],
    updateProduct: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID sản phẩm không hợp lệ');
            }
            return true;
        }),
        check('name')
            .trim()
            .notEmpty()
            .withMessage('Tên sản phẩm không được để trống')
            .isLength({ max: 255 })
            .withMessage('Tên sản phẩm không được dài quá 255 ký tự'),

        check('description').trim().notEmpty().withMessage('Mô tả sản phẩm không được để trống'),
        check('category')
            .notEmpty()
            .withMessage('Thể loại sản phẩm không được để trống')
            .custom((category) => {
                if (!ObjectId.isValid(category)) {
                    throw new Error('ID thể loại không hợp lệ');
                }
                return true;
            }),
        check('brand').trim().notEmpty().withMessage('Thương hiệu sản phẩm không được để trống'),
        check('variants').notEmpty().withMessage('Danh sách các biến thể không được để trống'),
        // check('variants.*.price')
        //     .notEmpty()
        //     .withMessage('Giá của các biến thể sản phẩm không được để trống')
        //     .isInt({ min: 0 })
        //     .withMessage('Giá của các biến thể sản phẩm phải là số nguyên và phài lớn hơn hoặc bằng 0'),
        // check('variants.*.priceSale')
        //     .notEmpty()
        //     .withMessage('Giá đã giảm của các biến thể sản phẩm không được để trống')
        //     .isInt({ min: 0 })
        //     .withMessage('Giá đã giảm của các biến thể sản phẩm phải là số nguyên và phài lớn hơn hoặc bằng 0'),
        // check('variants.*.quantity')
        //     .notEmpty()
        //     .withMessage('Số lượng các biến thể sản phẩm không được để trống')
        //     .isInt({ min: 0 })
        //     .withMessage('Số lượng các biến thể sản phẩm phải là số nguyên và phải lớn hơn hoặc bằng 0'),
        // check('variants.*.attributes')
        //     .isArray()
        //     .withMessage('Danh sách thuộc tính của biến thể phải là mảng')
        //     .notEmpty()
        //     .withMessage('Danh sách thuộc tính các biến thể không được để trống'),
        // check('variants.*.attributes.*.name')
        //     .trim()
        //     .notEmpty()
        //     .withMessage('Tên các thuộc tính của biến thể sản phẩm không được để trống'),
        // check('variants.*.attributes.*.value')
        //     .trim()
        //     .notEmpty()
        //     .withMessage('Giá trị các thuộc tính của biến thể sản phẩm không được để trống'),
    ],
    review: [
        check('rating')
            .notEmpty()
            .withMessage('Số sao đánh giá không được để trống')
            .isInt({ min: 1, max: 5 })
            .withMessage('Số sao đánh giá phải là số nguyên từ 1 đến 5'),
    ],
    hide: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID sản phẩm không hợp lệ');
            }
            return true;
        }),
    ],
    unhide: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID sản phẩm không hợp lệ');
            }
            return true;
        }),
    ],
    restore: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID sản phẩm không hợp lệ');
            }
            return true;
        }),
    ],
    delete: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID sản phẩm không hợp lệ');
            }
            return true;
        }),
    ],
    //====================Validate Order==================
    validateOrderId: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID đơn hàng không hợp lệ');
            }
            return true;
        }),
    ],
    getOrdersByUserId: [
        check('userId').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID khách hàng không hợp lệ');
            }
            return true;
        }),
        // check('limit').isInt({ min: 0 }).withMessage('Giới hạn phải là số nguyên và phải lớn hơn hoặc bằng 0'),
        // check('page').isInt({ min: 0 }).withMessage('Số thứ tự trang phải là số nguyên và phải lớn hơn hoặc bằng 0'),
        // check('status').isString().withMessage(' Trạng thái phải là chuỗi kí tự'),
    ],
    createOrder: [
        check('shippingAddress')
            .isObject()
            .withMessage(
                'Địa chỉ giao hàng phải là một đối tượng gồm các tên, số điện thoại và địa chỉ của người nhận hàng',
            )
            .custom((shippingAddress) => {
                if (!shippingAddress.to_name || shippingAddress.to_name.toString().trim() === '') {
                    throw new Error('Họ tên người nhận không được để trống');
                }
                if (!shippingAddress.to_phone || shippingAddress.to_phone.toString().trim() === '') {
                    throw new Error('Số điện thoại người nhận không được để trống');
                }
                if (!shippingAddress.service_id || shippingAddress.service_id.toString().trim() === '') {
                    throw new Error('Dịch vụ giao hàng không được để trống');
                }
                if (!shippingAddress.to_province_id || shippingAddress.to_province_id.toString().trim() === '') {
                    throw new Error('Tỉnh/Thành phố không được để trống');
                }
                if (!shippingAddress.to_district_id || shippingAddress.to_district_id.toString().trim() === '') {
                    throw new Error('Quận/Huyện không được để trống');
                }
                if (!shippingAddress.to_ward_code || shippingAddress.to_ward_code.toString().trim() === '') {
                    throw new Error('Phường/Xã không được để trống');
                }
                if (!shippingAddress.to_address || shippingAddress.to_address.toString().trim() === '') {
                    throw new Error('Địa chỉ chi tiết không được để trống');
                }
                return true;
            }),
        check('paymentMethod').custom((paymentMethod) => {
            if (!paymentMethod || paymentMethod.toString().trim() == '') {
                throw new Error('Phương thức thanh toán là giá trị bắt buộc');
            }
            if (paymentMethod !== 1 && paymentMethod !== 2) {
                throw new Error(' Phương thức thanh toán không hợp lệ');
            }
            return true;
        }),
        check('orderItems')
            .isArray()
            .withMessage('Danh sách các sản phẩm đặt hàng phải là mảng')
            .notEmpty()
            .withMessage('Danh sách các sản phẩm đặt hàng không được để trống'),
        check('orderItems.*.variant').custom((variant) => {
            if (!ObjectId.isValid(variant)) {
                throw new Error(`ID biến thể sản phẩm "${variant}" không hợp lệ`);
            }
            return true;
        }),
        check('orderItems.*.quantity')
            .notEmpty()
            .withMessage('Số lượng sản phẩm đặt hàng không được để trống')
            .isInt({ min: 1 })
            .withMessage('Số lượng sản phẩm đặt hàng phải là số nguyên và phải lớn hơn 0'),
        // check('discountCode').isString().withMessage('Mã giảm giá phải là chuỗi kí tự'),
    ],
    placeOrder: [
        check('shippingAddress')
            .isObject()
            .withMessage(
                'Địa chỉ giao hàng phải là một đối tượng gồm các tên, số điện thoại và địa chỉ của người nhận hàng',
            )
            .custom((shippingAddress) => {
                if (!shippingAddress.receiver || shippingAddress.receiver.toString().trim() === '') {
                    throw new Error('Họ tên người nhận không được để trống');
                }
                if (!shippingAddress.phone || shippingAddress.phone.toString().trim() === '') {
                    throw new Error('Số điện thoại người nhận không được để trống');
                }
                if (!shippingAddress.province || shippingAddress.province.toString().trim() === '') {
                    throw new Error('Tỉnh/Thành phố không được để trống');
                }
                if (!shippingAddress.district || shippingAddress.district.toString().trim() === '') {
                    throw new Error('Quận/Huyện không được để trống');
                }
                if (!shippingAddress.ward || shippingAddress.ward.toString().trim() === '') {
                    throw new Error('Phường/Xã không được để trống');
                }
                if (!shippingAddress.specificAddress || shippingAddress.specificAddress.toString().trim() === '') {
                    throw new Error('Địa chỉ chi tiết không được để trống');
                }
                return true;
            }),
        check('paymentMethod').custom((paymentMethod) => {
            if (!paymentMethod || paymentMethod.toString().trim() == '') {
                throw new Error('Phương thức thanh toán là giá trị bắt buộc');
            }
            if (paymentMethod !== 'payment-with-cash' && paymentMethod !== 'payment-with-momo') {
                throw new Error(' Phương thức thanh toán phải là "payment-with-cash" hoặc "payment-with-momo"');
            }
            return true;
        }),
        check('orderItems')
            .isArray()
            .withMessage('Danh sách các sản phẩm đặt hàng phải là mảng')
            .notEmpty()
            .withMessage('Danh sách các sản phẩm đặt hàng không được để trống'),
        check('orderItems.*.variant').custom((variant) => {
            if (!ObjectId.isValid(variant)) {
                throw new Error(`ID biến thể sản phẩm "${variant}" không hợp lệ`);
            }
            return true;
        }),
        check('orderItems.*.quantity')
            .notEmpty()
            .withMessage('Số lượng sản phẩm đặt hàng không được để trống')
            .isInt({ min: 1 })
            .withMessage('Số lượng sản phẩm đặt hàng phải là số nguyên và phải lớn hơn 0'),
        // check('discountCode').isString().withMessage('Mã giảm giá phải là chuỗi kí tự'),
    ],
    reviewProductByOrderItemId: [
        check('id').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID đơn hàng không hợp lệ');
            }
            return true;
        }),
        check('orderItemId').custom((id) => {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID sản phẩm trong đơn hàng không hợp lệ');
            }
            return true;
        }),
        check('rating')
            .notEmpty()
            .withMessage('Số sao đánh giá không được để trống')
            .isInt({ min: 1, max: 5 })
            .withMessage('Số sao đánh giá phải là số nguyên từ 1 đến 5'),
    ],

    //====================Validate delivery==================
    getDistrict: [
        check('province_id').custom((province_id) => {
            if (province_id) {
                if (typeof province_id != 'number') {
                    throw new Error('Mã Tỉnh/Thành phố phải là số nguyên');
                }
            }
            return true;
        }),
    ],
    getWard: [
        check('district_id')
            .notEmpty()
            .withMessage('Mã quận huyện không được để trống')
            .isInt()
            .withMessage('Mã Quận/Huyện phải là số nguyên'),
    ],
    calculateFee: [
        // check('from_district_id').custom((from_district_id) => {
        //     if (from_district_id) {
        //         if (typeof from_district_id != 'number') {
        //             throw new Error('Mã quận/huyện phải là số nguyên');
        //         }
        //     }
        //     return true;
        // }),
        // check('service_id')
        //     .notEmpty()
        //     .withMessage('Mã dịch vụ không được để trống')
        //     .isInt()
        //     .withMessage('Mã dịch vụ phải là số nguyên'),
        check('to_district_id')
            .notEmpty()
            .withMessage('Mã quận/huyện của người nhận hàng không được để trống')
            .isInt()
            .withMessage('Mã quận/huyện của người nhận phải là số nguyên'),
        check('to_ward_code')
            .notEmpty()
            .withMessage('Mã phường/xã của người nhận hàng không được để trống')
            .isString()
            .withMessage('Mã phường/xã của người nhận phải là chuỗi ký tự'),
        check('weight')
            .notEmpty()
            .withMessage('Khối lượng của đơn hàng không được để trống')
            .isInt({ min: 1, max: 1600000 })
            .withMessage(
                'Khối lượng của đơn hàng phải là số nguyên và phải lớn hơn 0 và bé hơn hoặc bằng 1600000 gram',
            ),
        check('height').custom((height) => {
            if (height) {
                if (typeof height != 'number' && height >= 0 && height <= 200) {
                    throw new Error(
                        'Chiều cao của đơn hàng phải là số nguyên và phải lớn hơn hoặc bằng 0 và bé hơn hoặc bằng 200cm',
                    );
                }
            }
            return true;
        }),
        check('length').custom((length) => {
            if (length) {
                if (typeof length != 'number' && length >= 0 && length <= 200) {
                    throw new Error(
                        'Chiều dài của đơn hàng phải là số nguyên và phải lớn hơn hoặc bằng 0 và bé hơn hoặc bằng 200cm',
                    );
                }
            }
            return true;
        }),
        check('width').custom((width) => {
            if (width) {
                if (typeof width != 'number' && width >= 0 && width <= 200) {
                    throw new Error(
                        'Chiều dài của đơn hàng phải là số nguyên và phải lớn hơn hoặc bằng 0 và bé hơn hoặc bằng 200cm',
                    );
                }
            }
            return true;
        }),
        check('insurance_value').custom((insurance_value) => {
            if (insurance_value) {
                if (typeof insurance_value != 'number' && insurance_value >= 0) {
                    throw new Error('Giá trị của đơn hàng phải là số nguyên và lớn hơn hoặc bằng 0');
                }
            }
            return true;
        }),
        check('coupon').custom((coupon) => {
            if (coupon) {
                if (typeof coupon != 'string') {
                    throw new Error('Mã giảm giá của phải là chuỗi ký tự');
                }
            }
            return true;
        }),
    ],
    // services: [
    //     check('from_district_id')
    //         .notEmpty()
    //         .withMessage('Mã quận/huyện của người nhận hàng không được để trống')
    //         .isInt()
    //         .withMessage('Mã quận/huyện của người nhận phải là số nguyên'),
    //     check('to_district')
    //         .notEmpty()
    //         .withMessage('Mã quận/huyện của người nhận hàng không được để trống')
    //         .isInt()
    //         .withMessage('Mã quận/huyện của người nhận phải là số nguyên'),
    // ],
    estimatedDeliveryTime: [
        check('service_id')
            .notEmpty()
            .withMessage('Mã dịch vụ không được để trống')
            .isInt()
            .withMessage('Mã dịch vụ phải là số nguyên'),
        check('to_district_id')
            .notEmpty()
            .withMessage('Mã quận/huyện của người nhận hàng không được để trống')
            .isInt()
            .withMessage('Mã quận/huyện của người nhận phải là số nguyên'),
        check('to_ward_code')
            .notEmpty()
            .withMessage('Mã phường/xã của người nhận hàng không được để trống')
            .isString()
            .withMessage('Mã phường/xã của người nhận phải là chuỗi ký tự'),
    ],
    updateCOD: [
        check('cod_amount')
            .notEmpty()
            .withMessage('Số tiền thu hộ không được để trống')
            .isInt({ min: 0 })
            .withMessage('Số tiền thu hộ phải là số nguyên và phải lớn hơn hoặc bằng 0'),
    ],
};
export default validate;
