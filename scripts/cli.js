#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { fork } = require("child_process");

const command = process.argv[2];
const extraArgs = process.argv.slice(3);

const commands = {
  "structure": {
    script: "create-structure.js",
    description: "Generate lightweight backend project structure (MySQL / MongoDB)"
  },
  "init": {
    script: "create-structure.js",
    description: "Generate lightweight backend project structure (MySQL / MongoDB)"
  },
  "create": {
    script: "create-structure.js",
    description: "Generate lightweight backend project structure (MySQL / MongoDB)"
  },
  "new": {
    script: "create-structure.js",
    description: "Generate lightweight backend project structure (MySQL / MongoDB)"
  },
  "make:auth": {
    script: "make-auth.js",
    description: "Generate authentication module (register, login, profile, password, JWT)"
  },
  "auth": {
    script: "make-auth.js",
    description: "Generate authentication module (register, login, profile, password, JWT)"
  },
  "make:module": {
    script: "make-module.js",
    description: "Generate a new feature module (controller, service, repository, routes, validation)"
  },
  "make:resource": {
    script: "make-resource.js",
    description: "Generate full resource stack (module + model + migration)"
  },
  "make:model": {
    script: "make-model.js",
    description: "Generate a new Sequelize / Mongoose model"
  },
  "make:controller": {
    script: "make-controller.js",
    description: "Generate a new controller file"
  },
  "make:service": {
    script: "make-service.js",
    description: "Generate a new service file"
  },
  "make:middleware": {
    script: "make-middleware.js",
    description: "Generate a new middleware file"
  },
  "make:migration": {
    script: "make-migration.js",
    description: "Generate an empty database migration"
  },
  "model:migration": {
    script: "generate-model-migration.js",
    description: "Generate migration from an existing model"
  },
  "make:notification": {
    script: "make-notification.js",
    description: "Generate a new HTML email notification service"
  },
  "make:email": {
    script: "make-notification.js",
    description: "Generate a new HTML email notification service"
  },
  "make:cron": {
    script: "make-cron.js",
    description: "Generate a new cron schedule job"
  },
  "make:schedule": {
    script: "make-cron.js",
    description: "Generate a new cron schedule job"
  },
  "make:job": {
    script: "make-cron.js",
    description: "Generate a new cron schedule job"
  },
  "make:jobs": {
    script: "make-cron.js",
    description: "Initialize jobs directory & scheduler registry"
  },
  "make:seeder": {
    script: "make-seeder.js",
    description: "Generate a new database seeder"
  },
  "make:seed": {
    script: "make-seeder.js",
    description: "Generate a new database seeder"
  },
  "make:test": {
    script: "make-test.js",
    description: "Generate a new test suite file"
  },
  "make:event": {
    script: "make-event.js",
    description: "Generate a new event emitter & listener"
  },
  "make:listener": {
    script: "make-event.js",
    description: "Generate a new event emitter & listener"
  },
  "make:events": {
    script: "make-event.js",
    description: "Initialize events directory & event emitter registry"
  },
  "make:relation": {
    script: "make-relation.js",
    description: "Scaffold association between Sequelize models"
  },
  "make:association": {
    script: "make-relation.js",
    description: "Scaffold association between Sequelize models"
  },
  "make:logs": {
    script: "make-logs.js",
    description: "Initialize logs directory"
  },
  "logs": {
    script: "make-logs.js",
    description: "Initialize logs directory"
  },
  "make:uploads": {
    script: "make-uploads.js",
    description: "Initialize uploads directory & upload middleware"
  },
  "uploads": {
    script: "make-uploads.js",
    description: "Initialize uploads directory & upload middleware"
  },
  "make:upload": {
    script: "make-uploads.js",
    description: "Initialize uploads directory & upload middleware"
  },
  "make:constants": {
    script: "make-constants.js",
    description: "Initialize constants directory (roles, status codes)"
  },
  "constants": {
    script: "make-constants.js",
    description: "Initialize constants directory (roles, status codes)"
  },
  "route:list": {
    script: "route-list.js",
    description: "Display formatted table of all registered API endpoints"
  },
  "routes": {
    script: "route-list.js",
    description: "Display formatted table of all registered API endpoints"
  },
  "doctor": {
    script: "cli-doctor.js",
    description: "Run system health check & diagnostics"
  },
  "cli:doctor": {
    script: "cli-doctor.js",
    description: "Run system health check & diagnostics"
  },
  "db:sync": {
    target: path.join(process.cwd(), "src/database/sync.js"),
    description: "Sync Sequelize database tables"
  },
  "test:flow": {
    script: "test-api-flow.js",
    description: "Run API flow test suite"
  }
};

function printHelp() {
  console.log("\n🛠️  Node Simple Scaffold CLI Tool\n");
  console.log("Usage: node-simple-scaffold [command|project-name] [options]\n");
  console.log("Available Commands:");
  console.log("═════════════════════════════════════════════════════════════════════════");
  for (const [name, info] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(20)} ${info.description}`);
  }
  console.log("═════════════════════════════════════════════════════════════════════════\n");
  console.log("Examples:");
  console.log("  npx node-simple-scaffold");
  console.log("  npx node-simple-scaffold my-api");
  console.log("  npx node-simple-scaffold my-api --db=mongodb");
  console.log("  npx node-simple-scaffold my-api --db=mysql");
  console.log("  npx node-simple-scaffold make:resource Product");
  console.log("  npx node-simple-scaffold make:model Product");
  console.log("  npx node-simple-scaffold make:auth");
  console.log("  npx node-simple-scaffold route:list");
  console.log("  npx node-simple-scaffold doctor\n");
}

if (!command) {
  // Launch interactive menu studio
  const menuScript = path.join(__dirname, "interactive-menu.js");
  if (fs.existsSync(menuScript)) {
    const child = fork(menuScript, [], { stdio: "inherit" });
    child.on("exit", (code) => {
      process.exit(code || 0);
    });
    return;
  }
  printHelp();
  process.exit(0);
}

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

let targetCmd = commands[command];
let childArgs = extraArgs;

if (!targetCmd) {
  // If command is not recognized but doesn't start with "-", treat command as target folder for scaffolding
  if (!command.startsWith("-")) {
    targetCmd = commands["structure"];
    childArgs = [command, ...extraArgs];
  } else {
    console.error(`\n❌ Unknown command: "${command}"\n`);
    printHelp();
    process.exit(1);
  }
}

if (command === "db:sync") {
  const { detectDatabaseType } = require("./db-helper");
  if (detectDatabaseType(process.cwd()) === "mongodb") {
    console.log("\nℹ️ Table sync is specific to SQL/Sequelize databases. MongoDB schemas are managed dynamically by Mongoose.\n");
    process.exit(0);
  }
}

const scriptPath = targetCmd.target || path.join(__dirname, targetCmd.script);

if (!fs.existsSync(scriptPath)) {
  console.error(`\n❌ Target script not found: "${scriptPath}"`);
  console.error(`Please ensure you are running this command inside a scaffolded project directory.\n`);
  process.exit(1);
}

// Execute targeted script with forwarded arguments
const child = fork(scriptPath, childArgs, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code || 0);
});


