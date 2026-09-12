const fs = require("fs");
const path = require("path");

const name = process.argv[2];

if (!name) {
  console.error("\n❌ Please provide a controller name.");
  console.log("Example:\n  node scripts/cli.js make:controller Product\n  npm run make:controller -- User\n");
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

const projectRoot = process.cwd();
const modulePath = path.join(projectRoot, "src", "modules", pluralKebab);
const filePath = path.join(modulePath, `${singularKebab}.controller.js`);

fs.mkdirSync(modulePath, { recursive: true });

if (fs.existsSync(filePath)) {
  console.log(`⚠️ Controller already exists: ${singularKebab}.controller.js`);
  process.exit(0);
}

const content = `const ${camelName}Service = require('./${singularKebab}.service');
const ApiResponse = require('../../utils/ApiResponse');

const index = async (req, res, next) => {
  try {
    const data = await ${camelName}Service.getAll(req.query);
    return ApiResponse.success(res, data, '${pascalName} list retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const show = async (req, res, next) => {
  try {
    const data = await ${camelName}Service.getById(req.params.id);
    return ApiResponse.success(res, data, '${pascalName} details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  index,
  show
};
`;

fs.writeFileSync(filePath, content, "utf8");
console.log(`\n✅ Controller created: src/modules/${pluralKebab}/${singularKebab}.controller.js\n`);
