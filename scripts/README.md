# Backend CLI Code Generator & Utility Scripts

This directory contains custom CLI generator scripts designed to streamline project structure generation, module scaffolding, resource creation, database synchronization, database migrations, and automated verification for the Backend backend platform.

---

## 🛠️ Unified Master CLI Runner (`scripts/cli.js`)

All generators and utility scripts can be run through the central master CLI script `scripts/cli.js` or via NPM script aliases in `package.json`.

```bash
# Display CLI Interactive Help Dashboard
node scripts/cli.js help
# or
npm run cli
```

### Quick Command Reference

| Command | Master CLI Command | NPM Script Alias | Description |
|---|---|---|---|
| Master CLI | `node scripts/cli.js` | `npm run cli` | Master CLI dispatcher & help menu |
| Project Structure | `node scripts/cli.js structure` | `npm run structure` | Generate complete backend project structure |
| Resource Stack | `node scripts/cli.js make:resource <Name>` | `npm run make:resource -- <Name>` | Scaffolds model + migration + full API module |
| Feature Module | `node scripts/cli.js make:module <Name>` | `npm run make:module -- <Name>` | Scaffolds layered module folder (`controller`, `service`, `repository`, `routes`, `validation`) |
| Model | `node scripts/cli.js make:model <Name>` | `npm run make:model -- <Name>` | Generates a new Sequelize model |
| Controller | `node scripts/cli.js make:controller <Name>` | `npm run make:controller -- <Name>` | Generates a new controller file |
| Service | `node scripts/cli.js make:service <Name>` | `npm run make:service -- <Name>` | Generates a new service file |
| Middleware | `node scripts/cli.js make:middleware <Name>` | `npm run make:middleware -- <Name>` | Generates a new middleware file |
| Blank Migration | `node scripts/cli.js make:migration <Name>` | `npm run make:migration -- <Name>` | Generates a timestamped empty migration file |
| Model Migration | `node scripts/cli.js model:migration <Name>` | `npm run model:migration -- <Name>` | Generates migration schema based on a model |
| Email Notification | `node scripts/cli.js make:notification <Name>` | `npm run make:notification -- <Name>` | Generates HTML email notification service & mail config |
| Cron Schedule Job | `node scripts/cli.js make:cron <Name> [Expression]` | `npm run make:cron -- <Name> "[Expression]"` | Generates a new cron schedule job & updates registry |
| Database Seeder | `node scripts/cli.js make:seeder <Name>` | `npm run make:seeder -- <Name>` | Generates a timestamped database seeder |
| Test Suite | `node scripts/cli.js make:test <Name>` | `npm run make:test -- <Name>` | Generates a new test suite file under `tests/` |
| Interactive Studio | `node scripts/cli.js` | `npm run cli` | Master interactive CLI menu prompt |
| Model Relation | `node scripts/cli.js make:relation <Source> <Target> [Type]` | `npm run make:relation -- <Source> <Target> [Type]` | Scaffolds Sequelize model association (`hasMany`, `belongsTo`, etc.) |
| Route Visualizer | `node scripts/cli.js route:list` | `npm run route:list` | Displays formatted ASCII table of all registered API endpoints |
| System Doctor | `node scripts/cli.js doctor` | `npm run doctor` | Performs diagnostic health check on env, DB, and packages |
| Database Sync | `node scripts/cli.js db:sync` | `npm run db:sync` | Syncs Sequelize models with database tables |
| Flow Test | `node scripts/cli.js test:flow` | `node scripts/test-api-flow.js` | Runs automated verification test suite |

---

## 📦 Required NPM Packages

To run the generator scripts, standard application modules, database ORM, and API engine, ensure the following packages are installed:

### Application & Runtime Dependencies
```bash
npm install express sequelize mysql2 dotenv cors helmet compression joi jsonwebtoken bcryptjs multer morgan winston winston-daily-rotate-file swagger-ui-express swagger-jsdoc
```

### Development & CLI Dependencies
```bash
npm install --save-dev nodemon cross-env sequelize-cli
```

### Dependency Breakdown:
| Package | Category | Purpose in Platform & Scaffolding |
|---|---|---|
| `express` | Core Framework | Web server framework used by generated controllers & routes |
| `sequelize` | ORM | Database model definition used by `make:model` & `make:resource` |
| `mysql2` | Database Driver | MySQL driver for Sequelize connection |
| `joi` | Validation | Data schema validation used in generated `<module>.validation.js` |
| `jsonwebtoken` | Authentication | Bearer JWT generation & verification |
| `bcryptjs` | Security | Password hashing utility |
| `multer` | Uploads | File & image upload handling middleware |
| `cors` & `helmet` | Security | Security headers and CORS policy configuration |
| `compression` | Performance | Response body compression |
| `swagger-ui-express` & `swagger-jsdoc` | Documentation | OpenAPI 3.0 interactive Swagger UI docs |
| `node-cron` | Task Scheduling | Background cron job schedule runner used by `make:cron` |
| `winston` & `winston-daily-rotate-file` | Logging | System error & access logger |
| `sequelize-cli` | Dev Tooling | Migration & seeder runner CLI |
| `nodemon` & `cross-env` | Dev Tooling | Hot-reloading development server environment |

---

## 🚀 Script Usage Guide

### 1. Project Structure Generation (`create-structure.js` / `structure`)
Generates complete backend architecture including directories, models, controllers, services, middleware, utilities, configuration, Swagger docs, and updates `package.json`.

```bash
# Standard run
node scripts/cli.js structure

# Options:
# --force / -f         : Overwrite existing files
# --skip-install / -s  : Skip running npm install
node scripts/cli.js structure --force --skip-install
```

---

### 2. Generate a Complete Resource (`make:resource`)
Scaffolds a complete feature stack: Model, Database Migration, and full API Module (`controller`, `service`, `repository`, `routes`, `validation`).

```bash
node scripts/cli.js make:resource RepairRequest
# or
npm run make:resource -- RepairRequest
```

**Generates:**
```
src/
├── models/
│   └── RepairRequest.js
├── database/
│   └── migrations/
│       └── TIMESTAMP-create-repair-requests.js
└── modules/
    └── repair-requests/
        ├── repair-request.controller.js
        ├── repair-request.service.js
        ├── repair-request.repository.js
        ├── repair-request.routes.js
        └── repair-request.validation.js
```

---

### 3. Generate a Standalone Module (`make:module`)
Creates a standard layered feature directory under `src/modules/` without generating models or migrations.

```bash
node scripts/cli.js make:module payments
# or
npm run make:module -- payments
```

**Generates:**
```
src/modules/payments/
├── payment.controller.js
├── payment.service.js
├── payment.repository.js
├── payment.routes.js
└── payment.validation.js
```

---

### 4. Generate a Cron Schedule Job (`make:cron` / `make:schedule` / `make:job`)
Creates a scheduled cron task under `src/jobs/` using `node-cron` with error handling, logging, and automatically registers it in central scheduler registry `src/jobs/index.js`.

```bash
# Default daily midnight schedule ("0 0 * * *")
node scripts/cli.js make:cron CleanupLogs

# Custom cron expression (e.g. Every weekday at 9:00 AM)
node scripts/cli.js make:cron SendDailyReport "0 9 * * 1-5"

# NPM Alias
npm run make:cron -- CleanupLogs "0 0 * * *"
```

**Generates:**
```
src/
└── jobs/
    ├── cleanup-logs.cron.js
    └── index.js  (Central registry)
```

---

### 5. System Test & Verification Runner (`test-api-flow.js`)
Executes an automated test suite verifying database model registrations, foreign key associations, Express routing, and status constants.

```bash
node scripts/cli.js test:flow
```

---

## 📝 Naming Conventions & Rules

- **PascalCase** or **kebab-case** supported for arguments:
  - `node scripts/cli.js make:resource PartListing`
  - `node scripts/cli.js make:resource part-listing`
- **Output naming standard**:
  - Model: `src/models/PartListing.js`
  - Module directory: `src/modules/part-listings/`
  - File prefix: `part-listing.controller.js`, `part-listing.service.js`, etc.
- **Safety**: By default, generator scripts will **never overwrite** existing files (unless `--force` is explicitly provided to `structure`).
