const fs = require('fs');
const path = require('path');

const customName = process.argv[2];
const projectRoot = process.cwd();
const constantsDir = path.join(projectRoot, 'src', 'constants');

if (!fs.existsSync(constantsDir)) {
  fs.mkdirSync(constantsDir, { recursive: true });
  console.log(`📁 Created: src/constants`);
}

const createFile = (filename, content) => {
  const filePath = path.join(constantsDir, filename);
  if (fs.existsSync(filePath)) {
    console.log(`⚠️ Already exists: src/constants/${filename}`);
  } else {
    fs.writeFileSync(filePath, content.trimStart(), 'utf8');
    console.log(`📄 Created: src/constants/${filename}`);
  }
};

const camelCase = (str) =>
  str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^./, (char) => char.toLowerCase());

if (customName && !customName.startsWith('-')) {
  const clean = customName.replace(/\.js$/, '');
  const propName = camelCase(clean);
  const content = `module.exports = Object.freeze({
  DEFAULT: 'default'
});
`;
  createFile(`${clean}.js`, content);
  console.log(`\n✅ Constant '${clean}' created in src/constants/${clean}.js\n`);
  process.exit(0);
}

// Default constants scaffolding
createFile(
  'roles.js',
  `module.exports = Object.freeze({
  ADMIN: 'admin',
  USER: 'user'
});
`
);

createFile(
  'statusCodes.js',
  `module.exports = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
});
`
);

createFile(
  'index.js',
  `const roles = require('./roles');
const statusCodes = require('./statusCodes');

module.exports = {
  roles,
  statusCodes
};
`
);

console.log('\n✅ Constants initialized successfully in src/constants/\n');
