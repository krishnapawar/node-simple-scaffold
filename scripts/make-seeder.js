const fs = require('fs');
const path = require('path');

const name = process.argv[2];

if (!name) {
  console.error('\n❌ Please provide a seeder name.');
  console.log('Example:');
  console.log('  node scripts/cli.js make:seeder Product');
  console.log('  npm run make:seeder -- users\n');
  process.exit(1);
}

const kebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const pascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^./, (char) => char.toUpperCase());

const cleanName = name
  .replace(/seeder$/i, '')
  .replace(/seed$/i, '')
  .replace(/\.js$/, '');

const normalizedKebab = kebabCase(cleanName.trim());
const singularKebab = normalizedKebab.replace(/s$/, '');
const pluralKebab = singularKebab.endsWith('s') ? singularKebab : `${singularKebab}s`;
const pascalName = pascalCase(singularKebab);

const projectRoot = process.cwd();
const { detectDatabaseType } = require('./db-helper');
const isMongo = detectDatabaseType(projectRoot) === 'mongodb';
const seedersDir = path.join(projectRoot, 'src', 'database', 'seeders');

fs.mkdirSync(seedersDir, { recursive: true });

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0')
].join('');

const fileName = `${timestamp}-seed-${pluralKebab}.js`;
const filePath = path.join(seedersDir, fileName);

const content = isMongo
  ? `const connectDB = require('../../config/database');
const { ${pascalName} } = require('../../models');

const seed${pascalName} = async () => {
  await connectDB();
  const samples = [
    { name: 'Sample ${pascalName} 1', status: 'active' },
    { name: 'Sample ${pascalName} 2', status: 'active' }
  ];

  if (${pascalName}) {
    await ${pascalName}.insertMany(samples);
    console.log('✅ Seeded ${pascalName} collection successfully');
  }
};

module.exports = seed${pascalName};

if (require.main === module) {
  seed${pascalName}()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
`
  : `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      '${pluralKebab}',
      [
        {
          name: 'Sample ${pascalName} 1',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Sample ${pascalName} 2',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('${pluralKebab}', null, {});
  }
};
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Database seeder created: src/database/seeders/${fileName} [${isMongo ? 'Mongoose' : 'Sequelize'}]\n`);
