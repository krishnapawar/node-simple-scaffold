const readline = require("readline");
const path = require("path");
const { fork } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function runInteractiveMenu() {
  console.log("\n=========================================================================");
  console.log("🛠️   Backend Backend CLI Tool - Interactive Studio");
  console.log("=========================================================================\n");
  console.log(" Select an action to perform:\n");
  console.log("  1)  Scaffold Full Resource (Model + Migration + Module)");
  console.log("  2)  Scaffold Layered Module (Controller, Service, Repo, Routes)");
  console.log("  3)  Generate Model");
  console.log("  4)  Generate Controller");
  console.log("  5)  Generate Service");
  console.log("  6)  Generate Middleware");
  console.log("  7)  Generate Cron Schedule Job");
  console.log("  8)  Generate HTML Email Notification");
  console.log("  9)  Generate Database Seeder");
  console.log("  10) Generate Test Suite");
  console.log("  11) Generate Event Handler & Listener");
  console.log("  12) Scaffold Model Association / Relation");
  console.log("  13) View All Registered API Routes");
  console.log("  14) Run System Diagnostics & Health Check (Doctor)");
  console.log("  15) Sync Database Tables");
  console.log("  0)  Exit\n");

  const choice = (await askQuestion("👉 Enter option (0-15): ")).trim();

  let script = "";
  let args = [];
  let target = "";

  switch (choice) {
    case "1": {
      const name = await askQuestion("Enter Resource Name (e.g. Product): ");
      if (name) {
        script = "make-resource.js";
        args = [name.trim()];
      }
      break;
    }
    case "2": {
      const name = await askQuestion("Enter Module Name (e.g. Payment): ");
      if (name) {
        script = "make-module.js";
        args = [name.trim()];
      }
      break;
    }
    case "3": {
      const name = await askQuestion("Enter Model Name (e.g. Category): ");
      if (name) {
        script = "make-model.js";
        args = [name.trim()];
      }
      break;
    }
    case "4": {
      const name = await askQuestion("Enter Controller Name: ");
      if (name) {
        script = "make-controller.js";
        args = [name.trim()];
      }
      break;
    }
    case "5": {
      const name = await askQuestion("Enter Service Name: ");
      if (name) {
        script = "make-service.js";
        args = [name.trim()];
      }
      break;
    }
    case "6": {
      const name = await askQuestion("Enter Middleware Name: ");
      if (name) {
        script = "make-middleware.js";
        args = [name.trim()];
      }
      break;
    }
    case "7": {
      const name = await askQuestion("Enter Cron Job Name (e.g. CleanupLogs): ");
      const expression = await askQuestion("Enter Cron Expression [Default: 0 0 * * *]: ");
      if (name) {
        script = "make-cron.js";
        args = [name.trim(), expression.trim() || "0 0 * * *"];
      }
      break;
    }
    case "8": {
      const name = await askQuestion("Enter Email Notification Name: ");
      if (name) {
        script = "make-notification.js";
        args = [name.trim()];
      }
      break;
    }
    case "9": {
      const name = await askQuestion("Enter Seeder Name: ");
      if (name) {
        script = "make-seeder.js";
        args = [name.trim()];
      }
      break;
    }
    case "10": {
      const name = await askQuestion("Enter Test Suite Name: ");
      if (name) {
        script = "make-test.js";
        args = [name.trim()];
      }
      break;
    }
    case "11": {
      const name = await askQuestion("Enter Event Name (e.g. UserRegistered): ");
      if (name) {
        script = "make-event.js";
        args = [name.trim()];
      }
      break;
    }
    case "12": {
      const source = await askQuestion("Enter Source Model (e.g. User): ");
      const targetModel = await askQuestion("Enter Target Model (e.g. Order): ");
      const relation = await askQuestion("Enter Relation Type (hasMany, belongsTo, hasOne, belongsToMany) [Default: hasMany]: ");
      if (source && targetModel) {
        script = "make-relation.js";
        args = [source.trim(), targetModel.trim(), relation.trim() || "hasMany"];
      }
      break;
    }
    case "13": {
      script = "route-list.js";
      break;
    }
    case "14": {
      script = "cli-doctor.js";
      break;
    }
    case "15": {
      target = path.join(__dirname, "../src/database/sync.js");
      break;
    }
    case "0":
      console.log("\n👋 Exiting CLI. Have a great day!\n");
      rl.close();
      return;
    default:
      console.log("\n❌ Invalid selection. Please try again.\n");
      rl.close();
      return;
  }

  rl.close();

  if (script || target) {
    const targetScript = target || path.join(__dirname, script);
    console.log("");
    const child = fork(targetScript, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      process.exit(code || 0);
    });
  }
}

runInteractiveMenu();
