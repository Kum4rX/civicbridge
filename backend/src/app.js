const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();

// Helper to normalize origins (trim whitespace, remove quotes, strip trailing slashes)
const normalizeOrigin = (origin) =>
  origin ? origin.trim().replace(/^[\"']|[\"']$/g, '').replace(/\/+$/, '') : '';

// Base allowed origins (local development + production Vercel frontend)
const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://civicbridge-murex.vercel.app'
];

// Append any origin(s) configured in CLIENT_ORIGIN (supports single or comma-separated list)
if (process.env.CLIENT_ORIGIN) {
  process.env.CLIENT_ORIGIN.split(',').forEach((orig) => {
    const clean = normalizeOrigin(orig);
    if (clean && !allowedOrigins.includes(clean)) {
      allowedOrigins.push(clean);
    }
  });
}

// CORS options
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, Postman, server health checks)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = normalizeOrigin(origin);
    const isAllowed =
      allowedOrigins.includes(cleanOrigin) ||
      /^https:\/\/civicbridge(-[a-zA-Z0-9_-]+)?\.vercel\.app$/.test(cleanOrigin);

    if (isAllowed) {
      return callback(null, true);
    }

    const corsError = new Error(`CORS origin not allowed: ${origin}`);
    corsError.statusCode = 403;
    return callback(corsError);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
