const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.SERVER_PORT,
  PG_URL: process.env.PG_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PWD: process.env.SMTP_PWD,
  SMTP_EMAIL: process.env.SMTP_EMAIL
};
