const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// CLI Flags & Arguments
const args = process.argv.slice(2);
const forceOverwrite = args.includes("--force") || args.includes("-f");
const skipInstall = args.includes("--skip-install") || args.includes("-s");

const nonFlagArgs = args.filter((arg) => !arg.startsWith("-"));
const targetDirArg = nonFlagArgs[0];
const projectRoot = targetDirArg ? path.resolve(process.cwd(), targetDirArg) : process.cwd();

console.log("\n🚀 Creating backend project structure...\n");

let stats = { created: 0, skipped: 0, overwritten: 0 };

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const createDirectory = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`📁 Created: ${path.relative(projectRoot, directory)}`);
  }
};

const createFile = (relativePath, content = "") => {
  const filePath = path.join(projectRoot, relativePath);
  createDirectory(path.dirname(filePath));

  const exists = fs.existsSync(filePath);

  if (exists && !forceOverwrite) {
    console.log(`⚠️ Already exists (skipped): ${relativePath}`);
    stats.skipped++;
    return;
  }

  fs.writeFileSync(filePath, content.trimStart());
  if (exists && forceOverwrite) {
    console.log(`🔄 Overwritten: ${relativePath}`);
    stats.overwritten++;
  } else {
    console.log(`📄 Created: ${relativePath}`);
    stats.created++;
  }
};

/*
|--------------------------------------------------------------------------
| Directories
|--------------------------------------------------------------------------
*/

const folders = [
  "src/config",
  "src/database/migrations",
  "src/database/seeders",
  "src/modules/auth",
  "src/modules/users",
  "src/models",
  "src/middleware",
  "src/routes",
  "src/utils",
  "src/constants",
  "src/jobs",
  "src/events",
  "logs",
  "uploads",
  "tests",
];

folders.forEach((folder) => {
  createDirectory(path.join(projectRoot, folder));
});

// Create .gitkeep files in empty tracking directories
createFile("logs/.gitkeep", "");
createFile("uploads/.gitkeep", "");

/*
|--------------------------------------------------------------------------
| Config
|--------------------------------------------------------------------------
*/

createFile(
  "src/config/env.js",
  `require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,

  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'backend',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
};

module.exports = env;
`
);

createFile(
  "src/config/database.js",
  `const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(
  env.database.name,
  env.database.username,
  env.database.password,
  {
    host: env.database.host,
    port: env.database.port,
    dialect: 'mysql',
    logging: env.nodeEnv === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

module.exports = sequelize;
`
);

createFile(
  "src/config/logger.js",
  `const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d'
    }),
    new winston.transports.Console()
  ]
});

module.exports = logger;
`
);

createFile(
  "src/config/sequelize.config.js",
  `require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'backend',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql'
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: (process.env.DB_NAME || 'backend') + '_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql'
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'backend',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql'
  }
};
`
);

createFile(
  "src/config/swagger.js",
  `const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API',
      version: '1.0.0',
      description: 'Backend REST API Documentation'
    },
    servers: [
      {
        url: \`http://localhost:\${env.port}\`,
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/modules/**/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
`
);

createFile(
  "src/config/mail.js",
  `require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
  port: Number(process.env.MAIL_PORT) || 2525,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASSWORD || ''
  }
});

const mailConfig = {
  from: process.env.MAIL_FROM || '"Backend Platform" <noreply@Backend.com>',
  transporter
};

module.exports = mailConfig;
`
);

/*
|--------------------------------------------------------------------------
| Database
|--------------------------------------------------------------------------
*/

createFile(
  "src/database/seeders.js",
  `const sequelize = require('../config/database');

const runSeeders = async () => {
  // Add seed logic here
};

module.exports = runSeeders;
`
);

createFile(
  "src/database/sync.js",
  `const db = require('../models');

const syncDatabase = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');

    await db.sequelize.sync({ alter: false });
    console.log('✅ Database tables synchronized');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
};

syncDatabase();
`
);

/*
|--------------------------------------------------------------------------
| Models
|--------------------------------------------------------------------------
*/

createFile(
  "src/models/index.js",
  `const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const db = {};

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== path.basename(__filename) &&
      file.slice(-3) === '.js' &&
      !file.endsWith('.test.js')
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file));
    if (model && model.name) {
      db[model.name] = model;
    }
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
`
);

createFile(
  "src/models/User.js",
  `const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      allowNull: false,
      defaultValue: 'user'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    }
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true
  }
);

module.exports = User;
`
);

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

createFile(
  "src/middleware/auth.middleware.js",
  `const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required'
      });
    }

    const token = authorization.startsWith('Bearer ')
      ? authorization.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      });
    }

    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authMiddleware;
`
);

createFile(
  "src/middleware/upload.middleware.js",
  `const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, \`avatar-\${uniqueSuffix}\${ext}\`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPG, PNG, and WEBP images are allowed'), false);
  }
};

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

module.exports = { uploadAvatar };
`
);

createFile(
  "src/middleware/validate.middleware.js",
  `const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
`
);

createFile(
  "src/middleware/error.middleware.js",
  `const logger = require('../config/logger');

const errorMiddleware = (error, req, res, next) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl
  });

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
  });
};

module.exports = errorMiddleware;
`
);

createFile(
  "src/middleware/notFound.middleware.js",
  `const notFoundMiddleware = (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
};

module.exports = notFoundMiddleware;
`
);

/*
|--------------------------------------------------------------------------
| Utilities
|--------------------------------------------------------------------------
*/

createFile(
  "src/utils/ApiError.js",
  `class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
`
);

createFile(
  "src/utils/ApiResponse.js",
  `class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static error(res, message = 'Something went wrong', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors ? { errors } : {})
    });
  }
}

module.exports = ApiResponse;
`
);

createFile(
  "src/utils/asyncHandler.js",
  `const asyncHandler = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
`
);

createFile(
  "src/utils/helpers.js",
  `const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword
};
`
);

createFile(
  "src/utils/pagination.js",
  `const getPagination = (page, size) => {
  const limit = size ? +size : 10;
  const offset = page ? (page - 1) * limit : 0;
  return { limit, offset, page: page ? +page : 1 };
};

const getPagingData = (count, rows, page, limit) => {
  const totalItems = count;
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    totalItems,
    items: rows,
    totalPages,
    currentPage
  };
};

module.exports = {
  getPagination,
  getPagingData
};
`
);

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

createFile(
  "src/constants/roles.js",
  `const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

module.exports = ROLES;
`
);

createFile(
  "src/constants/statusCodes.js",
  `module.exports = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500
};
`
);

/*
|--------------------------------------------------------------------------
| Auth Module
|--------------------------------------------------------------------------
*/

createFile(
  "src/modules/auth/auth.validation.js",
  `const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow('', null),
  bio: Joi.string().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(150),
  phone: Joi.string().allow('', null),
  bio: Joi.string().allow('', null)
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
};
`
);

createFile(
  "src/modules/auth/auth.controller.js",
  `const authService = require('./auth.service');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    return ApiResponse.success(res, user, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return ApiResponse.success(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return ApiResponse.success(res, user, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return ApiResponse.success(res, user, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Avatar image file is required');
    }
    const user = await authService.updateAvatar(req.user.id, req.file.filename);
    return ApiResponse.success(res, user, 'Avatar updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  updateAvatar
};
`
);

createFile(
  "src/modules/auth/auth.service.js",
  `const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { hashPassword, comparePassword } = require('../../utils/helpers');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');

const register = async (data) => {
  const existingUser = await authRepository.findByEmail(data.email);
  if (existingUser) {
    throw new ApiError(409, 'Email already exists');
  }

  const password = await hashPassword(data.password);
  const user = await authRepository.create({
    ...data,
    password
  });

  const userJson = user.toJSON();
  delete userJson.password;
  return userJson;
};

const login = async ({ email, password }) => {
  const user = await authRepository.findByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = jwt.sign({ id: user.id }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });

  const userJson = user.toJSON();
  delete userJson.password;

  return { user: userJson, token };
};

const getProfile = async (userId) => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const userJson = user.toJSON();
  delete userJson.password;
  return userJson;
};

const updateProfile = async (userId, data) => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await user.update(data);
  const updatedUser = user.toJSON();
  delete updatedUser.password;
  return updatedUser;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const hashedPassword = await hashPassword(newPassword);
  await user.update({ password: hashedPassword });
  return { message: 'Password updated successfully' };
};

const updateAvatar = async (userId, filename) => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.avatar) {
    const oldPath = path.join(__dirname, '../../../', user.avatar);
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch (e) {}
    }
  }

  const avatarUrl = \`uploads/\${filename}\`;
  await user.update({ avatar: avatarUrl });

  const userJson = user.toJSON();
  delete userJson.password;
  return userJson;
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  updateAvatar
};
`
);

createFile(
  "src/modules/auth/auth.repository.js",
  `const { User } = require('../../models');

const findByEmail = async (email) => {
  return User.findOne({ where: { email } });
};

const findById = async (id) => {
  return User.findByPk(id);
};

const create = async (data) => {
  return User.create(data);
};

module.exports = {
  findByEmail,
  findById,
  create
};
`
);

createFile(
  "src/modules/auth/auth.routes.js",
  `const express = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadAvatar } = require('../../middleware/upload.middleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} = require('./auth.validation');

const router = express.Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);

router.get('/me', authMiddleware, controller.getProfile);
router.put('/profile', authMiddleware, validate(updateProfileSchema), controller.updateProfile);
router.put('/change-password', authMiddleware, validate(changePasswordSchema), controller.changePassword);
router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), controller.updateAvatar);

module.exports = router;
`
);

/*
|--------------------------------------------------------------------------
| Generic Modules
|--------------------------------------------------------------------------
*/

const modules = [
  { name: "users", singular: "user" }
];

modules.forEach(({ name, singular }) => {
  const modelName = singular.charAt(0).toUpperCase() + singular.slice(1);

  createFile(
    `src/modules/${name}/${singular}.controller.js`,
    `const ${singular}Service = require('./${singular}.service');
const ApiResponse = require('../../utils/ApiResponse');

const index = async (req, res, next) => {
  try {
    const data = await ${singular}Service.getAll(req.query);
    return ApiResponse.success(res, data, '${modelName} list retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const show = async (req, res, next) => {
  try {
    const data = await ${singular}Service.getById(req.params.id);
    return ApiResponse.success(res, data, '${modelName} details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  index,
  show
};
`
  );

  createFile(
    `src/modules/${name}/${singular}.service.js`,
    `const repository = require('./${singular}.repository');
const ApiError = require('../../utils/ApiError');
const { getPagination, getPagingData } = require('../../utils/pagination');

const getAll = async (queryParams = {}) => {
  const { page = 1, limit = 10 } = queryParams;
  const pagination = getPagination(page, limit);

  const { count, rows } = await repository.findAndCountAll({
    ...queryParams,
    limit: pagination.limit,
    offset: pagination.offset
  });

  return getPagingData(count, rows, pagination.page, pagination.limit);
};

const getById = async (id) => {
  const item = await repository.findById(id);
  if (!item) {
    throw new ApiError(404, '${modelName} not found');
  }
  return item;
};

module.exports = {
  getAll,
  getById
};
`
  );

  createFile(
    `src/modules/${name}/${singular}.repository.js`,
    `const { Op } = require('sequelize');
const { ${modelName} } = require('../../models');

const findAndCountAll = async ({ search, status = 'active', limit, offset, sort_by = 'newest' }) => {
  const where = {};
  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    where.name = { [Op.like]: \`%\${search}%\` };
  }
  let order = [['created_at', 'DESC']];
  if (sort_by === 'oldest') {
    order = [['created_at', 'ASC']];
  }

  return ${modelName}.findAndCountAll({
    where,
    order,
    limit,
    offset,
    attributes: { exclude: ['password'] }
  });
};

const findById = async (id) => {
  return ${modelName}.findByPk(id, {
    attributes: { exclude: ['password'] }
  });
};

module.exports = {
  findAndCountAll,
  findById
};
`
  );

  createFile(
    `src/modules/${name}/${singular}.routes.js`,
    `const express = require('express');
const controller = require('./${singular}.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, controller.index);
router.get('/:id', authMiddleware, controller.show);

module.exports = router;
`
  );

  createFile(
    `src/modules/${name}/${singular}.validation.js`,
    `const Joi = require('joi');

const createSchema = Joi.object({});
const updateSchema = Joi.object({});

module.exports = {
  createSchema,
  updateSchema
};
`
  );
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

createFile(
  "src/routes/index.js",
  `const express = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router;
`
);

/*
|--------------------------------------------------------------------------
| App & Server
|--------------------------------------------------------------------------
*/

createFile(
  "src/app.js",
  `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const setupSwagger = require('./config/swagger');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(compression());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

// Setup Interactive Swagger UI Documentation
setupSwagger(app);

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is running smoothly',
    swagger_docs: 'http://localhost:5000/api-docs',
    timestamp: new Date().toISOString()
  });
});

// Main API Routes
app.use('/api', routes);

// 404 Handler
app.use(notFoundMiddleware);

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
`
);

createFile(
  "src/index.js",
  `const app = require('./app');
const env = require('./config/env');
const sequelize = require('./config/database');
const logger = require('./config/logger');

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');

    app.listen(env.port, () => {
      logger.info(\`Server running on port \${env.port}\`);
      console.log(\`🚀 API running at http://localhost:\${env.port}\`);
      console.log(\`📚 Swagger Docs available at http://localhost:\${env.port}/api-docs\`);
    });
  } catch (error) {
    logger.error({
      message: 'Unable to start server',
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

startServer();
`
);

/*
|--------------------------------------------------------------------------
| Environment & Config Files
|--------------------------------------------------------------------------
*/

createFile(
  ".env",
  `NODE_ENV=development
PORT=5000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=backend
DB_USER=root
DB_PASSWORD=

JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d
`
);

createFile(
  ".env.example",
  `NODE_ENV=development
PORT=5000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=backend
DB_USER=root
DB_PASSWORD=

JWT_SECRET=
JWT_EXPIRES_IN=7d
`
);

createFile(
  ".gitignore",
  `node_modules/
.env
.env.*
!.env.example

logs/*
!logs/.gitkeep

uploads/*
!uploads/.gitkeep

coverage/
.DS_Store
`
);

createFile(
  ".sequelizerc",
  `const path = require('path');

module.exports = {
  config: path.resolve('src', 'config', 'sequelize.config.js'),
  'models-path': path.resolve('src', 'models'),
  'seeders-path': path.resolve('src', 'database', 'seeders'),
  'migrations-path': path.resolve('src', 'database', 'migrations')
};
`
);

createFile(
  "README.md",
  `# Backend API Platform

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Production

\`\`\`bash
npm start
\`\`\`

## Database Migration & Sync

\`\`\`bash
npm run migrate
npm run db:sync
\`\`\`

## Resource Generator

\`\`\`bash
npm run make:resource -- Product
\`\`\`
`
);

createFile(
  "scripts/cli.js",
  `const path = require("path");
const { fork } = require("child_process");

const command = process.argv[2];
const extraArgs = process.argv.slice(3);

const commands = {
  "structure": {
    script: "create-structure.js",
    description: "Generate complete backend project structure"
  },
  "init": {
    script: "create-structure.js",
    description: "Generate complete backend project structure"
  },
  "create": {
    script: "create-structure.js",
    description: "Generate complete backend project structure"
  },
  "new": {
    script: "create-structure.js",
    description: "Generate complete backend project structure"
  },
  "make:module": {
    script: "make-module.js",
    description: "Generate a new feature module (controller, service, repository, routes, validation)"
  },
  "make:resource": {
    script: "make-resource.js",
    description: "Generate full resource stack (module + model + migration)"
  },
  "make:model": {
    script: "make-model.js",
    description: "Generate a new Sequelize model"
  },
  "make:controller": {
    script: "make-controller.js",
    description: "Generate a new controller file"
  },
  "make:service": {
    script: "make-service.js",
    description: "Generate a new service file"
  },
  "make:middleware": {
    script: "make-middleware.js",
    description: "Generate a new middleware file"
  },
  "make:migration": {
    script: "make-migration.js",
    description: "Generate an empty database migration"
  },
  "model:migration": {
    script: "generate-model-migration.js",
    description: "Generate migration from an existing model"
  },
  "make:notification": {
    script: "make-notification.js",
    description: "Generate a new HTML email notification service"
  },
  "make:email": {
    script: "make-notification.js",
    description: "Generate a new HTML email notification service"
  },
  "make:cron": {
    script: "make-cron.js",
    description: "Generate a new cron schedule job"
  },
  "make:schedule": {
    script: "make-cron.js",
    description: "Generate a new cron schedule job"
  },
  "make:job": {
    script: "make-cron.js",
    description: "Generate a new cron schedule job"
  },
  "make:seeder": {
    script: "make-seeder.js",
    description: "Generate a new database seeder"
  },
  "make:seed": {
    script: "make-seeder.js",
    description: "Generate a new database seeder"
  },
  "make:test": {
    script: "make-test.js",
    description: "Generate a new test suite file"
  },
  "make:event": {
    script: "make-event.js",
    description: "Generate a new event emitter & listener"
  },
  "make:listener": {
    script: "make-event.js",
    description: "Generate a new event emitter & listener"
  },
  "make:relation": {
    script: "make-relation.js",
    description: "Scaffold association between Sequelize models"
  },
  "make:association": {
    script: "make-relation.js",
    description: "Scaffold association between Sequelize models"
  },
  "route:list": {
    script: "route-list.js",
    description: "Display formatted table of all registered API endpoints"
  },
  "routes": {
    script: "route-list.js",
    description: "Display formatted table of all registered API endpoints"
  },
  "doctor": {
    script: "cli-doctor.js",
    description: "Run system health check & diagnostics"
  },
  "cli:doctor": {
    script: "cli-doctor.js",
    description: "Run system health check & diagnostics"
  },
  "db:sync": {
    target: path.join(process.cwd(), "src/database/sync.js"),
    description: "Sync Sequelize database tables"
  },
  "test:flow": {
    script: "test-api-flow.js",
    description: "Run API flow test suite"
  }
};

function printHelp() {
  console.log("\\n🛠️  Node Simple Scaffold CLI Tool\\n");
  console.log("Usage: node scripts/cli.js [command] [options/arguments]\\n");
  console.log("Available Commands:");
  console.log("═════════════════════════════════════════════════════════════════════════");
  for (const [name, info] of Object.entries(commands)) {
    console.log(\`  \${name.padEnd(20)} \${info.description}\`);
  }
  console.log("═════════════════════════════════════════════════════════════════════════\\n");
  console.log("Examples:");
  console.log("  node scripts/cli.js make:resource Product");
  console.log("  node scripts/cli.js make:module Payment");
  console.log("  node scripts/cli.js route:list");
  console.log("  node scripts/cli.js doctor\\n");
}

if (!command) {
  const menuScript = path.join(__dirname, "interactive-menu.js");
  if (require("fs").existsSync(menuScript)) {
    const child = fork(menuScript, [], { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }
  printHelp();
  process.exit(0);
}

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

const targetCmd = commands[command];
if (!targetCmd) {
  console.error(\`\\n❌ Unknown command: "\${command}"\\n\`);
  printHelp();
  process.exit(1);
}

const scriptPath = targetCmd.target || path.join(__dirname, targetCmd.script);

const child = fork(scriptPath, extraArgs, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code || 0);
});
`
);

// Copy generator scripts to target project's scripts folder
const packageScriptsDir = __dirname;
const targetScriptsDir = path.join(projectRoot, "scripts");
createDirectory(targetScriptsDir);

if (fs.existsSync(packageScriptsDir)) {
  const scriptFiles = fs.readdirSync(packageScriptsDir);
  scriptFiles.forEach((file) => {
    if (file.endsWith(".js") && file !== "create-structure.js" && file !== "cli.js") {
      const srcFile = path.join(packageScriptsDir, file);
      const destFile = path.join(targetScriptsDir, file);
      if (!fs.existsSync(destFile) || forceOverwrite) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`📄 Copied script: scripts/${file}`);
        stats.created++;
      }
    }
  });
}

createFile(
  "scripts/README.md",
  `# Backend CLI Code Generator & Utility Scripts

This directory contains custom CLI generator scripts designed to streamline project structure generation, module scaffolding, resource creation, database synchronization, database migrations, and automated verification for the Backend backend platform.

---

## 🛠️ Unified Master CLI Runner (\`scripts/cli.js\`)

All generators and utility scripts can be run through the central master CLI script \`scripts/cli.js\` or via NPM script aliases in \`package.json\`.

\`\`\`bash
# Display CLI Interactive Help Dashboard
node scripts/cli.js help
# or
npm run cli
\`\`\`

### Quick Command Reference

| Command | Master CLI Command | NPM Script Alias | Description |
|---|---|---|---|
| Master CLI | \`node scripts/cli.js\` | \`npm run cli\` | Master CLI dispatcher & help menu |
| Project Structure | \`node scripts/cli.js structure\` | \`npm run structure\` | Generate complete backend project structure |
| Resource Stack | \`node scripts/cli.js make:resource <Name>\` | \`npm run make:resource -- <Name>\` | Scaffolds model + migration + full API module |
| Feature Module | \`node scripts/cli.js make:module <Name>\` | \`npm run make:module -- <Name>\` | Scaffolds layered module folder (\`controller\`, \`service\`, \`repository\`, \`routes\`, \`validation\`) |
| Model | \`node scripts/cli.js make:model <Name>\` | \`npm run make:model -- <Name>\` | Generates a new Sequelize model |
| Controller | \`node scripts/cli.js make:controller <Name>\` | \`npm run make:controller -- <Name>\` | Generates a new controller file |
| Service | \`node scripts/cli.js make:service <Name>\` | \`npm run make:service -- <Name>\` | Generates a new service file |
| Middleware | \`node scripts/cli.js make:middleware <Name>\` | \`npm run make:middleware -- <Name>\` | Generates a new middleware file |
| Blank Migration | \`node scripts/cli.js make:migration <Name>\` | \`npm run make:migration -- <Name>\` | Generates a timestamped empty migration file |
| Model Migration | \`node scripts/cli.js model:migration <Name>\` | \`npm run model:migration -- <Name>\` | Generates migration schema based on a model |
| Database Sync | \`node scripts/cli.js db:sync\` | \`npm run db:sync\` | Syncs Sequelize models with database tables |
| Flow Test | \`node scripts/cli.js test:flow\` | \`node scripts/test-api-flow.js\` | Runs automated verification test suite |

---

## 📦 Required NPM Packages

To run the generator scripts, standard application modules, database ORM, and API engine, ensure the following packages are installed:

### Application & Runtime Dependencies
\`\`\`bash
npm install express sequelize mysql2 dotenv cors helmet compression joi jsonwebtoken bcryptjs multer morgan winston winston-daily-rotate-file swagger-ui-express swagger-jsdoc
\`\`\`

### Development & CLI Dependencies
\`\`\`bash
npm install --save-dev nodemon cross-env sequelize-cli
\`\`\`

### Dependency Breakdown:
| Package | Category | Purpose in Platform & Scaffolding |
|---|---|---|
| \`express\` | Core Framework | Web server framework used by generated controllers & routes |
| \`sequelize\` | ORM | Database model definition used by \`make:model\` & \`make:resource\` |
| \`mysql2\` | Database Driver | MySQL driver for Sequelize connection |
| \`joi\` | Validation | Data schema validation used in generated \`<module>.validation.js\` |
| \`jsonwebtoken\` | Authentication | Bearer JWT generation & verification |
| \`bcryptjs\` | Security | Password hashing utility |
| \`multer\` | Uploads | File & image upload handling middleware |
| \`cors\` & \`helmet\` | Security | Security headers and CORS policy configuration |
| \`compression\` | Performance | Response body compression |
| \`swagger-ui-express\` & \`swagger-jsdoc\` | Documentation | OpenAPI 3.0 interactive Swagger UI docs |
| \`winston\` & \`winston-daily-rotate-file\` | Logging | System error & access logger |
| \`sequelize-cli\` | Dev Tooling | Migration & seeder runner CLI |
| \`nodemon\` & \`cross-env\` | Dev Tooling | Hot-reloading development server environment |

---

## 🚀 Script Usage Guide

### 1. Project Structure Generation (\`create-structure.js\` / \`structure\`)
Generates complete backend architecture including directories, models, controllers, services, middleware, utilities, configuration, Swagger docs, and updates \`package.json\`.

\`\`\`bash
# Standard run
node scripts/cli.js structure

# Options:
# --force / -f         : Overwrite existing files
# --skip-install / -s  : Skip running npm install
node scripts/cli.js structure --force --skip-install
\`\`\`

---

### 2. Generate a Complete Resource (\`make:resource\`)
Scaffolds a complete feature stack: Model, Database Migration, and full API Module (\`controller\`, \`service\`, \`repository\`, \`routes\`, \`validation\`).

\`\`\`bash
node scripts/cli.js make:resource RepairRequest
# or
npm run make:resource -- RepairRequest
\`\`\`

**Generates:**
\`\`\`
src/
├── models/
│   └── RepairRequest.js
├── database/
│   └── migrations/
│       └── TIMESTAMP-create-repair-requests.js
└── modules/
    └── repair-requests/
        ├── repair-request.controller.js
        ├── repair-request.service.js
        ├── repair-request.repository.js
        ├── repair-request.routes.js
        └── repair-request.validation.js
\`\`\`

---

### 3. Generate a Standalone Module (\`make:module\`)
Creates a standard layered feature directory under \`src/modules/\` without generating models or migrations.

\`\`\`bash
node scripts/cli.js make:module payments
# or
npm run make:module -- payments
\`\`\`

**Generates:**
\`\`\`
src/modules/payments/
├── payment.controller.js
├── payment.service.js
├── payment.repository.js
├── payment.routes.js
└── payment.validation.js
\`\`\`

---

### 4. System Test & Verification Runner (\`test-api-flow.js\`)
Executes an automated test suite verifying database model registrations, foreign key associations, Express routing, and status constants.

\`\`\`bash
node scripts/cli.js test:flow
\`\`\`

---

## 📝 Naming Conventions & Rules

- **PascalCase** or **kebab-case** supported for arguments:
  - \`node scripts/cli.js make:resource PartListing\`
  - \`node scripts/cli.js make:resource part-listing\`
- **Output naming standard**:
  - Model: \`src/models/PartListing.js\`
  - Module directory: \`src/modules/part-listings/\`
  - File prefix: \`part-listing.controller.js\`, \`part-listing.service.js\`, etc.
- **Safety**: By default, generator scripts will **never overwrite** existing files (unless \`--force\` is explicitly provided to \`structure\`).
`
);

/*
|--------------------------------------------------------------------------
| Update package.json Scripts
|--------------------------------------------------------------------------
*/

const updatePackageScripts = () => {
  const pkgPath = path.join(projectRoot, "package.json");
  let pkg = {};

  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    } catch (e) {
      console.error("⚠️ Failed to parse existing package.json");
    }
  }

  if (!pkg.name) pkg.name = "backendapi";
  if (!pkg.version) pkg.version = "1.0.0";
  if (!pkg.main) pkg.main = "src/index.js";

  pkg.scripts = {
    ...(pkg.scripts || {}),
    "structure": "node scripts/cli.js structure",
    "dev": "cross-env NODE_ENV=development nodemon src/index.js",
    "start": "cross-env NODE_ENV=production node src/index.js",
    "cli": "node scripts/cli.js",
    "make:module": "node scripts/cli.js make:module",
    "make:resource": "node scripts/cli.js make:resource",
    "make:model": "node scripts/cli.js make:model",
    "make:controller": "node scripts/cli.js make:controller",
    "make:service": "node scripts/cli.js make:service",
    "make:middleware": "node scripts/cli.js make:middleware",
    "make:migration": "node scripts/cli.js make:migration",
    "model:migration": "node scripts/cli.js model:migration",
    "db:sync": "node scripts/cli.js db:sync",
    "db:seed:all": "sequelize-cli db:seed:all",
    "db:seed": "sequelize-cli db:seed --seed",
    "db:migrate:undo:all": "sequelize-cli db:migrate:undo:all",
    "db:migrate": "sequelize-cli db:migrate",
    "make:notification": "node scripts/cli.js make:notification",
    "make:email": "node scripts/cli.js make:notification",
    "make:cron": "node scripts/cli.js make:cron",
    "make:schedule": "node scripts/cli.js make:cron",
    "make:job": "node scripts/cli.js make:cron",
    "make:seeder": "node scripts/cli.js make:seeder",
    "make:seed": "node scripts/cli.js make:seeder",
    "make:test": "node scripts/cli.js make:test",
    "make:event": "node scripts/cli.js make:event",
    "make:listener": "node scripts/cli.js make:event",
    "make:relation": "node scripts/cli.js make:relation",
    "make:association": "node scripts/cli.js make:relation",
    "route:list": "node scripts/cli.js route:list",
    "routes": "node scripts/cli.js route:list",
    "doctor": "node scripts/cli.js doctor",
    "cli:doctor": "node scripts/cli.js doctor",
    "test:flow": "node scripts/cli.js test:flow"
  };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log("📄 Updated: package.json (scripts mapped to scripts/cli.js)");
};

updatePackageScripts();

/*
|--------------------------------------------------------------------------
| Dependencies Installation
|--------------------------------------------------------------------------
*/

if (skipInstall) {
  console.log("\n⏩ Skipping dependency installation (--skip-install specified)\n");
} else {
  console.log("\n📦 Installing dependencies...\n");

  try {
    execSync(
      `npm install express sequelize mysql2 dotenv cors helmet compression joi jsonwebtoken bcryptjs multer morgan winston winston-daily-rotate-file swagger-ui-express swagger-jsdoc nodemailer node-cron`,
      { stdio: "inherit", shell: true }
    );
    console.log("\n✅ Dependencies installed successfully!\n");
  } catch (error) {
    console.error("\n❌ Failed to install runtime dependencies.\n");
  }

  try {
    execSync(`npm install --save-dev nodemon cross-env sequelize-cli`, {
      stdio: "inherit",
      shell: true
    });
    console.log("\n✅ Dev dependencies installed successfully!\n");
  } catch (error) {
    console.error("\n❌ Failed to install dev dependencies.\n");
  }
}

/*
|--------------------------------------------------------------------------
| Finish
|--------------------------------------------------------------------------
*/

console.log("════════════════════════════════════════");
console.log("✅ Backend structure generated successfully");
console.log("════════════════════════════════════════");
console.log(`📊 Summary: ${stats.created} created | ${stats.overwritten} overwritten | ${stats.skipped} skipped\n`);
console.log("Next steps:");
console.log("1. Configure .env");
console.log("2. Ensure MySQL database exists");
console.log("3. Run: npm run dev\n");
