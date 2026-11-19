const fs = require("fs");
const path = require("path");

const name = process.argv[2];
const customExpression = process.argv[3];

const projectRoot = process.cwd();
const jobsDir = path.join(projectRoot, "src", "jobs");
const indexFilePath = path.join(jobsDir, "index.js");

// Allow initializing the jobs folder without a specific cron job name
if (!name || name === "--init" || name === "init") {
  fs.mkdirSync(jobsDir, { recursive: true });
  if (!fs.existsSync(indexFilePath)) {
    const emptyIndexContent = `const logger = require('../config/logger');

/**
 * Initialize all registered cron schedules
 */
const initAllCrons = () => {
  try {
    logger.info('Initializing system cron schedules...');
    logger.info('No cron schedules registered yet.');
  } catch (error) {
    logger.error('Failed to initialize cron schedules:', error);
  }
};

module.exports = {
  initAllCrons
};
`;
    fs.writeFileSync(indexFilePath, emptyIndexContent, "utf8");
    console.log("\n📁 Initialized jobs folder: src/jobs/");
    console.log("✅ Created central cron registry: src/jobs/index.js\n");
  } else {
    console.log("\n📁 Jobs folder already initialized: src/jobs/\n");
  }
  process.exit(0);
}

const kebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const pascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^./, (char) => char.toUpperCase());

const camelCase = (str) => {
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

// Clean name by stripping common suffixes if provided
const cleanName = name
  .replace(/\.cron\.js$/, "")
  .replace(/\.job\.js$/, "")
  .replace(/\.js$/, "")
  .replace(/Cron$/i, "")
  .replace(/Job$/i, "")
  .replace(/Schedule$/i, "");

const normalizedKebab = kebabCase(cleanName.trim());
const pascalName = pascalCase(normalizedKebab);
const camelName = camelCase(normalizedKebab);

const scheduleExpression = customExpression || "0 0 * * *"; // Default: Midnight every day

const cronFilePath = path.join(jobsDir, `${normalizedKebab}.cron.js`);

fs.mkdirSync(jobsDir, { recursive: true });

// 1. Create the Cron Job File
if (fs.existsSync(cronFilePath)) {
  console.log(`⚠️ Cron job already exists: ${normalizedKebab}.cron.js`);
} else {
  const cronContent = `const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Cron Schedule: ${pascalName}
 * Expression: ${scheduleExpression}
 *
 * Cron Syntax Quick Reference:
 * ┌───────────── minute (0 - 59)
 * │ ┌─────────── hour (0 - 23)
 * │ │ ┌───────── day of month (1 - 31)
 * │ │ │ ┌─────── month (1 - 12)
 * │ │ │ │ ┌───── day of week (0 - 6) (Sunday=0)
 * │ │ │ │ │
 * * * * * *
 */

const scheduleExpression = process.env.${pascalName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}_CRON_SCHEDULE || '${scheduleExpression}';

/**
 * Task handler logic executed on cron schedule trigger
 */
const handler = async () => {
  try {
    logger.info('[Cron Job] Starting execution: ${pascalName}');
    
    // TODO: Implement ${pascalName} task logic here
    
    logger.info('[Cron Job] Successfully completed: ${pascalName}');
  } catch (error) {
    logger.error('[Cron Job] Error during ${pascalName} execution:', error);
  }
};

/**
 * Initialize and start the ${pascalName} cron schedule
 * @param {Object} [options] - Additional node-cron options
 * @returns {import('node-cron').ScheduledTask}
 */
const init${pascalName}Cron = (options = {}) => {
  if (!cron.validate(scheduleExpression)) {
    throw new Error(\`Invalid cron expression for ${pascalName}: "\${scheduleExpression}"\`);
  }

  const task = cron.schedule(scheduleExpression, handler, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC',
    ...options
  });

  logger.info(\`[Cron Schedule] Scheduled ${pascalName} with expression "\${scheduleExpression}"\`);
  return task;
};

module.exports = {
  expression: scheduleExpression,
  handler,
  init${pascalName}Cron
};
`;

  fs.writeFileSync(cronFilePath, cronContent, "utf8");
  console.log(`\n✅ Cron job created: src/jobs/${normalizedKebab}.cron.js`);
}

// 2. Ensure / Update src/jobs/index.js (Central Scheduler Registry)
const cronFiles = fs
  .readdirSync(jobsDir)
  .filter((file) => file.endsWith(".cron.js"));

let imports = [];
let initCalls = [];

cronFiles.forEach((file) => {
  const baseName = file.replace(/\.cron\.js$/, "");
  const pName = pascalCase(baseName);
  const cName = camelCase(baseName);
  imports.push(`const { init${pName}Cron } = require('./${file}');`);
  initCalls.push(`    init${pName}Cron();`);
});

const indexContent = `const logger = require('../config/logger');

${imports.join("\n")}

/**
 * Initialize all registered cron schedules
 */
const initAllCrons = () => {
  try {
    logger.info('Initializing system cron schedules...');
${initCalls.join("\n")}
    logger.info('All cron schedules initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cron schedules:', error);
  }
};

module.exports = {
  initAllCrons
};
`;

fs.writeFileSync(indexFilePath, indexContent, "utf8");
console.log(`✅ Updated cron registry: src/jobs/index.js\n`);
