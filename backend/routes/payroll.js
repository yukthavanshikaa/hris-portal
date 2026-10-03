const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

/*
  GET /api/payroll
  Get the logged-in employee's payroll records.
*/
router.get("/", authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        userId: req.user.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    const payrollRecords = await prisma.payroll.findMany({
      where: {
        employeeId: employee.id
      },
      orderBy: [
        {
          year: "desc"
        },
        {
          month: "desc"
        }
      ]
    });

    res.json({
      payrollRecords
    });
  } catch (error) {
    console.error("Payroll error:", error);

    res.status(500).json({
      message: "Unable to load payroll information."
    });
  }
});

/*
  GET /api/payroll/latest
  Get the logged-in employee's latest payroll record.
*/
router.get("/latest", authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        userId: req.user.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    const payroll = await prisma.payroll.findFirst({
      where: {
        employeeId: employee.id
      },
      orderBy: [
        {
          year: "desc"
        },
        {
          month: "desc"
        }
      ]
    });

    if (!payroll) {
      return res.status(404).json({
        message: "No payroll records found."
      });
    }

    res.json({
      payroll
    });
  } catch (error) {
    console.error("Latest payroll error:", error);

    res.status(500).json({
      message: "Unable to load latest payroll."
    });
  }
});

module.exports = router;