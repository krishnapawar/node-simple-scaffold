const fs = require("fs");
const path = require("path");

const name = process.argv[2];

if (!name) {
  console.error("\n❌ Please provide a middleware name.");
  console.log("Example:\n  node scripts/cli.js make:middleware rateLimiter\n  npm run make:middleware -- rateLimiter\n");
  process.exit(1);
}

const camelCase = (str) => {
  const clean = str.replace(/\.middleware\.js$/, "").replace(/\.js$/, "");
  const p = clean
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^./, (char) => char.toUpperCase());
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const camelName = camelCase(name.trim());
const middlewarePath = path.join(process.cwd(), "src", "middleware");
const fileName = `${camelName}.middleware.js`;
const filePath = path.join(middlewarePath, fileName);

fs.mkdirSync(middlewarePath, { recursive: true });

if (fs.existsSync(filePath)) {
  console.log(`⚠️ Middleware already exists: ${fileName}`);
  process.exit(0);
}

const content = `const ${camelName}Middleware = (req, res, next) => {
  try {
    // Middleware logic here
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = ${camelName}Middleware;
`;

fs.writeFileSync(filePath, content, "utf8");
console.log(`\n✅ Middleware created: src/middleware/${fileName}\n`);
