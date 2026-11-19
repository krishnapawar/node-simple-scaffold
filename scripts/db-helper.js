const fs = require('fs');
const path = require('path');

/**
 * Detect database type (mysql | mongodb) in the specified project directory
 * @param {string} projectRoot 
 * @returns {'mysql' | 'mongodb'}
 */
function detectDatabaseType(projectRoot = process.cwd()) {
  // 1. Check package.json dependencies
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (allDeps['mongoose']) return 'mongodb';
      if (allDeps['sequelize'] || allDeps['mysql2']) return 'mysql';
    } catch (e) {}
  }

  // 2. Check .env configuration
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('MONGODB_URI')) return 'mongodb';
      if (envContent.includes('DB_HOST')) return 'mysql';
    } catch (e) {}
  }

  // 3. Check src/config/database.js
  const dbConfigPath = path.join(projectRoot, 'src', 'config', 'database.js');
  if (fs.existsSync(dbConfigPath)) {
    try {
      const dbContent = fs.readFileSync(dbConfigPath, 'utf8');
      if (dbContent.includes('mongoose')) return 'mongodb';
      if (dbContent.includes('sequelize') || dbContent.includes('Sequelize')) return 'mysql';
    } catch (e) {}
  }

  return 'mysql';
}

module.exports = {
  detectDatabaseType
};
