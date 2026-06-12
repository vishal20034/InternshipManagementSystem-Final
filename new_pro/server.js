const express = require('express');
const http = require('http');
const next = require('next');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const port = process.env.PORT || 5000;
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/internship-portal";

// ====== ALL IMPORTS FROM WITHIN new_pro/ ONLY ======
const authRoutes = require("./src/routes/auth");
const legacyRoutes = require("./src/routes/legacy");
const coordinatorRoutes = require("./src/routes/coordinator");
const hrRoutes = require("./src/routes/hr");
const { setupSocket } = require("./socket/handler");

// ====== V2 ROUTE IMPORTS ======
const studentPortalV2 = require("./src/routes/v2/studentPortal");
const coordinatorV2   = require("./src/routes/v2/coordinator");
const hrV2            = require("./src/routes/v2/hr");
const documentsV2     = require("./src/routes/v2/documents");
const certificatesV2  = require("./src/routes/v2/certificates");
const paymentV2       = require("./src/routes/v2/payment");
const botsV2          = require("./src/routes/v2/bots");
const quizV2          = require("./src/routes/v2/quiz");

// NoSQL injection sanitizer (strips $ and . keys from request data)
function sanitizeKeys(obj) {
  if (!obj || typeof obj !== "object") return;
  const dangerous = Object.keys(obj).filter(k => k.startsWith("$") || k.includes("."));
  for (const k of dangerous) delete obj[k];
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === "object") sanitizeKeys(obj[k]);
  }
}

nextApp.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  // ====== SECURITY MIDDLEWARE ======
  server.set("trust proxy", 1);

  // CORS — restrict to known origins (set via env)
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  server.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  }));

  // Rate limiting — apply globally for API routes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // max 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts. Please wait before trying again." },
  });

  server.use('/api/', apiLimiter);

  // Helmet with proper security headers
  server.use(helmet({
    contentSecurityPolicy: false,   // Next.js handles CSP via next.config.mjs
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  server.use(express.json({ limit: "5mb" }));

  // NoSQL injection sanitizer on all request data
  server.use((req, _res, next) => {
    sanitizeKeys(req.body);
    sanitizeKeys(req.params);
    sanitizeKeys(req.query);
    next();
  });

  // Static files — locked down to local uploads folder
  server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // ====== MONGOOSE ======
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log("MongoDB Connected (Next.js Custom Server)");
      try { require('./services/automationCron'); console.log("Automation Crons Active"); } catch (err) { console.error("Failed to load Automation Crons:", err.message); }
    })
    .catch((err) => console.error("MongoDB connection error:", err));

  // ====== SOCKET.IO ======
  setupSocket(httpServer);

  // ====== API ROUTES (all from within new_pro/) ======
  server.use("/api/auth", authRoutes);
  server.use("/api/coordinator", coordinatorRoutes);
  server.use("/api/hr", hrRoutes);

  // ====== API V2 ROUTES ======
  server.use("/api/v2", studentPortalV2);
  server.use("/api/v2", coordinatorV2);
  server.use("/api/v2", hrV2);
  server.use("/api/v2", documentsV2);
  server.use("/api/v2", certificatesV2);
  server.use("/api/v2", paymentV2);
  server.use("/api/v2/bots", botsV2);
  server.use("/api/v2", quizV2);

  // Legacy root-level routes (TSX pages call these directly)
  server.use("/", legacyRoutes);

  // Auth root-level aliases
  server.use("/", authRoutes);

  // ====== NEXT.JS PAGE HANDLER ======
  server.all(/.*/, (req, res) => {
    console.log('[Next.js Handle]', req.method, req.url);
    return handle(req, res);
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
