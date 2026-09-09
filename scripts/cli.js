const path = require("path");
const { fork } = require("child_process");

const command = process.argv[2];
const extraArgs = process.argv.slice(3);

const commands = {
  "structure": {
    script: "create-structure.js",
    description: "Generate complete backend project structure"
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
    description: "Generate a new Sequelize model"
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
  "make:relation": {
    script: "make-relation.js",
    description: "Scaffold association between Sequelize models"
  },
  "make:association": {
    script: "make-relation.js",
    description: "Scaffold association between Sequelize models"
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
    target: path.join(__dirname, "../src/database/sync.js"),
    description: "Sync Sequelize database tables"
  },
  "test:flow": {
    script: "test-api-flow.js",
    description: "Run API flow test suite"
  }
};

function printHelp() {
  console.log("\n🛠️  Backend Backend CLI Tool\n");
  console.log("Usage: node scripts/cli.js [command] [options/arguments]\n");
  console.log("Available Commands:");
  console.log("═════════════════════════════════════════════════════════════════════════");
  for (const [name, info] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(20)} ${info.description}`);
  }
  console.log("═════════════════════════════════════════════════════════════════════════\n");
  console.log("Examples:");
  console.log("  node scripts/cli.js");
  console.log("  node scripts/cli.js make:resource Product");
  console.log("  node scripts/cli.js make:relation User Order hasMany");
  console.log("  node scripts/cli.js route:list");
  console.log("  node scripts/cli.js doctor\n");
}

if (!command) {
  // Launch interactive menu studio
  const menuScript = path.join(__dirname, "interactive-menu.js");
  const child = fork(menuScript, [], { stdio: "inherit" });
  child.on("exit", (code) => {
    process.exit(code || 0);
  });
  return;
}

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

const targetCmd = commands[command];
if (!targetCmd) {
  console.error(`\n❌ Unknown command: "${command}"\n`);
  printHelp();
  process.exit(1);
}

const scriptPath = targetCmd.target || path.join(__dirname, targetCmd.script);

// Execute targeted script with forwarded arguments
const child = fork(scriptPath, extraArgs, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code || 0);
});
