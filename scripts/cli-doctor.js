const fs = require('fs');
const path = require('path');
const { detectDatabaseType } = require('./db-helper');

const projectRoot = process.cwd();
const dbType = detectDatabaseType(projectRoot);
const isMongo = dbType === 'mongodb';

console.log('\n🩺   Backend System Health Doctor\n');
console.log('═════════════════════════════════════════════════════════════════════════');
console.log(`  ℹ️  Detected Database Engine: ${isMongo ? 'MongoDB (Mongoose)' : 'MySQL (Sequelize)'}`);

let issueCount = 0;

// 1. Check Node.js Version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
if (majorVersion >= 16) {
  console.log(`  ✅  Node.js Version: ${nodeVersion} (Supported)`);
} else {
  console.log(`  ❌  Node.js Version: ${nodeVersion} (Recommended v16 or higher)`);
  issueCount++;
}

// 2. Check .env Configuration File
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  console.log('  ✅  .env Configuration File: Found');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredKeys = isMongo ? ['PORT', 'MONGODB_URI'] : ['PORT', 'DB_HOST', 'DB_NAME', 'DB_USER'];
  const missingKeys = requiredKeys.filter((key) => !envContent.includes(`${key}=`));

  if (missingKeys.length === 0) {
    console.log(`  ✅  Environment Variables: All core keys defined (${requiredKeys.join(', ')})`);
  } else {
    console.log(`  ⚠️  Environment Variables: Missing recommended keys -> ${missingKeys.join(', ')}`);
    issueCount++;
  }
} else {
  console.log('  ❌  .env Configuration File: Missing! (Run npm run structure or copy from .env.example)');
  issueCount++;
}

// 3. Check Directory Structure
const requiredFolders = [
  'src/config',
  'src/models',
  'src/modules',
  'src/routes',
  'src/middleware',
  'src/utils'
];

const optionalFolders = [
  'src/jobs',
  'src/events',
  'logs',
  'uploads',
  'src/constants',
  'tests',
  'src/modules/auth'
];

const missingFolders = requiredFolders.filter(
  (folder) => !fs.existsSync(path.join(projectRoot, folder))
);

if (missingFolders.length === 0) {
  console.log('  ✅  Directory Structure: Core folders verified');
} else {
  console.log(`  ⚠️  Directory Structure: Missing core folders -> ${missingFolders.join(', ')}`);
  issueCount++;
}

const installedOptional = optionalFolders.filter(
  (folder) => fs.existsSync(path.join(projectRoot, folder))
);
if (installedOptional.length > 0) {
  console.log(`  ℹ️  Optional Modules Active: ${installedOptional.join(', ')}`);
}

// 4. Check Node Modules Dependencies
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const pkgPath = path.join(projectRoot, 'package.json');

if (fs.existsSync(nodeModulesPath) && fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const dependencies = Object.keys(pkg.dependencies || {});
    const missingDeps = dependencies.filter(
      (dep) => !fs.existsSync(path.join(nodeModulesPath, dep))
    );

    if (missingDeps.length === 0) {
      console.log(`  ✅  NPM Packages: All ${dependencies.length} dependencies installed`);
    } else {
      console.log(`  ❌  NPM Packages: Missing ${missingDeps.length} packages (${missingDeps.slice(0, 3).join(', ')}...). Run 'npm install'`);
      issueCount++;
    }
  } catch (e) {
    console.log('  ⚠️  NPM Packages: Unable to parse package.json');
  }
} else {
  console.log('  ❌  node_modules: Directory missing! Run npm install');
  issueCount++;
}

// 5. Test Database Connection
async function checkDatabase() {
  const dbConfigPath = path.join(projectRoot, 'src', 'config', 'database');
  if (isMongo) {
    try {
      const connectDB = require(dbConfigPath);
      await connectDB();
      console.log('  ✅  Database Connection: Connected successfully to MongoDB');
    } catch (error) {
      console.log(`  ⚠️  Database Connection: Unable to connect (${error.message})`);
      console.log('      (Ensure MongoDB service is running and MONGODB_URI in .env is correct)');
      issueCount++;
    }
  } else {
    try {
      const sequelize = require(dbConfigPath);
      await sequelize.authenticate();
      console.log('  ✅  Database Connection: Connected successfully to MySQL');
    } catch (error) {
      console.log(`  ⚠️  Database Connection: Unable to connect (${error.message})`);
      console.log('      (Ensure MySQL service is running and .env database credentials are correct)');
      issueCount++;
    }
  }

  console.log('═════════════════════════════════════════════════════════════════════════');
  if (issueCount === 0) {
    console.log('\n🎉  System status is HEALTHY! Everything is configured properly.\n');
  } else {
    console.log(`\n⚠️   Found ${issueCount} item(s) that need attention. Please review details above.\n`);
  }
}

checkDatabase();
