const { execSync } = require("child_process");

const name = process.argv.slice(2).join("-");

if (!name) {
  console.error("\n❌ Please provide migration name.");
  console.log("Example: npm run make:migration -- create-products\n");
  process.exit(1);
}

try {
  execSync(`npx sequelize-cli migration:generate --name ${name}`, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });

  console.log("\n✅ Migration created successfully!\n");
} catch (error) {
  console.error("\n❌ Failed to create migration.\n");
  process.exit(1);
}
