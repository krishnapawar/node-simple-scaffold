const fs = require("fs");
const path = require("path");

const name = process.argv[2];

if (!name) {
  console.error("\n❌ Please provide a model name.");
  console.log("Example:\n  node scripts/cli.js make:model Vehicle\n  npm run make:model -- Vehicle\n");
  process.exit(1);
}

const snakeCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();

const pascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^./, (char) => char.toUpperCase());

const cleanName = name.replace(/s$/, "");
const pascalName = pascalCase(cleanName);
const tableName = snakeCase(pascalName.endsWith("s") ? pascalName : `${pascalName}s`);

const modelsPath = path.join(__dirname, "..", "src", "models");
const filePath = path.join(modelsPath, `${pascalName}.js`);

fs.mkdirSync(modelsPath, { recursive: true });

if (fs.existsSync(filePath)) {
  console.log(`⚠️ Model already exists: ${pascalName}.js`);
  process.exit(0);
}

const content = `const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ${pascalName} = sequelize.define(
  '${pascalName}',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    }
  },
  {
    tableName: '${tableName}',
    timestamps: true,
    underscored: true
  }
);

module.exports = ${pascalName};
`;

fs.writeFileSync(filePath, content, "utf8");
console.log(`\n✅ Model created: src/models/${pascalName}.js\n`);
