const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const logsDir = path.join(projectRoot, 'logs');
const gitkeepPath = path.join(logsDir, '.gitkeep');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(gitkeepPath, '');
  console.log('\n📁 Created: logs/');
  console.log('📄 Created: logs/.gitkeep');
  console.log('✅ Logs directory initialized successfully!\n');
} else {
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log('\n📄 Created: logs/.gitkeep');
  }
  console.log('\n⚠️ Logs directory already exists: logs/\n');
}
