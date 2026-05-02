const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth.routes");
const projectRoutes = require("./routes/project.routes");
const taskRoutes = require("./routes/task.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5001);
const clientPath = path.join(__dirname, "../../client/dist");
const clientIndexPath = path.join(clientPath, "index.html");
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

function normalizeOrigin(origin) {
  return origin.trim().replace(/\/$/, "");
}

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.length === 0) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  return allowedOrigins.includes(normalizedOrigin) || normalizedOrigin.endsWith(".up.railway.app");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ethara-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientPath));
}

app.get("*", (req, res) => {
  if (fs.existsSync(clientIndexPath)) {
    res.sendFile(clientIndexPath);
    return;
  }

  res.json({
    message: "Ethara API is running",
    health: "/health",
    api: ["/api/auth", "/api/projects", "/api/tasks", "/api/dashboard"]
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong"
  });
});

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to server/.env.");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected");

  const server = app.listen(port, () => {
    console.log(`Ethara running at http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the old server or change PORT in server/.env.`);
      return;
    }

    console.error(error.message);
    process.exit(1);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
