const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

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
 * Safely convert Prisma Decimal to JS Number
 */
function toDecimalNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val.toNumber === "function") return val.toNumber();
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
}

/* =========================================================
   GET /api/admin/payroll
   Company-wide payroll records with optional filters:
   - month: 1-12 or "ALL"
   - year: integer year or "ALL"
   - department: department name or "ALL"
   - search: employee name or code search
========================================================= */
router.get("/", async (req, res) => {
  try {
    const { month, year, department, search } = req.query;

    const where = {};

    // 1. Month Filter
    if (month && month !== "ALL") {
      const parsedMonth = parseInt(month, 10);
      if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
        where.month = parsedMonth;
      }
    }

    // 2. Year Filter
    if (year && year !== "ALL") {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear) && parsedYear > 1900) {
        where.year = parsedYear;
      }
    }

    // 3. Employee Relation Filters (Department and Search)
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

      employeeFilter.OR = [
        { employeeCode: { contains: searchTerm, mode: "insensitive" } },
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        ...(words.length > 1
          ? [
              {
                AND: words.map((word) => ({
                  OR: [
                    { firstName: { contains: word, mode: "insensitive" } },
                    { lastName: { contains: word, mode: "insensitive" } }
                  ]
                }))
              }
            ]
          : [])
      ];
    }

    if (Object.keys(employeeFilter).length > 0) {
      where.employee = employeeFilter;
    }

    // 4. Query Payroll Records with Employee Relation
    const records = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            designation: true
          }
        }
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { employee: { department: "asc" } },
        { employee: { firstName: "asc" } }
      ]
    });

    // 5. Serialize Decimal Values and Compute Summary Totals
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    const employeeIdSet = new Set();

    const sanitizedRecords = records.map((record) => {
      const basicSalary = toDecimalNumber(record.basicSalary);
      const hra = toDecimalNumber(record.hra);
      const allowances = toDecimalNumber(record.allowances);
      const deductions = toDecimalNumber(record.deductions);
      const grossSalary = toDecimalNumber(record.grossSalary);
      const netSalary = toDecimalNumber(record.netSalary);

      totalGross += grossSalary;
      totalDeductions += deductions;
      totalNet += netSalary;

      if (record.employeeId) {
        employeeIdSet.add(record.employeeId);
      }

      return {
        id: record.id,
        employeeId: record.employeeId,
        month: record.month,
        year: record.year,
        basicSalary,
        hra,
        allowances,
        deductions,
        grossSalary,
        netSalary,
        payslipUrl: record.payslipUrl || null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        employee: record.employee
          ? {
              id: record.employee.id,
              firstName: record.employee.firstName,
              lastName: record.employee.lastName,
              fullName: `${record.employee.firstName || ""} ${record.employee.lastName || ""}`.trim(),
              employeeCode: record.employee.employeeCode,
              department: record.employee.department,
              designation: record.employee.designation
            }
          : null
      };
    });

    // 6. Distinct Departments for Filter Dropdown
    const distinctDepts = await prisma.employee.findMany({
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" }
    });
    const departments = distinctDepts
      .map((d) => d.department)
      .filter(Boolean);

    res.json({
      records: sanitizedRecords,
      summary: {
        totalGross: Math.round(totalGross * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        totalEmployeesPaid: employeeIdSet.size
      },
      departments
    });
  } catch (error) {
    console.error("ADMIN PAYROLL ERROR:", error);
    res.status(500).json({
      message: "Failed to load payroll records.",
      error: error.message
    });
  }
});

module.exports = router;
