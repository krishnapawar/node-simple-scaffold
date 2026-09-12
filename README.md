# 🚀 node-simple-scaffold

> **Modular Node.js, Express & Sequelize REST API Scaffolding & CLI Code Generator**

`node-simple-scaffold` is a powerful CLI tool and generator that scaffolds production-ready Express & Sequelize backend REST API project structures and component stacks (modules, controllers, services, models, migrations, seeders, cron jobs, notifications, relations, and tests) in seconds.

---

## ⚡ Quick Start (No Installation Needed)

Generate a new backend project structure instantly using `npx`:

```bash
# Create project structure in a new directory:
npx node-simple-scaffold my-api

# Or create project structure in the current working directory:
cd my-api
npx node-simple-scaffold
```

---

## 📦 Global Installation (Optional)

You can also install the CLI globally via `npm`:

```bash
npm install -g node-simple-scaffold
```

Now you can run the `node-simple-scaffold` or `scaffold` command from anywhere:

```bash
# Create a new backend project structure
node-simple-scaffold my-api

# Or using the shortcut binary name
scaffold my-api
```

---

## 🛠️ Generator Commands

Once inside your project directory, use the generator commands to scaffold modules, resources, models, migrations, and services:

```bash
# Interactive Menu Studio
npx node-simple-scaffold

# Generate complete backend project structure
npx node-simple-scaffold structure

# Scaffold a full resource stack (module + model + migration)
npx node-simple-scaffold make:resource Product

# Generate a new feature module (controller, service, repository, routes, validation)
npx node-simple-scaffold make:module Payment

# Generate a new Sequelize model
npx node-simple-scaffold make:model User

# Generate a new controller file
npx node-simple-scaffold make:controller User

# Generate a new service file
npx node-simple-scaffold make:service User

# Generate a new middleware file
npx node-simple-scaffold make:middleware rateLimiter

# Generate a blank database migration
npx node-simple-scaffold make:migration create-products

# Generate migration automatically from an existing model
npx node-simple-scaffold model:migration User

# Generate HTML email notification service & mail config
npx node-simple-scaffold make:notification WelcomeEmail

# Generate a new cron schedule job
npx node-simple-scaffold make:cron DailyReport "0 0 * * *"

# Generate a database seeder
npx node-simple-scaffold make:seeder User

# Scaffold association between Sequelize models
npx node-simple-scaffold make:relation User Order hasMany

# Generate a test suite file
npx node-simple-scaffold make:test User

# Display formatted table of all registered API endpoints
npx node-simple-scaffold route:list

# Run system health check & diagnostics
npx node-simple-scaffold doctor
```

---

## 📋 Command Reference Table

| Command | Alias / Usage | Description |
|---|---|---|
| `npx node-simple-scaffold` | `scaffold` | Interactive CLI dashboard studio |
| `npx node-simple-scaffold [dir]` | `scaffold init [dir]` | Generate complete backend project structure |
| `make:resource <Name>` | `make:resource Product` | Full resource stack (`module` + `model` + `migration`) |
| `make:module <Name>` | `make:module Payment` | Scaffolds layered module (`controller`, `service`, `repository`, `routes`, `validation`) |
| `make:model <Name>` | `make:model Vehicle` | Generates a new Sequelize model |
| `make:controller <Name>` | `make:controller Vehicle` | Generates a new controller file |
| `make:service <Name>` | `make:service Payment` | Generates a new service file |
| `make:middleware <Name>` | `make:middleware auth` | Generates a new middleware file |
| `make:migration <Name>` | `make:migration create-users` | Generates timestamped empty migration file |
| `model:migration <Name>` | `model:migration User` | Generates migration schema automatically from a model |
| `make:notification <Name>` | `make:notification ResetPass` | Generates HTML email notification service |
| `make:cron <Name> [Cron]` | `make:cron Cleanup "0 0 * * *"` | Generates a new cron schedule job & updates registry |
| `make:seeder <Name>` | `make:seeder Product` | Generates a database seeder file |
| `make:relation <Src> <Tgt>` | `make:relation User Order hasMany` | Scaffolds Sequelize model relationship |
| `make:test <Name>` | `make:test Auth` | Generates a new test suite file under `tests/` |
| `route:list` | `routes` | Displays ASCII table of all registered API endpoints |
| `doctor` | `cli:doctor` | Performs health check on env, DB, and dependencies |
| `db:sync` | `db:sync` | Syncs Sequelize models with database tables |

---

## 📂 Project Structure Generated

When running `npx node-simple-scaffold my-api`, the tool creates the following directory layout:

```text
my-api/
├── src/
│   ├── config/             # Database, JWT, Mail & Env configurations
│   ├── database/           # Migrations, seeders, sync script
│   ├── events/             # Custom event emitters & listeners
│   ├── jobs/               # Cron jobs & task scheduler
│   ├── middleware/         # Auth, validation, error handling, rate limiting
│   ├── models/             # Sequelize models
│   ├── modules/            # Feature modules (Auth, Users, etc.)
│   │   └── [feature]/
│   │       ├── [feature].controller.js
│   │       ├── [feature].service.js
│   │       ├── [feature].repository.js
│   │       ├── [feature].routes.js
│   │       └── [feature].validation.js
│   ├── notifications/      # HTML Email templates & mailer services
│   ├── routes/             # Central route dispatcher
│   ├── utils/              # Helper functions, logger, response handlers
│   └── app.js              # Express app entry point
├── logs/                   # Log output files
├── uploads/                # Static uploaded files
├── tests/                  # Automated integration & unit tests
├── .env.example            # Environment variable template
├── package.json
└── README.md
```

---

## 📄 License

ISC License - Feel free to use in personal & commercial projects!
