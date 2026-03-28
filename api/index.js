/**
 * Vercel serverless entry — export the Express app directly (no serverless-http).
 * @see https://vercel.com/docs/frameworks/backend/express
 */
const app = require("../server/app");

module.exports = app;
