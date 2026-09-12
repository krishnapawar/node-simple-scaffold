const fs = require('fs');
const path = require('path');

const moduleName = process.argv[2];

if (!moduleName) {
    console.error('\n❌ Please provide a module name.\n');
    console.log('Example:');
    console.log('  node scripts/cli.js make:module Product');
    console.log('  npm run make:module -- products\n');
    process.exit(1);
}

const projectRoot = process.cwd();

// Helper casing converters
const kebabCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
};

const pascalCase = (str) => {
    return str
        .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
        .replace(/^./, (char) => char.toUpperCase());
};

const camelCase = (str) => {
    const pascal = pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const normalizedKebab = kebabCase(moduleName.trim());
const singularKebab = normalizedKebab.replace(/s$/, '');
const pluralKebab = singularKebab.endsWith('s') ? singularKebab : `${singularKebab}s`;
const pascalName = pascalCase(singularKebab);
const camelName = camelCase(singularKebab);

const modulePath = path.join(projectRoot, 'src', 'modules', pluralKebab);

console.log(`\n🚀 Generating module stack for: ${pascalName} (${pluralKebab})\n`);

fs.mkdirSync(modulePath, { recursive: true });

// Boilerplate generators
const templates = {
    [`${singularKebab}.validation.js`]: `const Joi = require('joi');

const create${pascalName}Schema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid('active', 'inactive').default('active')
});

const update${pascalName}Schema = Joi.object({
    name: Joi.string().min(2).max(255),
    description: Joi.string().allow('', null),
    status: Joi.string().valid('active', 'inactive')
});

module.exports = {
    create${pascalName}Schema,
    update${pascalName}Schema
};
`,

    [`${singularKebab}.repository.js`]: `const { Op } = require('sequelize');
const db = require('../../models');
const ${pascalName} = db.${pascalName};

const findAndCountAll = async ({ search, status = 'active', limit, offset, sort_by = 'newest' }) => {
    const where = {};

    if (status && status !== 'all') {
        where.status = status;
    }

    if (search && ${pascalName} && ${pascalName}.rawAttributes && ${pascalName}.rawAttributes.name) {
        where.name = { [Op.like]: \`%\${search}%\` };
    }

    let order = [['created_at', 'DESC']];
    if (sort_by === 'oldest') {
        order = [['created_at', 'ASC']];
    }

    if (${pascalName}) {
        return ${pascalName}.findAndCountAll({
            where,
            order,
            limit,
            offset,
            distinct: true
        });
    }

    return { count: 0, rows: [] };
};

const findById = async (id) => {
    if (${pascalName}) {
        return ${pascalName}.findByPk(id);
    }
    return null;
};

const create = async (data) => {
    if (${pascalName}) {
        return ${pascalName}.create(data);
    }
    return data;
};

const update = async (id, data) => {
    if (${pascalName}) {
        await ${pascalName}.update(data, { where: { id } });
        return findById(id);
    }
    return data;
};

const deleteById = async (id) => {
    if (${pascalName}) {
        return ${pascalName}.destroy({ where: { id } });
    }
    return true;
};

module.exports = {
    findAndCountAll,
    findById,
    create,
    update,
    deleteById
};
`,

    [`${singularKebab}.service.js`]: `const ${camelName}Repository = require('./${singularKebab}.repository');
const ApiError = require('../../utils/ApiError');
const { getPagination, getPagingData } = require('../../utils/pagination');

const getAll = async (queryParams) => {
    const { page = 1, limit = 10 } = queryParams;
    const pagination = getPagination(page, limit);

    const { count, rows } = await ${camelName}Repository.findAndCountAll({
        ...queryParams,
        limit: pagination.limit,
        offset: pagination.offset
    });

    return getPagingData(count, rows, pagination.page, pagination.limit);
};

const getById = async (id) => {
    const item = await ${camelName}Repository.findById(id);
    if (!item) {
        throw new ApiError(404, '${pascalName} not found');
    }
    return item;
};

const create = async (data) => {
    return ${camelName}Repository.create(data);
};

const update = async (id, data) => {
    const item = await ${camelName}Repository.findById(id);
    if (!item) {
        throw new ApiError(404, '${pascalName} not found');
    }
    return ${camelName}Repository.update(id, data);
};

const deleteItem = async (id) => {
    const item = await ${camelName}Repository.findById(id);
    if (!item) {
        throw new ApiError(404, '${pascalName} not found');
    }
    await ${camelName}Repository.deleteById(id);
    return { message: '${pascalName} deleted successfully' };
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    deleteItem
};
`,

    [`${singularKebab}.controller.js`]: `const ${camelName}Service = require('./${singularKebab}.service');
const ApiResponse = require('../../utils/ApiResponse');

const index = async (req, res, next) => {
    try {
        const result = await ${camelName}Service.getAll(req.query);
        return ApiResponse.success(res, result, '${pascalName} list retrieved successfully');
    } catch (error) {
        next(error);
    }
};

const show = async (req, res, next) => {
    try {
        const result = await ${camelName}Service.getById(req.params.id);
        return ApiResponse.success(res, result, '${pascalName} details retrieved successfully');
    } catch (error) {
        next(error);
    }
};

const store = async (req, res, next) => {
    try {
        const result = await ${camelName}Service.create(req.body);
        return ApiResponse.success(res, result, '${pascalName} created successfully', 201);
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const result = await ${camelName}Service.update(req.params.id, req.body);
        return ApiResponse.success(res, result, '${pascalName} updated successfully');
    } catch (error) {
        next(error);
    }
};

const destroy = async (req, res, next) => {
    try {
        const result = await ${camelName}Service.deleteItem(req.params.id);
        return ApiResponse.success(res, result, '${pascalName} deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    index,
    show,
    store,
    update,
    destroy
};
`,

    [`${singularKebab}.routes.js`]: `const express = require('express');
const ${camelName}Controller = require('./${singularKebab}.controller');
const validate = require('../../middleware/validate.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { create${pascalName}Schema, update${pascalName}Schema } = require('./${singularKebab}.validation');

const router = express.Router();

router.get('/', ${camelName}Controller.index);
router.get('/:id', ${camelName}Controller.show);
router.post('/', authMiddleware, validate(create${pascalName}Schema), ${camelName}Controller.store);
router.put('/:id', authMiddleware, validate(update${pascalName}Schema), ${camelName}Controller.update);
router.delete('/:id', authMiddleware, ${camelName}Controller.destroy);

module.exports = router;
`
};

Object.entries(templates).forEach(([fileName, content]) => {
    const filePath = path.join(modulePath, fileName);

    if (fs.existsSync(filePath)) {
        console.log(`⚠️ Already exists: ${fileName}`);
        return;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`📄 Created module file: ${fileName}`);
});

// Auto-register route in src/routes/index.js
const indexRoutesPath = path.join(projectRoot, 'src', 'routes', 'index.js');
if (fs.existsSync(indexRoutesPath)) {
    let indexContent = fs.readFileSync(indexRoutesPath, 'utf8');
    const routeRequire = `const ${camelName}Routes = require('../modules/${pluralKebab}/${singularKebab}.routes');`;
    const routeUse = `router.use('/${pluralKebab}', ${camelName}Routes);`;

    if (!indexContent.includes(routeUse)) {
        if (!indexContent.includes(routeRequire)) {
            const routerDecl = 'const router =';
            if (indexContent.includes(routerDecl)) {
                indexContent = indexContent.replace(routerDecl, `${routeRequire}\n\n${routerDecl}`);
            }
        }
        const moduleExports = 'module.exports = router;';
        if (indexContent.includes(moduleExports)) {
            indexContent = indexContent.replace(moduleExports, `${routeUse}\n\n${moduleExports}`);
            fs.writeFileSync(indexRoutesPath, indexContent, 'utf8');
            console.log(`🔗 Auto-registered route in src/routes/index.js -> /api/${pluralKebab}`);
        }
    }
}

console.log(`\n✅ Module '${pluralKebab}' generated successfully!\n`);