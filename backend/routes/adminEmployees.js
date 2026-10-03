const express = require("express");
const bcrypt = require("bcryptjs");
const { Prisma } = require("@prisma/client");

const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/* =========================================================
   HR / ADMIN ACCESS
========================================================= */

function requireHRorAdmin(req, res, next) {
  if (!req.user || !["HR", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({
      message: "HR or Admin access required."
    });
  }

  next();
}

const ALLOWED_ROLES = ["EMPLOYEE", "HR", "ADMIN"];

function normalizeRole(role) {
  if (!role) return "EMPLOYEE";
  const upper = String(role).trim().toUpperCase();
  if (!ALLOWED_ROLES.includes(upper)) {
    throw new Error("Invalid role specified. Role must be EMPLOYEE, HR, or ADMIN.");
  }
  return upper;
}

async function validateManager(managerId, employeeId = null) {
  if (managerId === undefined) return undefined;
  if (!managerId || managerId === "NONE" || managerId === "null" || String(managerId).trim() === "") {
    return null;
  }

  const trimmedId = String(managerId).trim();

  if (employeeId && trimmedId === employeeId) {
    throw new Error("An employee cannot be their own reporting manager.");
  }

  const manager = await prisma.employee.findUnique({
    where: { id: trimmedId },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, managerId: true }
  });

  if (!manager) {
    throw new Error("Selected reporting manager does not exist.");
  }

  if (employeeId) {
    let currentCheckId = manager.managerId;
    let depth = 0;
    while (currentCheckId && depth < 25) {
      if (currentCheckId === employeeId) {
        throw new Error("Cannot set reporting manager: this would create a circular reporting hierarchy.");
      }
      const parent = await prisma.employee.findUnique({
        where: { id: currentCheckId },
        select: { managerId: true }
      });
      currentCheckId = parent ? parent.managerId : null;
      depth++;
    }
  }

  return trimmedId;
}

router.use(authenticateToken);
router.use(requireHRorAdmin);

/* =========================================================
   GET ALL EMPLOYEES
   GET /api/admin/employees
========================================================= */

router.get("/", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true
          }
        }
      }
    });

    res.json(employees);
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error);

    res.status(500).json({
      message: "Failed to load employees."
    });
  }
});

/* =========================================================
   GET ONE EMPLOYEE
   GET /api/admin/employees/:id
========================================================= */

router.get("/:id", async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            department: true
          }
        },
        leaveBalance: true,
        attendance: {
          orderBy: {
            date: "desc"
          },
          take: 10
        },
        leaveRequests: {
          orderBy: {
            createdAt: "desc"
          },
          take: 10
        },
        payroll: {
          orderBy: [
            {
              year: "desc"
            },
            {
              month: "desc"
            }
          ],
          take: 10
        },
        documents: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    res.json(employee);
  } catch (error) {
    console.error("GET EMPLOYEE ERROR:", error);

    res.status(500).json({
      message: "Failed to load employee."
    });
  }
});

/* =========================================================
   CREATE EMPLOYEE
   POST /api/admin/employees
========================================================= */

router.post("/", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      employeeCode,
      phone,
      department,
      designation,
      dateOfJoining,
      managerId,
      role
    } = req.body;

    /* Required fields */

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !employeeCode ||
      !department ||
      !designation ||
      !dateOfJoining
    ) {
      return res.status(400).json({
        message: "Please fill all required fields."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = employeeCode.trim().toUpperCase();

    // Validate managerId and role
    const validatedManagerId = await validateManager(managerId);
    const validatedRole = normalizeRole(role);

    /* Check duplicate email */

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    /* Check duplicate employee code */

    const existingEmployee = await prisma.employee.findUnique({
      where: {
        employeeCode: normalizedCode
      }
    });

    if (existingEmployee) {
      return res.status(409).json({
        message: "This employee code already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: validatedRole
        }
      });

      const createdEmployee = await transaction.employee.create({
        data: {
          employeeCode: normalizedCode,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: phone ? phone.trim() : null,
          department: department.trim(),
          designation: designation.trim(),
          dateOfJoining: new Date(dateOfJoining),
          userId: user.id,
          managerId: validatedManagerId
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              designation: true
            }
          }
        }
      });

      /* Create initial leave balance */

      await transaction.leaveBalance.create({
        data: {
          employeeId: createdEmployee.id,
          year: new Date().getFullYear(),
          casualLeave: 12,
          sickLeave: 10,
          earnedLeave: 15
        }
      });

      return createdEmployee;
    });

    res.status(201).json({
      message: "Employee created successfully.",
      employee
    });
  } catch (error) {
    console.error("CREATE EMPLOYEE ERROR:", error);

    if (
      error.message?.includes("reporting manager") ||
      error.message?.includes("Invalid role")
    ) {
      return res.status(400).json({
        message: error.message
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({
        message: "Could not create employee. Check for duplicate data."
      });
    }

    res.status(500).json({
      message: "Failed to create employee."
    });
  }
});

/* =========================================================
   UPDATE EMPLOYEE
   PUT /api/admin/employees/:id
========================================================= */

async function updateEmployee(req, res) {
  try {
    const {
      firstName,
      lastName,
      email,
      employeeCode,
      phone,
      department,
      designation,
      dateOfJoining,
      managerId,
      role
    } = req.body;

    const existingEmployee = await prisma.employee.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        user: true
      }
    });

    if (!existingEmployee) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    const normalizedEmail = email
      ? email.trim().toLowerCase()
      : existingEmployee.email;

    const normalizedCode = employeeCode
      ? employeeCode.trim().toUpperCase()
      : existingEmployee.employeeCode;

    // Validate managerId if provided
    let validatedManagerId = existingEmployee.managerId;
    if (managerId !== undefined) {
      validatedManagerId = await validateManager(managerId, existingEmployee.id);
    }

    // Validate role if provided
    let validatedRole = existingEmployee.user?.role || "EMPLOYEE";
    if (role !== undefined && role !== null && role !== "") {
      validatedRole = normalizeRole(role);
    }

    /* Check email belongs to another user */

    const emailUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: {
          id: existingEmployee.userId
        }
      }
    });

    if (emailUser) {
      return res.status(409).json({
        message: "Another account already uses this email."
      });
    }

    /* Check employee code */

    const codeEmployee = await prisma.employee.findFirst({
      where: {
        employeeCode: normalizedCode,
        NOT: {
          id: req.params.id
        }
      }
    });

    if (codeEmployee) {
      return res.status(409).json({
        message: "Another employee already uses this employee code."
      });
    }

    const employee = await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: existingEmployee.userId
        },
        data: {
          email: normalizedEmail,
          role: validatedRole
        }
      });

      return transaction.employee.update({
        where: {
          id: req.params.id
        },
        data: {
          employeeCode: normalizedCode,
          firstName: firstName?.trim(),
          lastName: lastName?.trim(),
          email: normalizedEmail,
          phone: phone !== undefined ? (phone ? phone.trim() : null) : existingEmployee.phone,
          department: department?.trim(),
          designation: designation?.trim(),
          dateOfJoining: dateOfJoining
            ? new Date(dateOfJoining)
            : undefined,
          managerId: validatedManagerId
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              designation: true
            }
          }
        }
      });
    });

    res.json({
      message: "Employee updated successfully.",
      employee
    });
  } catch (error) {
    console.error("UPDATE EMPLOYEE ERROR:", error);

    if (
      error.message?.includes("reporting manager") ||
      error.message?.includes("Invalid role")
    ) {
      return res.status(400).json({
        message: error.message
      });
    }

    res.status(500).json({
      message: "Failed to update employee."
    });
  }
}

router.put("/:id", updateEmployee);
router.patch("/:id", updateEmployee);

/* =========================================================
   DELETE EMPLOYEE
   DELETE /api/admin/employees/:id
========================================================= */

router.delete("/:id", async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        user: {
          select: {
            id: true,
            role: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    // 1. Prevent self-deletion
    if (employee.userId === req.user?.userId) {
      return res.status(400).json({
        message: "You cannot delete your own account."
      });
    }

    // 2. Prevent HR from deleting ADMIN accounts
    const targetRole = employee.user?.role;
    if (req.user?.role === "HR" && targetRole === "ADMIN") {
      return res.status(403).json({
        message: "HR users cannot delete administrator accounts."
      });
    }

    await prisma.$transaction(async (transaction) => {
      /* Delete dependent records first */

      await transaction.document.deleteMany({
        where: {
          employeeId: employee.id
        }
      });

      await transaction.payroll.deleteMany({
        where: {
          employeeId: employee.id
        }
      });

      await transaction.leaveRequest.deleteMany({
        where: {
          employeeId: employee.id
        }
      });

      await transaction.leaveBalance.deleteMany({
        where: {
          employeeId: employee.id
        }
      });

      await transaction.attendance.deleteMany({
        where: {
          employeeId: employee.id
        }
      });

      await transaction.employee.delete({
        where: {
          id: employee.id
        }
      });

      await transaction.user.delete({
        where: {
          id: employee.userId
        }
      });
    });

    res.json({
      message: "Employee deleted successfully."
    });
  } catch (error) {
    console.error("DELETE EMPLOYEE ERROR:", error);

    res.status(500).json({
      message: "Failed to delete employee."
    });
  }
});

module.exports = router;