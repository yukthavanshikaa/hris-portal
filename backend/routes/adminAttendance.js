const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const ALLOWED_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY"];

/* =========================================================
   HR / ADMIN AUTHORIZATION MIDDLEWARE
   Both HR and ADMIN roles are allowed.
   EMPLOYEE role receives 403 Forbidden.
========================================================= */

function requireHRorAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  if (req.user.role !== "HR" && req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "HR or Admin access required."
    });
  }

  next();
}

router.use(authenticateToken);
router.use(requireHRorAdmin);

/**
 * Returns current date string in IST (Asia/Kolkata) formatted as YYYY-MM-DD
 */
function getTodayIST() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

/* =========================================================
   ENDPOINT 1: GET ALL ATTENDANCE RECORDS FOR A DATE
   GET /api/admin/attendance
   Query params:
   - date: YYYY-MM-DD (defaults to today in IST)
   - department: optional string (filters table records only)
   - status: optional AttendanceStatus (filters table records only)
   - search: optional text matching code or name (filters table records only)
========================================================= */

router.get("/", async (req, res) => {
  try {
    const { date, department, status, search } = req.query;

    // 1. Explicit IST Calendar Day Boundaries (UTC+05:30)
    const todayISTStr = getTodayIST();
    const queryDateStr = date && date.trim() ? date.trim() : todayISTStr;

    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_REGEX.test(queryDateStr)) {
      return res.status(400).json({
        message: "Invalid date format. Expected YYYY-MM-DD."
      });
    }

    const [year, month, day] = queryDateStr.split("-").map(Number);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));
    if (
      calendarCheck.getUTCFullYear() !== year ||
      calendarCheck.getUTCMonth() !== month - 1 ||
      calendarCheck.getUTCDate() !== day
    ) {
      return res.status(400).json({
        message: "Invalid calendar date provided."
      });
    }

    // Explicit IST boundaries (independent of host OS/server timezone)
    const startOfDay = new Date(`${queryDateStr}T00:00:00+05:30`);
    const endOfDay = new Date(`${queryDateStr}T23:59:59.999+05:30`);

    const dateWhereClause = {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    };

    // 2. Query Unfiltered Records For The Date to Calculate Date Summary
    const dateAttendanceRecords = await prisma.attendance.findMany({
      where: dateWhereClause,
      select: {
        id: true,
        status: true
      }
    });

    const totalRecords = dateAttendanceRecords.length;
    const presentCount = dateAttendanceRecords.filter(
      (r) => r.status === "PRESENT"
    ).length;
    const lateCount = dateAttendanceRecords.filter(
      (r) => r.status === "LATE"
    ).length;
    const halfDayCount = dateAttendanceRecords.filter(
      (r) => r.status === "HALF_DAY"
    ).length;
    const absentCount = dateAttendanceRecords.filter(
      (r) => r.status === "ABSENT"
    ).length;
    const leaveCount = dateAttendanceRecords.filter(
      (r) => r.status === "LEAVE"
    ).length;

    const summary = {
      totalRecords,
      presentCount,
      lateCount,
      halfDayCount,
      absentCount,
      leaveCount
    };

    // 3. Build Table Where Clause (Applying Department, Status, Search)
    const tableWhereClause = {
      ...dateWhereClause
    };

    if (status && status.trim() && status.trim().toUpperCase() !== "ALL") {
      const normalizedStatus = status.trim().toUpperCase();
      if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          message: `Invalid status filter. Allowed values are: ${ALLOWED_STATUSES.join(", ")}.`
        });
      }
      tableWhereClause.status = normalizedStatus;
    }

    const employeeFilter = {};

    if (
      department &&
      department.trim() &&
      department.trim().toUpperCase() !== "ALL"
    ) {
      employeeFilter.department = {
        equals: department.trim(),
        mode: "insensitive"
      };
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      const words = searchTerm.split(/\s+/).filter(Boolean);

      if (words.length > 1) {
        employeeFilter.OR = [
          { employeeCode: { contains: searchTerm, mode: "insensitive" } },
          { firstName: { contains: searchTerm, mode: "insensitive" } },
          { lastName: { contains: searchTerm, mode: "insensitive" } },
          {
            AND: words.map((word) => ({
              OR: [
                { firstName: { contains: word, mode: "insensitive" } },
                { lastName: { contains: word, mode: "insensitive" } }
              ]
            }))
          }
        ];
      } else {
        employeeFilter.OR = [
          { employeeCode: { contains: searchTerm, mode: "insensitive" } },
          { firstName: { contains: searchTerm, mode: "insensitive" } },
          { lastName: { contains: searchTerm, mode: "insensitive" } }
        ];
      }
    }

    if (Object.keys(employeeFilter).length > 0) {
      tableWhereClause.employee = employeeFilter;
    }

    // 4. Query Filtered Table Records
    const tableAttendanceRecords = await prisma.attendance.findMany({
      where: tableWhereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true
          }
        }
      },
      orderBy: [
        { employee: { firstName: "asc" } },
        { employee: { lastName: "asc" } }
      ]
    });

    const records = tableAttendanceRecords.map((record) => ({
      id: record.id,
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      employeeId: record.employeeId,
      employee: record.employee,
      employeeCode: record.employee?.employeeCode || "",
      firstName: record.employee?.firstName || "",
      lastName: record.employee?.lastName || "",
      department: record.employee?.department || "",
      designation: record.employee?.designation || "",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));

    return res.json({
      date: queryDateStr,
      summary,
      totalRecords,
      presentCount,
      lateCount,
      halfDayCount,
      absentCount,
      leaveCount,
      records
    });
  } catch (error) {
    console.error("GET ADMIN ATTENDANCE ERROR:", error);

    return res.status(500).json({
      message: "Failed to load attendance records.",
      error: error.message
    });
  }
});

/* =========================================================
   ENDPOINT 2: REGULARIZE AN EXISTING ATTENDANCE RECORD
   PATCH /api/admin/attendance/:id
   Accepted fields:
   - status: PRESENT, ABSENT, LATE, LEAVE, HALF_DAY
   - checkIn: valid ISO timestamp or null
   - checkOut: valid ISO timestamp or null
========================================================= */

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, checkIn, checkOut } = req.body;

    if (
      status === undefined &&
      checkIn === undefined &&
      checkOut === undefined
    ) {
      return res.status(400).json({
        message:
          "Please provide at least one field to update (status, checkIn, or checkOut)."
      });
    }

    // 1. Verify that the attendance record exists
    const existingRecord = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true
          }
        }
      }
    });

    if (!existingRecord) {
      return res.status(404).json({
        message: "Attendance record not found."
      });
    }

    const updateData = {};

    // 2. Validate Status
    if (status !== undefined) {
      if (typeof status !== "string" || !status.trim()) {
        return res.status(400).json({
          message: "Status must be a non-empty string."
        });
      }

      const normalizedStatus = status.trim().toUpperCase();
      if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          message: `Invalid status "${status}". Allowed values are: ${ALLOWED_STATUSES.join(", ")}.`
        });
      }

      updateData.status = normalizedStatus;
    }

    // 3. Validate Check-In (accept null/empty or valid Date)
    if (checkIn !== undefined) {
      if (checkIn === null || checkIn === "") {
        updateData.checkIn = null;
      } else {
        const parsedCheckIn = new Date(checkIn);
        if (isNaN(parsedCheckIn.getTime())) {
          return res.status(400).json({
            message:
              "Invalid checkIn value. Must be a valid date/time string or null."
          });
        }
        updateData.checkIn = parsedCheckIn;
      }
    }

    // 4. Validate Check-Out (accept null/empty or valid Date)
    if (checkOut !== undefined) {
      if (checkOut === null || checkOut === "") {
        updateData.checkOut = null;
      } else {
        const parsedCheckOut = new Date(checkOut);
        if (isNaN(parsedCheckOut.getTime())) {
          return res.status(400).json({
            message:
              "Invalid checkOut value. Must be a valid date/time string or null."
          });
        }
        updateData.checkOut = parsedCheckOut;
      }
    }

    // 5. Update Record (employeeId and date are deliberately preserved)
    const updatedRecord = await prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true
          }
        }
      }
    });

    const formattedRecord = {
      id: updatedRecord.id,
      date: updatedRecord.date,
      checkIn: updatedRecord.checkIn,
      checkOut: updatedRecord.checkOut,
      status: updatedRecord.status,
      employeeId: updatedRecord.employeeId,
      employee: updatedRecord.employee,
      employeeCode: updatedRecord.employee?.employeeCode || "",
      firstName: updatedRecord.employee?.firstName || "",
      lastName: updatedRecord.employee?.lastName || "",
      department: updatedRecord.employee?.department || "",
      designation: updatedRecord.employee?.designation || "",
      createdAt: updatedRecord.createdAt,
      updatedAt: updatedRecord.updatedAt
    };

    return res.json({
      message: "Attendance record regularized successfully.",
      record: formattedRecord,
      attendance: formattedRecord
    });
  } catch (error) {
    console.error("PATCH ADMIN ATTENDANCE ERROR:", error);

    return res.status(500).json({
      message: "Failed to update attendance record.",
      error: error.message
    });
  }
});

module.exports = router;
