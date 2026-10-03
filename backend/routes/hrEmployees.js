const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/* =====================================================
   HR / ADMIN ACCESS
===================================================== */

function requireHRorAdmin(req, res, next) {
  if (req.user?.role !== "HR" && req.user?.role !== "ADMIN") {
    return res.status(403).json({
      message: "HR or Admin access required."
    });
  }

  next();
}

/* =====================================================
   GET ALL EMPLOYEES
===================================================== */

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
              email: true,
              role: true
            }
          }
        }
      });

      const result = employees.map((employee) => ({
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        dateOfJoining: employee.dateOfJoining,
        user: employee.user
      }));

      res.json(result);
    } catch (error) {
      console.error("GET EMPLOYEES ERROR:", error);

      res.status(500).json({
        message: "Failed to load employees."
      });
    }
  }
);

/* =====================================================
   GET SINGLE EMPLOYEE
===================================================== */

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
      console.error("GET EMPLOYEE ERROR:", error);

      res.status(500).json({
        message: "Failed to load employee."
      });
    }
  }
);

/* =====================================================
   CREATE EMPLOYEE
===================================================== */

router.post(
  "/",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
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
        dateOfJoining
      } = req.body;

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

      const existingUser = await prisma.user.findUnique({
        where: {
          email: normalizedEmail
        }
      });

      if (existingUser) {
        return res.status(409).json({
          message: "A user with this email already exists."
        });
      }

      const existingEmployee = await prisma.employee.findUnique({
        where: {
          employeeCode: employeeCode.trim()
        }
      });

      if (existingEmployee) {
        return res.status(409).json({
          message: "Employee code already exists."
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: "EMPLOYEE"
        }
      });

      const employee = await prisma.employee.create({
        data: {
          employeeCode: employeeCode.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          department: department.trim(),
          designation: designation.trim(),
          dateOfJoining: new Date(dateOfJoining),
          userId: user.id
        }
      });

      res.status(201).json({
        message: "Employee created successfully.",
        employee
      });
    } catch (error) {
      console.error("CREATE EMPLOYEE ERROR:", error);

      res.status(500).json({
        message: "Failed to create employee."
      });
    }
  }
);

/* =====================================================
   DELETE EMPLOYEE
===================================================== */

router.delete(
  "/:id",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: {
          id: req.params.id
        }
      });

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found."
        });
      }

      await prisma.employee.delete({
        where: {
          id: req.params.id
        }
      });

      await prisma.user.delete({
        where: {
          id: employee.userId
        }
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
  }
);

module.exports = router;