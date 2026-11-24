
require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const STATUSES = [
  "Pending",
  "Under Inspection",
  "Work Started",
  "Completed"
];

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "roadnetra_admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !ADMIN_PASSWORD ||
  !JWT_SECRET
) {
  throw new Error("Missing required environment variables in .env");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(express.json({ limit: "1mb" }));

function priorityFor(severity, confirmations = 1) {
  if (severity === "High") return "Critical";
  if (severity === "Medium") return confirmations >= 5 ? "Critical" : "High";
  return confirmations >= 5 ? "High" : "Normal";
}

function safeText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ message: "Admin login is required." });
  }

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({
      message: "Your login session has expired. Please sign in again."
    });
  }
}

// ADMIN LOGIN
app.post("/api/auth/login", (req, res) => {
  const username = safeText(req.body.username, 60);
  const password = String(req.body.password || "");

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      message: "Incorrect username or password."
    });
  }

  const token = jwt.sign(
    { role: "admin", username },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
});

// GET ALL REPORTS
app.get("/api/reports", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET SINGLE REPORT
app.get("/api/reports/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .ilike("id", safeText(req.params.id, 50))
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        message: "Complaint ID not found."
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// SUBMIT REPORT
app.post("/api/reports", async (req, res, next) => {
  try {
    const {
      type,
      severity,
      location,
      city,
      pin,
      description,
      latitude,
      longitude
    } = req.body;

    const hasGps =
      latitude !== "" &&
      longitude !== "" &&
      latitude != null &&
      longitude != null &&
      Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude));

    const hasManualLocation =
      safeText(location) &&
      safeText(city) &&
      /^\d{6}$/.test(safeText(pin, 6));

    if (
      !safeText(type) ||
      !["Low", "Medium", "High"].includes(severity) ||
      !safeText(description)
    ) {
      return res.status(400).json({
        message: "Please complete the damage details."
      });
    }

    if (!hasGps && !hasManualLocation) {
      return res.status(400).json({
        message: "Add a complete manual location or use GPS."
      });
    }

    const report = {
      id: "RN-" + new Date().getFullYear() + "-" +
        crypto.randomBytes(3).toString("hex").toUpperCase(),

      type: safeText(type, 80),
      severity,
      priority: priorityFor(severity),
      confirmations: 1,
      location: safeText(location) || "GPS Location",
      city: safeText(city) || "Location detected by GPS",
      pin: safeText(pin, 6),
      description: safeText(description, 800),
      latitude: hasGps ? Number(latitude) : null,
      longitude: hasGps ? Number(longitude) : null,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10)
    };

    const { data, error } = await supabase
      .from("reports")
      .insert(report)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// CONFIRM REPORT
app.post("/api/reports/:id/confirm", async (req, res, next) => {
  try {
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!report) {
      return res.status(404).json({
        message: "Complaint ID not found."
      });
    }

    const confirmations = Number(report.confirmations || 1) + 1;

    const { data, error } = await supabase
      .from("reports")
      .update({
        confirmations,
        priority: priorityFor(report.severity, confirmations)
      })
      .eq("id", report.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// UPDATE REPORT STATUS - ADMIN ONLY
app.patch("/api/reports/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const status = safeText(req.body.status, 40);

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid complaint status."
      });
    }

    const { data, error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        message: "Complaint ID not found."
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DASHBOARD STATISTICS
app.get("/api/stats", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("status");

    if (error) throw error;

    const count = status =>
      data.filter(report => report.status === status).length;

    res.json({
      total: data.length,
      pending: count("Pending"),
      inProgress:
        count("Under Inspection") + count("Work Started"),
      resolved: count("Completed")
    });
  } catch (error) {
    next(error);
  }
});

// PROTECT LOCAL DATA FILES
app.use("/data", (_req, res) => res.sendStatus(404));

// SERVE FRONTEND
app.use(express.static(ROOT, { dotfiles: "deny" }));

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

// ERROR HANDLER
app.use((error, _req, res, _next) => {
  console.error("RoadNetra API Error:", error.message);

  res.status(500).json({
    message: "Something went wrong. Please try again."
  });
});

app.listen(PORT, () => {
  console.log(`RoadNetra is running at http://localhost:${PORT}`);
});
