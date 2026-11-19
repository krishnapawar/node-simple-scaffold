const fs = require('fs');
const path = require('path');
const { detectDatabaseType } = require('./db-helper');

const args = process.argv.slice(2);
const forceOverwrite = args.includes('--force') || args.includes('-f');

const projectRoot = process.cwd();
const isMongo = detectDatabaseType(projectRoot) === 'mongodb';

const authDir = path.join(projectRoot, 'src', 'modules', 'auth');
const modelsDir = path.join(projectRoot, 'src', 'models');
const middlewareDir = path.join(projectRoot, 'src', 'middleware');
const routesIndexPath = path.join(projectRoot, 'src', 'routes', 'index.js');
const uploadsDir = path.join(projectRoot, 'uploads');

console.log(`\n🔐 Scaffolding Authentication Module [${isMongo ? 'MongoDB' : 'MySQL'}]...\n`);

let stats = { created: 0, skipped: 0, overwritten: 0 };

const createDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created: ${path.relative(projectRoot, dir)}`);
  }
};

const createFile = (relativePath, content) => {
  const filePath = path.join(projectRoot, relativePath);
  createDirectory(path.dirname(filePath));

  const exists = fs.existsSync(filePath);
  if (exists && !forceOverwrite) {
    console.log(`⚠️ Already exists (skipped): ${relativePath}`);
    stats.skipped++;
    return;
  }

  fs.writeFileSync(filePath, content.trimStart(), 'utf8');
  if (exists && forceOverwrite) {
    console.log(`🔄 Overwritten: ${relativePath}`);
    stats.overwritten++;
  } else {
    console.log(`📄 Created: ${relativePath}`);
    stats.created++;
  }
};

// 1. Ensure required directories exist
createDirectory(authDir);
createDirectory(modelsDir);
createDirectory(middlewareDir);
createDirectory(uploadsDir);

if (!fs.existsSync(path.join(uploadsDir, '.gitkeep'))) {
  fs.writeFileSync(path.join(uploadsDir, '.gitkeep'), '');
}

// 2. Auth Module Files
createFile(
  'src/modules/auth/auth.validation.js',
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
  'src/modules/auth/auth.controller.js',
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
    return ApiResponse.success(res, result, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please upload an image file');
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
  'src/modules/auth/auth.service.js',
  `const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const authRepository = require('./auth.repository');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { hashPassword, comparePassword } = require('../../utils/helpers');

const register = async (userData) => {
  const existingUser = await authRepository.findByEmail(userData.email);
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const hashedPassword = await hashPassword(userData.password);
  const user = await authRepository.create({
    ...userData,
    password: hashedPassword
  });

  const userJson = user.toJSON ? user.toJSON() : { ...user };
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

  const token = jwt.sign({ id: user.id || user._id }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });

  const userJson = user.toJSON ? user.toJSON() : { ...user };
  delete userJson.password;

  return { user: userJson, token };
};

const getProfile = async (userId) => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const userJson = user.toJSON ? user.toJSON() : { ...user };
  delete userJson.password;
  return userJson;
};

const updateProfile = async (userId, data) => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (typeof user.update === 'function') {
    await user.update(data);
  } else {
    Object.assign(user, data);
    await user.save();
  }

  const updatedUser = user.toJSON ? user.toJSON() : { ...user };
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
  if (typeof user.update === 'function') {
    await user.update({ password: hashedPassword });
  } else {
    user.password = hashedPassword;
    await user.save();
  }
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
  if (typeof user.update === 'function') {
    await user.update({ avatar: avatarUrl });
  } else {
    user.avatar = avatarUrl;
    await user.save();
  }

  const userJson = user.toJSON ? user.toJSON() : { ...user };
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

if (isMongo) {
  createFile(
    'src/modules/auth/auth.repository.js',
    `const { User } = require('../../models');

const findByEmail = async (email) => {
  return User.findOne({ email });
};

const findById = async (id) => {
  return User.findById(id);
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
} else {
  createFile(
    'src/modules/auth/auth.repository.js',
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
}

createFile(
  'src/modules/auth/auth.routes.js',
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

// 3. Ensure User model exists
const userModelPath = path.join(modelsDir, 'User.js');
if (!fs.existsSync(userModelPath) || forceOverwrite) {
  if (isMongo) {
    createFile(
      'src/models/User.js',
      `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      default: null
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
`
    );
  } else {
    createFile(
      'src/models/User.js',
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

    const migrationsDir = path.join(projectRoot, 'src', 'database', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const existing = fs.readdirSync(migrationsDir);
      if (!existing.some((f) => f.includes('create-users'))) {
        const now = new Date();
        const pad = (v) => String(v).padStart(2, '0');
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        createFile(
          `src/database/migrations/${timestamp}-create-users.js`,
          `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      avatar: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('admin', 'user'),
        allowNull: false,
        defaultValue: 'user'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
`
        );
      }
    }
  }
}

// 4. Ensure auth.middleware.js exists
const authMiddlewarePath = path.join(middlewareDir, 'auth.middleware.js');
if (!fs.existsSync(authMiddlewarePath) || forceOverwrite) {
  createFile(
    'src/middleware/auth.middleware.js',
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
    const user = User.findByPk
      ? await User.findByPk(decoded.id)
      : await User.findById(decoded.id);

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
      message: 'Invalid or expired authorization token'
    });
  }
};

module.exports = authMiddleware;
`
  );
}

// 5. Ensure upload.middleware.js exists
const uploadMiddlewarePath = path.join(middlewareDir, 'upload.middleware.js');
if (!fs.existsSync(uploadMiddlewarePath) || forceOverwrite) {
  createFile(
    'src/middleware/upload.middleware.js',
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
}

// 6. Ensure auth dependencies are installed
const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  const requiredPkgs = isMongo
    ? ['jsonwebtoken', 'bcryptjs', 'multer', 'mongoose']
    : ['jsonwebtoken', 'bcryptjs', 'multer'];

  const missingPkgs = requiredPkgs.filter(
    (pkg) => !fs.existsSync(path.join(nodeModulesPath, pkg))
  );

  if (missingPkgs.length > 0) {
    console.log(`\n📦 Installing missing auth packages (${missingPkgs.join(', ')})...`);
    try {
      const { execSync } = require('child_process');
      execSync(`npm install ${missingPkgs.join(' ')}`, {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true
      });
      console.log('✅ Auth packages installed successfully!\n');
    } catch (e) {
      console.warn(`⚠️ Could not auto-install: npm install ${missingPkgs.join(' ')}`);
    }
  }
}

// 7. Auto-register route in src/routes/index.js
if (fs.existsSync(routesIndexPath)) {
  let indexContent = fs.readFileSync(routesIndexPath, 'utf8');
  const routeRequire = "const authRoutes = require('../modules/auth/auth.routes');";
  const routeUse = "router.use('/auth', authRoutes);";
  let modified = false;

  if (!indexContent.includes(routeUse)) {
    if (!indexContent.includes(routeRequire)) {
      const routerDecl = 'const router =';
      if (indexContent.includes(routerDecl)) {
        indexContent = indexContent.replace(routerDecl, `${routeRequire}\n\n${routerDecl}`);
        modified = true;
      }
    }
    const moduleExports = 'module.exports = router;';
    if (indexContent.includes(moduleExports)) {
      indexContent = indexContent.replace(moduleExports, `${routeUse}\n\n${moduleExports}`);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(routesIndexPath, indexContent, 'utf8');
      console.log('🔗 Auto-registered auth routes in src/routes/index.js -> /api/auth');
    }
  }
}

console.log('═════════════════════════════════════════════════════════════════════════');
console.log(`✅ Authentication module generated successfully! [${isMongo ? 'MongoDB' : 'MySQL'}]`);
console.log('═════════════════════════════════════════════════════════════════════════');
console.log(`📊 Summary: ${stats.created} created | ${stats.overwritten} overwritten | ${stats.skipped} skipped\n`);
console.log('Available Auth Endpoints:');
console.log('  POST  /api/auth/register          - Register new user account');
console.log('  POST  /api/auth/login             - Authenticate & receive Bearer JWT token');
console.log('  GET   /api/auth/me                - Get current user profile (Auth Bearer)');
console.log('  PUT   /api/auth/profile           - Update profile details (Auth Bearer)');
console.log('  PUT   /api/auth/change-password   - Update password (Auth Bearer)');
console.log('  POST  /api/auth/avatar            - Upload avatar image (Auth Bearer)\n');
