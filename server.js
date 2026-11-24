require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "reports.json");
const STATUSES = ["Pending", "Under Inspection", "Work Started", "Completed"];
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "roadnetra_admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "rn_admin";
const JWT_SECRET = process.env.JWT_SECRET || "development-only-secret-change-me";

app.use(express.json({ limit: "1mb" }));

function priorityFor(severity, confirmations = 1) {
  if (severity === "High") return "Critical";
  if (severity === "Medium") return confirmations >= 5 ? "Critical" : "High";
  return confirmations >= 5 ? "High" : "Normal";
}

function safeText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

async function readReports() {
  const text = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(text);
}

async function writeReports(reports) {
  const temporaryFile = DATA_FILE + ".tmp";
  await fs.writeFile(temporaryFile, JSON.stringify(reports, null, 2), "utf8");
  await fs.rename(temporaryFile, DATA_FILE);
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Admin login is required." });

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Your login session has expired. Please sign in again." });
  }
}

app.post("/api/auth/login", (req, res) => {
  const username = safeText(req.body.username, 60);
  const password = String(req.body.password || "");

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Incorrect username or password." });
  }

  const token = jwt.sign({ role: "admin", username }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

app.get("/api/reports", async (req, res, next) => {
  try {
    res.json(await readReports());
  } catch (error) {
    next(error);
  }
});

app.get("/api/reports/:id", async (req, res, next) => {
  try {
    const report = (await readReports()).find(
      item => item.id.toLowerCase() === req.params.id.toLowerCase()
    );
    if (!report) return res.status(404).json({ message: "Complaint ID not found." });
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.post("/api/reports", async (req, res, next) => {
  try {
    const { type, severity, location, city, pin, description, latitude, longitude } = req.body;
    const hasGps = latitude !== "" && longitude !== "" && latitude != null && longitude != null;
    const hasManualLocation = safeText(location) && safeText(city) && /^\d{6}$/.test(safeText(pin, 6));

    if (!safeText(type) || !["Low", "Medium", "High"].includes(severity) || !safeText(description)) {
      return res.status(400).json({ message: "Please complete the damage details." });
    }
    if (!hasGps && !hasManualLocation) {
      return res.status(400).json({ message: "Add a complete manual location or use GPS." });
    }

    const id = "RN-" + new Date().getFullYear() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const report = {
      id,
      type: safeText(type, 80),
      severity,
      priority: priorityFor(severity),
      confirmations: 1,
      location: safeText(location) || "GPS Location",
      city: safeText(city) || "Location detected by GPS",
      pin: safeText(pin, 6),
      description: safeText(description, 800),
      latitude: hasGps ? Number(latitude) : "",
      longitude: hasGps ? Number(longitude) : "",
      status: "Pending",
      date: new Date().toISOString().slice(0, 10)
    };

    const reports = await readReports();
    reports.unshift(report);
    await writeReports(reports);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});

app.post("/api/reports/:id/confirm", async (req, res, next) => {
  try {
    const reports = await readReports();
    const report = reports.find(item => item.id === req.params.id);
    if (!report) return res.status(404).json({ message: "Complaint ID not found." });

    report.confirmations = Number(report.confirmations || 1) + 1;
    report.priority = priorityFor(report.severity, report.confirmations);
    await writeReports(reports);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/reports/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const status = safeText(req.body.status, 40);
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid complaint status." });

    const reports = await readReports();
    const report = reports.find(item => item.id === req.params.id);
    if (!report) return res.status(404).json({ message: "Complaint ID not found." });

    report.status = status;
    await writeReports(reports);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.get("/api/stats", async (req, res, next) => {
  try {
    const reports = await readReports();
    const count = status => reports.filter(item => item.status === status).length;
    res.json({
      total: reports.length,
      pending: count("Pending"),
      inProgress: count("Under Inspection") + count("Work Started"),
      resolved: count("Completed")
    });
  } catch (error) {
    next(error);
  }
});

app.use("/data", (_req, res) => res.sendStatus(404));
app.use(express.static(ROOT, { dotfiles: "deny" }));
app.get("/", (_req, res) => res.sendFile(path.join(ROOT, "index.html")));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

app.listen(PORT, () => {
  console.log(`RoadNetra is running at http://localhost:${PORT}`);
});
