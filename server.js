// backend/server.js  (ESM)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import database from "./config/database.js";
import errorHandler from "./middlewares/errorHandler.js";
import logger from "./utils/logger.js";
import centerRoutes from "./routes/centerRoutes.js";
import formSetupRoutes from "./routes/formSetupRoutes.js";
import verificationCode from "./routes/verificationCodeRoute.js";
import formSubmit from "./routes/submitFormRoutes.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import ensureSuperAdmin from "./utils/ensureSuperAdmin.js";
import apiConfigRoutes from "./routes/apiConfigRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import dncRoutes from "./routes/dncRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import googleKeyRoutes from "./routes/googleKeyRoutes.js";

const app = express();

/* ---------------- security middleware ---------------- */

app.use(
  helmet({
    contentSecurityPolicy: false, // SPA served from same origin; tune per deploy
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV !== "test") {
  // Only log problem requests (4xx/5xx). Successful page loads, static assets
  // (videos/images), polling and bot scans (all <400) are skipped to keep the
  // terminal/log files focused on real issues.
  app.use(
    morgan("combined", {
      stream: logger.stream,
      skip: (req, res) => res.statusCode < 400,
    })
  );
}

app.use("/uploads", express.static("uploads"));

// The `sheets` folder holds Google service-account keys (admin.json and each
// center's *.json). These must NEVER be downloadable over HTTP, so block any
// request for a JSON file before the static handler can serve it.
app.use("/sheets", (req, res, next) => {
  if (/\.json$/i.test(req.path)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  next();
});
app.use("/sheets", express.static("sheets"));

/* ---------------- health ---------------- */

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Jornaya Bot Backend",
  });
});

/* ---------------- API routes ---------------- */

app.use("/api/auth", authRoutes);
app.use("/api/verification", verificationCode);
app.use("/api/centers", centerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/form-setup", formSetupRoutes);
app.use("/api/submit-form", formSubmit);
app.use("/api/api-configs", apiConfigRoutes);
app.use("/api/portal-records", recordRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dnc", dncRoutes);
app.use("/api/logs", auditRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/google-keys", googleKeyRoutes);

/* ---------------- frontend (SPA) ---------------- */

app.use(express.static(path.join(__dirname, "frontend", "dist")));

/* ---------------- 404 (API ONLY) ---------------- */

app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// SPA fallback for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

/* ---------------- error handler ---------------- */

app.use(errorHandler);

/* ---------------- server start ---------------- */

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await database.connect();
    await ensureSuperAdmin();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  console.log("\nShutting down server...");
  await database.disconnect();
  process.exit(0);
});

startServer();
