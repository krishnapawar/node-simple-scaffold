const fs = require('fs');
const path = require('path');

const sourceName = process.argv[2];
const targetName = process.argv[3];
const relationTypeInput = process.argv[4] || 'hasMany';

if (!sourceName || !targetName) {
  console.error('\n❌ Please provide source model, target model, and optional relation type.');
  console.log('Example:');
  console.log('  node scripts/cli.js make:relation User Order hasMany');
  console.log('  node scripts/cli.js make:relation Order User belongsTo\n');
  process.exit(1);
}

const pascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^./, (char) => char.toUpperCase());

const camelCase = (str) => {
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const sourcePascal = pascalCase(sourceName);
const targetPascal = pascalCase(targetName);
const validRelations = ['hasMany', 'belongsTo', 'hasOne', 'belongsToMany'];

const relationType = validRelations.find(
  (r) => r.toLowerCase() === relationTypeInput.toLowerCase()
) || 'hasMany';

const projectRoot = path.join(__dirname, '..');
const modelsDir = path.join(projectRoot, 'src', 'models');
const sourcePath = path.join(modelsDir, `${sourcePascal}.js`);

if (!fs.existsSync(sourcePath)) {
  console.error(`\n❌ Source model file not found: src/models/${sourcePascal}.js\n`);
  process.exit(1);
}

let sourceContent = fs.readFileSync(sourcePath, 'utf8');

// Determine foreignKey and alias
const foreignKey = `${camelCase(relationType === 'belongsTo' ? targetPascal : sourcePascal)}_id`;
const alias = relationType === 'hasMany' ? `${camelCase(targetPascal)}s` : camelCase(targetPascal);

const associationSnippet = `${sourcePascal}.${relationType}(models.${targetPascal}, { foreignKey: '${foreignKey}', as: '${alias}' });`;

if (sourceContent.includes(`models.${targetPascal}`)) {
  console.log(`⚠️ Association already exists in src/models/${sourcePascal}.js`);
  process.exit(0);
}

// Inject associate function or update existing associate function
const associateRegex = /([a-zA-Z0-9_]+)\.associate\s*=\s*(?:function)?\s*\(([^)]*)\)\s*\{([^}]*)\};?/;
const match = sourceContent.match(associateRegex);

if (match) {
  const existingBody = match[3];
  const updatedAssociate = `${sourcePascal}.associate = (${match[2]}) => {${existingBody}\n  ${associationSnippet}\n};`;
  sourceContent = sourceContent.replace(associateRegex, updatedAssociate);
} else {
  // Append associate method before module.exports
  const moduleExportsRegex = /module\.exports\s*=\s*([a-zA-Z0-9_]+);/;
  if (moduleExportsRegex.test(sourceContent)) {
    const newAssociateBlock = `\n${sourcePascal}.associate = (models) => {\n  ${associationSnippet}\n};\n\nmodule.exports = ${sourcePascal};`;
    sourceContent = sourceContent.replace(moduleExportsRegex, newAssociateBlock);
  } else {
    sourceContent += `\n${sourcePascal}.associate = (models) => {\n  ${associationSnippet}\n};\n`;
  }
}

fs.writeFileSync(sourcePath, sourceContent, 'utf8');
console.log(`\n✅ Model Association added: ${sourcePascal}.${relationType}(${targetPascal}) in src/models/${sourcePascal}.js\n`);
