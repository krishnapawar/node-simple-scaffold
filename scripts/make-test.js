const fs = require('fs');
const path = require('path');

const name = process.argv[2];

if (!name) {
  console.error('\n❌ Please provide a test suite name.');
  console.log('Example:');
  console.log('  node scripts/cli.js make:test Payment');
  console.log('  npm run make:test -- payment-service\n');
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
  .replace(/\.test\.js$/, '')
  .replace(/\.spec\.js$/, '')
  .replace(/test$/i, '')
  .replace(/spec$/i, '');

const normalizedKebab = kebabCase(cleanName.trim());
const singularKebab = normalizedKebab.replace(/s$/, '');
const pascalName = pascalCase(singularKebab);

const projectRoot = path.join(__dirname, '..');
const testsDir = path.join(projectRoot, 'tests');
const filePath = path.join(testsDir, `${singularKebab}.test.js`);

fs.mkdirSync(testsDir, { recursive: true });

if (fs.existsSync(filePath)) {
  console.log(`⚠️ Test file already exists: ${singularKebab}.test.js`);
  process.exit(0);
}

const content = `const assert = require('assert');

describe('${pascalName} Test Suite', () => {
  before(async () => {
    // Global setup before running ${pascalName} tests
  });

  after(async () => {
    // Global teardown after running ${pascalName} tests
  });

  it('should pass initial sanity check for ${pascalName}', async () => {
    assert.strictEqual(1 + 1, 2, 'Basic sanity assertion');
  });

  it('should validate ${pascalName} data structure', async () => {
    const mock${pascalName} = {
      id: 1,
      name: 'Test ${pascalName}',
      status: 'active'
    };

    assert.ok(mock${pascalName}.id, '${pascalName} should have an id');
    assert.strictEqual(mock${pascalName}.status, 'active');
  });
});
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ Test suite created: tests/${singularKebab}.test.js\n`);
