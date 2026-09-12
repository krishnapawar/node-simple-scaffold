const fs = require("fs");
const path = require("path");

// Help / usage message
function printUsage() {
    console.error("\n❌ Please provide a model name.\n");
    console.log("Usage:");
    console.log("  node scripts/cli.js model:migration User");
    console.log("  npm run model:migration -- User\n");

    const modelsPath = path.join(process.cwd(), "src/models");
    if (fs.existsSync(modelsPath)) {
        const availableModels = fs.readdirSync(modelsPath)
            .filter((f) => f.endsWith(".js") && f !== "index.js")
            .map((f) => f.replace(/\.js$/, ""));

        if (availableModels.length > 0) {
            console.log("Available Models in src/models/:");
            availableModels.forEach((m) => console.log(`  - ${m}`));
            console.log("");
        }
    }
}

// Convert attribute type to Sequelize string representation
function convertType(attribute) {
    const type = attribute.type;
    if (!type || !type.constructor) return "Sequelize.STRING";

    const key = type.constructor.key || type.key;
    let typeStr = "";

    switch (key) {
        case "BIGINT":
            typeStr = "Sequelize.BIGINT";
            break;
        case "INTEGER":
            typeStr = "Sequelize.INTEGER";
            break;
        case "SMALLINT":
            typeStr = "Sequelize.SMALLINT";
            break;
        case "TINYINT":
            typeStr = "Sequelize.TINYINT";
            break;
        case "STRING":
            if (type.options && type.options.length) {
                typeStr = `Sequelize.STRING(${type.options.length})`;
            } else {
                typeStr = "Sequelize.STRING";
            }
            break;
        case "TEXT":
            typeStr = "Sequelize.TEXT";
            break;
        case "BOOLEAN":
            typeStr = "Sequelize.BOOLEAN";
            break;
        case "DATE":
            typeStr = "Sequelize.DATE";
            break;
        case "DATEONLY":
            typeStr = "Sequelize.DATEONLY";
            break;
        case "DECIMAL": {
            const { precision, scale } = type.options || {};
            if (precision !== undefined && scale !== undefined) {
                typeStr = `Sequelize.DECIMAL(${precision}, ${scale})`;
            } else if (precision !== undefined) {
                typeStr = `Sequelize.DECIMAL(${precision})`;
            } else {
                typeStr = "Sequelize.DECIMAL";
            }
            break;
        }
        case "FLOAT":
            typeStr = "Sequelize.FLOAT";
            break;
        case "DOUBLE":
            typeStr = "Sequelize.DOUBLE";
            break;
        case "JSON":
            typeStr = "Sequelize.JSON";
            break;
        case "UUID":
            typeStr = "Sequelize.UUID";
            break;
        case "ENUM": {
            const values = (type.values || []).map((v) => `'${v}'`).join(", ");
            typeStr = `Sequelize.ENUM(${values})`;
            break;
        }
        default:
            typeStr = `Sequelize.${key || "STRING"}`;
    }

    if (attribute.type.options?.unsigned) {
        typeStr += ".UNSIGNED";
    }

    if (attribute.type.options?.zerofill) {
        typeStr += ".ZEROFILL";
    }

    return typeStr;
}

// Convert default values cleanly
function formatDefaultValue(defaultValue) {
    if (defaultValue === undefined) return undefined;
    if (defaultValue === null) return "null";

    if (typeof defaultValue === "boolean" || typeof defaultValue === "number") {
        return String(defaultValue);
    }

    if (typeof defaultValue === "string") {
        return `'${defaultValue}'`;
    }

    if (defaultValue?.key === "NOW" || defaultValue === Symbol.for("NOW")) {
        return "Sequelize.NOW";
    }

    if (typeof defaultValue === "object") {
        if (defaultValue.val) {
            // Sequelize.literal
            return `Sequelize.literal('${defaultValue.val}')`;
        }
        if (defaultValue.fn) {
            // Sequelize.fn
            return `Sequelize.fn('${defaultValue.fn}', ${defaultValue.args?.map((a) => `'${a}'`).join(", ") || ""})`;
        }
        return JSON.stringify(defaultValue);
    }

    return String(defaultValue);
}

function generateModelMigration(rawModelName) {
    if (!rawModelName) {
        printUsage();
        process.exit(1);
    }

    const modelsPath = path.join(process.cwd(), "src/models");
    const migrationsPath = path.join(process.cwd(), "src/database/migrations");

    // Clean model name input
    const cleanName = rawModelName.replace(/\.js$/, "").trim();

    if (!fs.existsSync(modelsPath)) {
        console.error(`\n❌ Models directory not found: ${modelsPath}\n`);
        process.exit(1);
    }

    // Flexible model file lookup (case-insensitive)
    const modelFiles = fs.readdirSync(modelsPath);
    const matchedFile = modelFiles.find(
        (f) => f.toLowerCase() === `${cleanName.toLowerCase()}.js`
    );

    if (!matchedFile) {
        console.error(`\n❌ Model file not found for: "${rawModelName}"\n`);
        printUsage();
        process.exit(1);
    }

    const modelFile = path.join(modelsPath, matchedFile);

    if (!fs.existsSync(migrationsPath)) {
        fs.mkdirSync(migrationsPath, { recursive: true });
    }

    try {
        delete require.cache[require.resolve(modelFile)];
        const model = require(modelFile);

        if (!model || typeof model.getTableName !== "function") {
            console.error(`\n❌ Invalid Sequelize model in ${matchedFile}.\n`);
            process.exit(1);
        }

        const tableName = model.getTableName();
        const rawAttributes = { ...model.rawAttributes };

        // Ensure timestamp columns exist if model has timestamps enabled
        const isUnderscored = model.options?.underscored;
        const hasTimestamps = model.options?.timestamps !== false;

        const createdAtCol = isUnderscored ? "created_at" : "createdAt";
        const updatedAtCol = isUnderscored ? "updated_at" : "updatedAt";

        if (hasTimestamps) {
            if (!rawAttributes[createdAtCol]) {
                rawAttributes[createdAtCol] = {
                    type: { constructor: { key: "DATE" } },
                    allowNull: false,
                    defaultValue: "NOW"
                };
            }
            if (!rawAttributes[updatedAtCol]) {
                rawAttributes[updatedAtCol] = {
                    type: { constructor: { key: "DATE" } },
                    allowNull: false,
                    defaultValue: "NOW"
                };
            }
        }

        const fieldStrings = [];

        for (const [name, attribute] of Object.entries(rawAttributes)) {
            const lines = [];
            lines.push(`            ${name}: {`);

            const typeStr = convertType(attribute);
            lines.push(`                type: ${typeStr},`);

            if (attribute.allowNull !== undefined) {
                lines.push(`                allowNull: ${attribute.allowNull},`);
            }

            if (attribute.autoIncrement) {
                lines.push("                autoIncrement: true,");
            }

            if (attribute.primaryKey) {
                lines.push("                primaryKey: true,");
            }

            if (attribute.unique) {
                lines.push("                unique: true,");
            }

            // Handle Foreign Key references
            if (attribute.references) {
                const refModel = typeof attribute.references.model === "string"
                    ? `'${attribute.references.model}'`
                    : `'${attribute.references.model?.tableName || attribute.references.model}'`;
                const refKey = attribute.references.key ? `'${attribute.references.key}'` : "'id'";

                lines.push("                references: {");
                lines.push(`                    model: ${refModel},`);
                lines.push(`                    key: ${refKey}`);
                lines.push("                },");

                if (attribute.onUpdate) {
                    lines.push(`                onUpdate: '${attribute.onUpdate}',`);
                }
                if (attribute.onDelete) {
                    lines.push(`                onDelete: '${attribute.onDelete}',`);
                }
            }

            const defValStr = formatDefaultValue(attribute.defaultValue);
            if (defValStr !== undefined) {
                lines.push(`                defaultValue: ${defValStr},`);
            }

            lines.push("            }");
            fieldStrings.push(lines.join("\n"));
        }

        // Timestamp for file naming
        const now = new Date();
        const pad = (v) => String(v).padStart(2, "0");
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

        const fileName = `${timestamp}-create-${tableName}.js`;
        const migrationFilePath = path.join(migrationsPath, fileName);

        // Check for existing migration for this table
        const existingMigrations = fs.readdirSync(migrationsPath)
            .filter((f) => f.includes(`create-${tableName}.js`));

        if (existingMigrations.length > 0) {
            console.log(`⚠️ Note: Previous migration(s) for table '${tableName}' found:`);
            existingMigrations.forEach((f) => console.log(`   - ${f}`));
        }

        const migrationContent = `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('${tableName}', {
${fieldStrings.join(",\n\n")}
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('${tableName}');
    }
};
`;

        fs.writeFileSync(migrationFilePath, migrationContent);

        console.log("\n════════════════════════════════════");
        console.log("✅ Migration generated successfully!");
        console.log("════════════════════════════════════");
        console.log(`📦 Model: ${cleanName}`);
        console.log(`🗃️  Table: ${tableName}`);
        console.log(`📄 File: ${fileName}\n`);

        return migrationFilePath;

    } catch (error) {
        console.error("\n❌ Migration generation failed:\n");
        console.error(error);
        process.exit(1);
    }
}

// Run from command line if executed directly
if (require.main === module) {
    const inputModel = process.argv[2];
    generateModelMigration(inputModel);
}

module.exports = generateModelMigration;
