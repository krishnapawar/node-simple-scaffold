const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const uploadsDir = path.join(projectRoot, 'uploads');
const middlewareDir = path.join(projectRoot, 'src', 'middleware');
const uploadMiddlewarePath = path.join(middlewareDir, 'upload.middleware.js');

// 1. Create uploads directory & .gitkeep
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Created: uploads`);
}

const gitkeepPath = path.join(uploadsDir, '.gitkeep');
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, '');
  console.log(`📄 Created: uploads/.gitkeep`);
} else {
  console.log(`⚠️ Already exists: uploads/.gitkeep`);
}

// 2. Ensure upload middleware exists
if (!fs.existsSync(uploadMiddlewarePath)) {
  fs.mkdirSync(middlewareDir, { recursive: true });
  const middlewareContent = `const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, \`file-\${uniqueSuffix}\${ext}\`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF'), false);
  }
};

const uploadFile = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

module.exports = { uploadFile };
`;
  fs.writeFileSync(uploadMiddlewarePath, middlewareContent, 'utf8');
  console.log(`📄 Created: src/middleware/upload.middleware.js`);
} else {
  console.log(`⚠️ Already exists: src/middleware/upload.middleware.js`);
}

// 3. Ensure multer package is installed if node_modules exists
const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (fs.existsSync(nodeModulesPath) && !fs.existsSync(path.join(nodeModulesPath, 'multer'))) {
  console.log('\n📦 Installing required package (multer)...');
  try {
    const { execSync } = require('child_process');
    execSync('npm install multer', { cwd: projectRoot, stdio: 'inherit', shell: true });
    console.log('✅ multer installed successfully!\n');
  } catch (e) {
    console.warn('⚠️ Could not auto-install multer. Run: npm install multer');
  }
}

console.log('\n✅ Uploads directory & middleware initialized successfully!\n');
