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

console.log("\n🚀 Creating lightweight backend project structure...\n");

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
| Directories (Lightweight Starter)
|--------------------------------------------------------------------------
*/

const folders = [
  "src/config",
  "src/database/migrations",
  "src/database/seeders",
  "src/modules/users",
  "src/models",
  "src/middleware",
  "src/routes",
  "src/utils",
  "src/constants",
  "uploads",
  "tests",
];

folders.forEach((folder) => {
  createDirectory(path.join(projectRoot, folder));
});

// Create .gitkeep files in empty tracking directories
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
  `const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\\s+/g, '-')
    .replace(/[^\\w\\-]+/g, '')
    .replace(/\\-\\-+/g, '-');
};

const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const hashPassword = async (password) => {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  slugify,
  generateRandomString,
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

// Auth module is scaffolded on-demand via: node scripts/cli.js make:auth

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

const router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);

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

const userRoutes = require('../modules/users/user.routes');

const router = express.Router();

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

## CLI Code Generators (NPX)

Run all generators via \`npx node-simple-scaffold\` or the shortcut \`npx scaffold\`:

\`\`\`bash
# Interactive studio
npx scaffold

# Scaffold authentication (register, login, JWT)
npx scaffold make:auth

# Scaffold full resource stack (model + migration + module)
npx scaffold make:resource Product

# Scaffold feature module
npx scaffold make:module Payment

# View all registered endpoints
npx scaffold route:list

# System diagnostics & health check
npx scaffold doctor
\`\`\`
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
    "dev": "cross-env NODE_ENV=development nodemon src/index.js",
    "start": "cross-env NODE_ENV=production node src/index.js",
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:undo:all": "sequelize-cli db:migrate:undo:all",
    "db:seed:all": "sequelize-cli db:seed:all",
    "db:seed": "sequelize-cli db:seed --seed"
  };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log("📄 Updated: package.json (dev, start, db scripts)");
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
      `npm install express sequelize mysql2 dotenv cors helmet compression joi morgan winston winston-daily-rotate-file swagger-ui-express swagger-jsdoc`,
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
console.log("✅ Lightweight backend structure generated successfully");
console.log("════════════════════════════════════════");
console.log(`📊 Summary: ${stats.created} created | ${stats.overwritten} overwritten | ${stats.skipped} skipped\n`);
console.log("Next steps:");
console.log("1. Configure .env");
console.log("2. Ensure MySQL database exists");
console.log("3. Run: npm run dev\n");
console.log("CLI Code Generator (NPX):");
console.log("  npx scaffold make:auth         - Scaffold authentication module");
console.log("  npx scaffold make:resource <M> - Scaffold full resource (model + migration + module)");
console.log("  npx scaffold make:module <M>   - Scaffold layered module");
console.log("  npx scaffold route:list        - View all registered routes");
console.log("  npx scaffold doctor            - System health check & diagnostics\n");
