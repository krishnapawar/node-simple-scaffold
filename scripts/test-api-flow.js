const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

console.log('\n🧪   Backend System Automated Flow & Diagnostic Test Suite\n');
console.log('═════════════════════════════════════════════════════════════════════════');

let passedTests = 0;
let failedTests = 0;
let warnings = 0;

function logPass(msg) {
  console.log(`  ✅  [PASS] ${msg}`);
  passedTests++;
}

function logFail(msg) {
  console.log(`  ❌  [FAIL] ${msg}`);
  failedTests++;
}

function logWarn(msg) {
  console.log(`  ⚠️  [WARN] ${msg}`);
  warnings++;
}

// 1. Directory Structure Test
const requiredDirs = [
  'src/config',
  'src/models',
  'src/modules',
  'src/routes',
  'src/middleware',
  'src/utils',
  'src/constants'
];

let missingDirs = [];
requiredDirs.forEach((dir) => {
  if (!fs.existsSync(path.join(projectRoot, dir))) {
    missingDirs.push(dir);
  }
});

if (missingDirs.length === 0) {
  logPass('Core directory structure verified');
} else {
  logFail(`Missing required directories: ${missingDirs.join(', ')}`);
}

// 2. Environment Configuration Test
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');
if (fs.existsSync(envPath) || fs.existsSync(envExamplePath)) {
  logPass('Environment configuration file present');
} else {
  logWarn('No .env or .env.example file found');
}

// 3. Model Registrations Test
const modelsDir = path.join(projectRoot, 'src', 'models');
if (fs.existsSync(modelsDir)) {
  const modelFiles = fs
    .readdirSync(modelsDir)
    .filter((f) => f.endsWith('.js') && f !== 'index.js');
  
  if (modelFiles.length > 0) {
    logPass(`Sequelize models detected: ${modelFiles.length} model(s) [${modelFiles.map(f => f.replace('.js', '')).join(', ')}]`);
  } else {
    logWarn('No custom models found in src/models (User model may be scaffolded in src/models/User.js)');
  }
} else {
  logFail('src/models directory does not exist');
}

// 4. API Modules & Routes Verification
const modulesDir = path.join(projectRoot, 'src', 'modules');
if (fs.existsSync(modulesDir)) {
  const modules = fs
    .readdirSync(modulesDir)
    .filter((f) => fs.statSync(path.join(modulesDir, f)).isDirectory());

  let totalRoutesFound = 0;
  modules.forEach((mod) => {
    const modDir = path.join(modulesDir, mod);
    const files = fs.readdirSync(modDir);
    const routeFile = files.find((f) => f.endsWith('.routes.js'));
    if (routeFile) {
      const content = fs.readFileSync(path.join(modDir, routeFile), 'utf8');
      const routeMatches = content.match(/router\.(get|post|put|delete|patch)\(/g);
      if (routeMatches) {
        totalRoutesFound += routeMatches.length;
      }
    }
  });

  logPass(`Feature modules verified: ${modules.length} module(s) found with ~${totalRoutesFound} route endpoint handler(s)`);
} else {
  logFail('src/modules directory does not exist');
}

// 5. Test Suite Inspection
const testsDir = path.join(projectRoot, 'tests');
if (fs.existsSync(testsDir)) {
  const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith('.test.js') || f.endsWith('.spec.js'));
  logPass(`Unit/Integration test suites: ${testFiles.length} test file(s) found`);
} else {
  logWarn('tests directory not found');
}

console.log('═════════════════════════════════════════════════════════════════════════');
console.log(`\n📊 Verification Summary: ${passedTests} Passed, ${failedTests} Failed, ${warnings} Warnings\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
