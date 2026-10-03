const express = require("express");
const bcrypt = require("bcryptjs");

const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/*
  HR / ADMIN authorization
*/
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

/*
  GET ALL EMPLOYEES
  GET /api/employees
*/
router.get(
  "/",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
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
          }
        }
      });

      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);

      res.status(500).json({
        message: "Failed to fetch employees."
      });
    }
  }
);

/*
  GET SINGLE EMPLOYEE
  GET /api/employees/:id
*/
router.get(
  "/:id",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
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
      console.error("Error fetching employee:", error);

      res.status(500).json({
        message: "Failed to fetch employee."
      });
    }
  }
);

/*
  CREATE EMPLOYEE
  POST /api/employees
*/
router.post(
  "/",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        employeeCode,
        email,
        phone,
        department,
        designation,
        dateOfJoining,
        password
      } = req.body;

      /*
        Validate required fields
      */
      if (
        !firstName ||
        !lastName ||
        !employeeCode ||
        !email ||
        !department ||
        !designation ||
        !dateOfJoining ||
        !password
      ) {
        return res.status(400).json({
          message: "Please fill in all required fields."
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters."
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanEmployeeCode = employeeCode.trim().toUpperCase();

      /*
        Check duplicate email
      */
      const existingUser = await prisma.user.findUnique({
        where: {
          email: cleanEmail
        }
      });

      if (existingUser) {
        return res.status(409).json({
          message: "An account with this email already exists."
        });
      }

      /*
        Check duplicate employee code
      */
      const existingEmployee = await prisma.employee.findUnique({
        where: {
          employeeCode: cleanEmployeeCode
        }
      });

      if (existingEmployee) {
        return res.status(409).json({
          message: "This employee code already exists."
        });
      }

      /*
        Hash password
      */
      const passwordHash = await bcrypt.hash(password, 10);

      /*
        Create User + Employee together
      */
      const employee = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: "EMPLOYEE",

          employee: {
            create: {
              employeeCode: cleanEmployeeCode,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: cleanEmail,
              phone: phone ? phone.trim() : null,
              department: department.trim(),
              designation: designation.trim(),
              dateOfJoining: new Date(`${dateOfJoining}T00:00:00.000Z`)
            }
          }
        },

        include: {
          employee: true
        }
      });

      /*
        Create initial leave balance
      */
      if (employee.employee) {
        await prisma.leaveBalance.create({
          data: {
            employeeId: employee.employee.id,
            year: new Date().getFullYear(),
            casualLeave: 12,
            sickLeave: 10,
            earnedLeave: 15
          }
        });
      }

      res.status(201).json({
        message: "Employee created successfully.",
        employee: employee.employee
      });
    } catch (error) {
      console.error("Error creating employee:", error);

      res.status(500).json({
        message: "Failed to create employee."
      });
    }
  }
);

/*
  UPDATE EMPLOYEE
  PATCH /api/employees/:id
*/
router.patch(
  "/:id",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const employeeId = req.params.id;

      const {
        firstName,
        lastName,
        employeeCode,
        email,
        phone,
        department,
        designation,
        dateOfJoining,
        password
      } = req.body;

      /*
        Find employee
      */
      const existingEmployee = await prisma.employee.findUnique({
        where: {
          id: employeeId
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

      const cleanEmail = email
        ? email.trim().toLowerCase()
        : existingEmployee.email;

      const cleanEmployeeCode = employeeCode
        ? employeeCode.trim().toUpperCase()
        : existingEmployee.employeeCode;

      /*
        Check duplicate email if changed
      */
      if (cleanEmail !== existingEmployee.user.email) {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            email: cleanEmail,
            NOT: {
              id: existingEmployee.userId
            }
          }
        });

        if (duplicateUser) {
          return res.status(409).json({
            message: "Another account already uses this email."
          });
        }
      }

      /*
        Check duplicate employee code if changed
      */
      if (cleanEmployeeCode !== existingEmployee.employeeCode) {
        const duplicateEmployee = await prisma.employee.findFirst({
          where: {
            employeeCode: cleanEmployeeCode,
            NOT: {
              id: employeeId
            }
          }
        });

        if (duplicateEmployee) {
          return res.status(409).json({
            message: "Another employee already uses this employee code."
          });
        }
      }

      /*
        Update employee
      */
      const updatedEmployee = await prisma.employee.update({
        where: {
          id: employeeId
        },

        data: {
          firstName:
            firstName !== undefined
              ? firstName.trim()
              : existingEmployee.firstName,

          lastName:
            lastName !== undefined
              ? lastName.trim()
              : existingEmployee.lastName,

          employeeCode: cleanEmployeeCode,

          email: cleanEmail,

          phone:
            phone !== undefined
              ? phone.trim() || null
              : existingEmployee.phone,

          department:
            department !== undefined
              ? department.trim()
              : existingEmployee.department,

          designation:
            designation !== undefined
              ? designation.trim()
              : existingEmployee.designation,

          dateOfJoining:
            dateOfJoining !== undefined
              ? new Date(`${dateOfJoining}T00:00:00.000Z`)
              : existingEmployee.dateOfJoining
        }
      });

      /*
        Keep User email synchronized
      */
      await prisma.user.update({
        where: {
          id: existingEmployee.userId
        },

        data: {
          email: cleanEmail
        }
      });

      /*
        Update password only if supplied
      */
      if (password && password.trim()) {
        if (password.length < 6) {
          return res.status(400).json({
            message: "Password must be at least 6 characters."
          });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.user.update({
          where: {
            id: existingEmployee.userId
          },

          data: {
            passwordHash
          }
        });
      }

      res.json({
        message: "Employee updated successfully.",
        employee: updatedEmployee
      });
    } catch (error) {
      console.error("Error updating employee:", error);

      res.status(500).json({
        message: "Failed to update employee."
      });
    }
  }
);

module.exports = router;