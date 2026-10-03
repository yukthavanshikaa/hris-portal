require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const leaveRoutes = require("./routes/leave");
const payrollRoutes = require("./routes/payroll");
const documentsRoutes = require("./routes/documents");

const adminDocumentsRoutes = require("./routes/adminDocuments");
const adminLeaveRoutes = require("./routes/adminLeave");
const adminEmployeesRoutes = require("./routes/adminEmployees");
const adminAttendanceRoutes = require("./routes/adminAttendance");
const adminPayrollRoutes = require("./routes/adminPayroll");

const organizationRoutes = require("./routes/organization");
const assistantRoutes = require("./routes/assistant");

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/* =========================================================
   CORS
========================================================= */

const configuredOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim().replace(/\/$/, ""))
  : [];

const allowedOrigins = [
  "http://localhost:5173",
  ...configuredOrigins
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================================================
   STATIC UPLOADS
========================================================= */

app.use("/uploads", express.static("uploads"));

/* =========================================================
   BASIC ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({
    message: "HRIS Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "HRIS API is healthy"
  });
});

/* =========================================================
   EMPLOYEE ROUTES
========================================================= */

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/assistant", assistantRoutes);

/* =========================================================
   HR / ADMIN ROUTES
========================================================= */

app.use("/api/admin/documents", adminDocumentsRoutes);
app.use("/api/admin/leave", adminLeaveRoutes);
app.use("/api/admin/employees", adminEmployeesRoutes);
app.use("/api/admin/attendance", adminAttendanceRoutes);
app.use("/api/admin/payroll", adminPayrollRoutes);

/*
  These aliases make the frontend work even if your
  existing HR page uses one of these older API paths.
*/

app.use("/api/hr/employees", adminEmployeesRoutes);
app.use("/api/employees", adminEmployeesRoutes);

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found."
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  res.status(500).json({
    message: "Internal server error."
  });
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HRIS Backend running on http://localhost:${PORT}`);
});