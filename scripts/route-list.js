const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const routesIndexPath = path.join(projectRoot, 'src', 'routes', 'index.js');
const modulesDir = path.join(projectRoot, 'src', 'modules');

console.log('\n🗺️   Registered API Endpoints Map\n');

const routesList = [];

// 1. Scan src/routes/index.js for mounted prefixes
const prefixMap = {};

if (fs.existsSync(routesIndexPath)) {
  const indexContent = fs.readFileSync(routesIndexPath, 'utf8');
  
  // Find require statements like: const authRoutes = require('../modules/auth/auth.routes');
  const requireRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*require\(['"]\.\.\/modules\/([^\/'"]+)\/([^\/'"]+)\.routes['"]\)/g;
  let match;
  while ((match = requireRegex.exec(indexContent)) !== null) {
    const [_, varName, moduleFolder, routeFilePrefix] = match;
    prefixMap[varName] = { moduleFolder, routeFilePrefix };
  }

  // Find router.use('/auth', authRoutes);
  const useRegex = /router\.use\(['"]\/([^'"]+)['"]\s*,\s*([a-zA-Z0-9_]+)\)/g;
  while ((match = useRegex.exec(indexContent)) !== null) {
    const [_, prefix, varName] = match;
    if (prefixMap[varName]) {
      prefixMap[varName].prefix = `/api/${prefix}`;
    }
  }
}

// 2. Scan all module route files
if (fs.existsSync(modulesDir)) {
  const moduleFolders = fs.readdirSync(modulesDir);

  moduleFolders.forEach((folder) => {
    const folderPath = path.join(modulesDir, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const files = fs.readdirSync(folderPath);
      const routeFile = files.find((f) => f.endsWith('.routes.js'));

      if (routeFile) {
        const filePath = path.join(folderPath, routeFile);
        const content = fs.readFileSync(filePath, 'utf8');

        // Determine base path prefix
        let basePath = `/api/${folder}`;
        for (const key in prefixMap) {
          if (prefixMap[key].moduleFolder === folder) {
            basePath = prefixMap[key].prefix || basePath;
          }
        }

        // Parse router.<method> lines
        const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]*)['"]\s*,([^)]+)\)/g;
        let routeMatch;

        while ((routeMatch = routeRegex.exec(content)) !== null) {
          const method = routeMatch[1].toUpperCase();
          const subPath = routeMatch[2] === '/' ? '' : routeMatch[2];
          const fullPath = (basePath + subPath).replace(/\/+/g, '/');
          const handlersRaw = routeMatch[3];

          const hasAuth = handlersRaw.includes('authMiddleware') || handlersRaw.includes('auth');
          const hasVal = handlersRaw.includes('validate');
          
          let middlewareLabel = 'None';
          if (hasAuth && hasVal) middlewareLabel = 'Auth, Validate';
          else if (hasAuth) middlewareLabel = 'Auth';
          else if (hasVal) middlewareLabel = 'Validate';

          // Extract controller action
          const actionMatch = handlersRaw.match(/([a-zA-Z0-9_]+Controller|[a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
          const action = actionMatch ? `${actionMatch[1]}.${actionMatch[2]}` : 'Handler';

          routesList.push({
            method,
            endpoint: fullPath,
            middleware: middlewareLabel,
            action,
            module: folder
          });
        }
      }
    }
  });
}

// 3. Print formatted table
if (routesList.length === 0) {
  console.log('  No routes found or registered yet.\n');
} else {
  console.log('═════════════════════════════════════════════════════════════════════════════════════');
  console.log(
    `  ${'METHOD'.padEnd(8)} ${'ENDPOINT'.padEnd(30)} ${'MIDDLEWARE'.padEnd(20)} ${'HANDLER'.padEnd(22)}`
  );
  console.log('═════════════════════════════════════════════════════════════════════════════════════');

  routesList.forEach((r) => {
    const methodStr = r.method.padEnd(8);
    const endpointStr = r.endpoint.padEnd(30);
    const middlewareStr = r.middleware.padEnd(20);
    const actionStr = r.action.padEnd(22);
    console.log(`  ${methodStr} ${endpointStr} ${middlewareStr} ${actionStr}`);
  });

  console.log('═════════════════════════════════════════════════════════════════════════════════════');
  console.log(`  Total Endpoints Registered: ${routesList.length}\n`);
}
