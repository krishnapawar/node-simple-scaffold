const fs = require("fs");
const path = require("path");

const name = process.argv[2];

if (!name) {
    console.error("\n❌ Please provide a notification name.\n");
    console.log("Example:");
    console.log("  node scripts/cli.js make:notification WelcomeEmail");
    console.log("  npm run make:notification -- PasswordReset\n");
    process.exit(1);
}

const pascalCase = (str) =>
    str
        .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
        .replace(/^./, (char) => char.toUpperCase());

const camelCase = (str) => {
    const p = pascalCase(str);
    return p.charAt(0).toLowerCase() + p.slice(1);
};

const cleanName = name.replace(/Notification$/, "").replace(/Email$/, "");
const pascalName = pascalCase(cleanName);
const camelName = camelCase(cleanName);

const projectRoot = process.cwd();

// Ensure nodemailer dependency is installed
const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (fs.existsSync(nodeModulesPath) && !fs.existsSync(path.join(nodeModulesPath, 'nodemailer'))) {
  console.log('\n📦 Installing required package (nodemailer)...');
  try {
    const { execSync } = require('child_process');
    execSync('npm install nodemailer', { cwd: projectRoot, stdio: 'inherit', shell: true });
    console.log('✅ nodemailer installed successfully!\n');
  } catch (e) {
    console.warn('⚠️ Could not auto-install nodemailer. Please run: npm install nodemailer');
  }
}

const configPath = path.join(projectRoot, "src", "config", "mail.js");
const notificationDir = path.join(projectRoot, "src", "notifications", "email");
const filePath = path.join(notificationDir, `${pascalName}Notification.js`);

// 1. Ensure src/config/mail.js exists
if (!fs.existsSync(configPath)) {
    const mailConfigContent = `require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
  port: Number(process.env.MAIL_PORT) || 2525,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASSWORD || ''
  }
});

const mailConfig = {
  from: process.env.MAIL_FROM || '"Backend Platform" <noreply@Backend.com>',
  transporter
};

module.exports = mailConfig;
`;
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, mailConfigContent, "utf8");
    console.log("📄 Created mail configuration: src/config/mail.js");
}

// 2. Create Notification file
fs.mkdirSync(notificationDir, { recursive: true });

if (fs.existsSync(filePath)) {
    console.log(`⚠️ Email Notification already exists: ${pascalName}Notification.js`);
    process.exit(0);
}

const notificationContent = `const mailConfig = require('../../config/mail');
const logger = require('../../config/logger');

/**
 * Send ${pascalName} Email Notification
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} [options.userName] - Recipient name
 * @param {string} [options.actionUrl] - Optional CTA button URL
 * @returns {Promise<{ success: boolean, messageId: string }>}
 */
const send${pascalName}Notification = async ({ to, userName = 'User', actionUrl = '' }) => {
  try {
    const subject = '${pascalName} Notification - Backend';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #1e293b; margin-top: 0;">Hello \${userName},</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          You have received a new notification regarding <strong>${pascalName}</strong>.
        </p>
        \${
          actionUrl
            ? \`<div style="margin: 24px 0;">
                <a href="\${actionUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Details</a>
               </div>\`
            : ''
        }
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
          If you did not request this email, please ignore it.<br />
          &copy; \${new Date().getFullYear()} Backend. All rights reserved.
        </p>
      </div>
    \`;

    const info = await mailConfig.transporter.sendMail({
      from: mailConfig.from,
      to,
      subject,
      html
    });

    if (logger) {
      logger.info(\`Email \${subject} sent to \${to}: \${info.messageId}\`);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    if (logger) {
      logger.error(\`Failed to send ${pascalName} notification to \${to}: \${error.message}\`);
    }
    throw error;
  }
};

module.exports = send${pascalName}Notification;
`;

fs.writeFileSync(filePath, notificationContent, "utf8");
console.log(`\n✅ Email Notification created: src/notifications/email/${pascalName}Notification.js\n`);
