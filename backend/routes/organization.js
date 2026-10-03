const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/**
 * Build a recursive tree from a flat list of employee nodes
 */
function buildHierarchyTree(employees) {
  const employeeMap = new Map();

  // Initialize nodes
  employees.forEach((emp) => {
    employeeMap.set(emp.id, {
      ...emp,
      directReports: []
    });
  });

  const rootNodes = [];

  // Link children to parents
  employees.forEach((emp) => {
    const node = employeeMap.get(emp.id);
    if (emp.managerId && employeeMap.has(emp.managerId)) {
      const parentNode = employeeMap.get(emp.managerId);
      parentNode.directReports.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

/**
 * GET /api/organization
 * Authenticated endpoint to fetch the organization directory and reporting hierarchy tree.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: [
        { department: "asc" },
        { designation: "asc" },
        { firstName: "asc" }
      ],
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        dateOfJoining: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
            employeeCode: true
          }
        },
        _count: {
          select: {
            directReports: true
          }
        }
      }
    });

    const sanitizedEmployees = employees.map((emp) => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      dateOfJoining: emp.dateOfJoining,
      managerId: emp.managerId,
      manager: emp.manager
        ? {
            id: emp.manager.id,
            firstName: emp.manager.firstName,
            lastName: emp.manager.lastName,
            fullName: `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim(),
            designation: emp.manager.designation,
            department: emp.manager.department,
            employeeCode: emp.manager.employeeCode
          }
        : null,
      directReportsCount: emp._count?.directReports || 0
    }));

    const hierarchyTree = buildHierarchyTree(sanitizedEmployees);

    // Group distinct departments
    const departments = [...new Set(sanitizedEmployees.map((e) => e.department))].filter(Boolean);

    res.json({
      totalEmployees: sanitizedEmployees.length,
      departments,
      tree: hierarchyTree,
      employees: sanitizedEmployees
    });
  } catch (error) {
    console.error("Organization API Error:", error);
    res.status(500).json({
      message: "Failed to load organization hierarchy."
    });
  }
});

module.exports = router;
