const fs = require('fs');
const path = require('path');

const name = process.argv[2];

if (!name) {
  console.error('\n❌ Please provide an event name.');
  console.log('Example:');
  console.log('  node scripts/cli.js make:event UserRegistered');
  console.log('  npm run make:event -- OrderPlaced\n');
  process.exit(1);
}

const kebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const pascalCase = (str) =>
  str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^./, (char) => char.toUpperCase());

const camelCase = (str) => {
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const cleanName = name
  .replace(/event$/i, '')
  .replace(/listener$/i, '')
  .replace(/\.js$/, '');

const normalizedKebab = kebabCase(cleanName.trim());
const pascalName = pascalCase(normalizedKebab);
const camelName = camelCase(normalizedKebab);

const projectRoot = path.join(__dirname, '..');
const eventsDir = path.join(projectRoot, 'src', 'events');
const eventFilePath = path.join(eventsDir, `${pascalName}Event.js`);
const indexFilePath = path.join(eventsDir, 'index.js');

fs.mkdirSync(eventsDir, { recursive: true });

// 1. Create Event File
if (fs.existsSync(eventFilePath)) {
  console.log(`⚠️ Event file already exists: ${pascalName}Event.js`);
} else {
  const eventContent = `const logger = require('../config/logger');

const EVENT_NAME = '${pascalName}';

/**
 * ${pascalName} Event Handler
 * @param {Object} payload
 */
const handle${pascalName} = async (payload) => {
  try {
    logger.info(\`[Event] Triggered \${EVENT_NAME}:\`, payload);

    // TODO: Implement ${pascalName} event listener logic

  } catch (error) {
    logger.error(\`[Event Error] \${EVENT_NAME} listener failed:\`, error);
  }
};

/**
 * Register ${pascalName} event listener on an EventEmitter instance
 * @param {import('events').EventEmitter} emitter
 */
const register${pascalName}Listener = (emitter) => {
  emitter.on(EVENT_NAME, handle${pascalName});
  logger.info(\`[Event] Registered listener for "\${EVENT_NAME}"\`);
};

/**
 * Dispatch ${pascalName} event
 * @param {import('events').EventEmitter} emitter
 * @param {Object} payload
 */
const emit${pascalName} = (emitter, payload) => {
  emitter.emit(EVENT_NAME, payload);
};

module.exports = {
  EVENT_NAME,
  handle${pascalName},
  register${pascalName}Listener,
  emit${pascalName}
};
`;

  fs.writeFileSync(eventFilePath, eventContent, 'utf8');
  console.log(`\n✅ Event created: src/events/${pascalName}Event.js`);
}

// 2. Ensure / Update Central Event Registry (src/events/index.js)
const eventFiles = fs
  .readdirSync(eventsDir)
  .filter((file) => file.endsWith('Event.js'));

let imports = [];
let initCalls = [];
let dispatchExports = [];

eventFiles.forEach((file) => {
  const baseName = file.replace(/Event\.js$/, '');
  const pName = pascalCase(baseName);
  imports.push(`const { register${pName}Listener, emit${pName} } = require('./${file}');`);
  initCalls.push(`    register${pName}Listener(eventEmitter);`);
  dispatchExports.push(`  emit${pName}: (payload) => emit${pName}(eventEmitter, payload),`);
});

const indexContent = `const EventEmitter = require('events');
const logger = require('../config/logger');

${imports.join('\n')}

const eventEmitter = new EventEmitter();

/**
 * Register all system event listeners
 */
const initAllEvents = () => {
  try {
    logger.info('Registering system event listeners...');
${initCalls.join('\n')}
    logger.info('All event listeners registered successfully');
  } catch (error) {
    logger.error('Failed to register event listeners:', error);
  }
};

module.exports = {
  eventEmitter,
  initAllEvents,
${dispatchExports.join('\n')}
};
`;

fs.writeFileSync(indexFilePath, indexContent, 'utf8');
console.log(`✅ Updated event registry: src/events/index.js\n`);
