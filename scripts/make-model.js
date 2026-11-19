const fs = require("fs");
const path = require("path");
const { detectDatabaseType } = require("./db-helper");

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

const camelCase = (str) => {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const cleanName = name.replace(/s$/, "");
const pascalName = pascalCase(cleanName);
const camelName = camelCase(cleanName);
const tableName = snakeCase(pascalName.endsWith("s") ? pascalName : `${pascalName}s`);

const modelsPath = path.join(process.cwd(), "src", "models");
const filePath = path.join(modelsPath, `${pascalName}.js`);

fs.mkdirSync(modelsPath, { recursive: true });

if (fs.existsSync(filePath)) {
  console.log(`⚠️ Model already exists: ${pascalName}.js`);
  process.exit(0);
}

const isMongo = detectDatabaseType(process.cwd()) === "mongodb";

const content = isMongo
  ? `const mongoose = require('mongoose');

const ${camelName}Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
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

${camelName}Schema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const ${pascalName} = mongoose.model('${pascalName}', ${camelName}Schema);

module.exports = ${pascalName};
`
  : `const { DataTypes } = require('sequelize');
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
console.log(`\n✅ Model created: src/models/${pascalName}.js [${isMongo ? 'Mongoose' : 'Sequelize'}]\n`);
