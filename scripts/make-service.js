const fs = require("fs");
const path = require("path");

const name = process.argv[2];

if (!name) {
  console.error("\n❌ Please provide a service name.");
  console.log("Example:\n  node scripts/cli.js make:service Payment\n  npm run make:service -- Payment\n");
  process.exit(1);
}

const kebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const pascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^./, (char) => char.toUpperCase());

const camelCase = (str) => {
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const normalizedKebab = kebabCase(name.trim());
const singularKebab = normalizedKebab.replace(/s$/, "");
const pluralKebab = singularKebab.endsWith("s") ? singularKebab : `${singularKebab}s`;
const pascalName = pascalCase(singularKebab);
const camelName = camelCase(singularKebab);

const projectRoot = path.join(__dirname, "..");
const modulePath = path.join(projectRoot, "src", "modules", pluralKebab);
const filePath = path.join(modulePath, `${singularKebab}.service.js`);

fs.mkdirSync(modulePath, { recursive: true });

if (fs.existsSync(filePath)) {
  console.log(`⚠️ Service already exists: ${singularKebab}.service.js`);
  process.exit(0);
}

const content = `const ${camelName}Repository = require('./${singularKebab}.repository');
const ApiError = require('../../utils/ApiError');
const { getPagination, getPagingData } = require('../../utils/pagination');

const getAll = async (queryParams = {}) => {
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

module.exports = {
  getAll,
  getById
};
`;

fs.writeFileSync(filePath, content, "utf8");
console.log(`\n✅ Service created: src/modules/${pluralKebab}/${singularKebab}.service.js\n`);
