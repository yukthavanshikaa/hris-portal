const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const difference = end.getTime() - start.getTime();

  const days =
    Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;

  return days > 0 ? days : null;
}

/*
  GET /api/leave/balance
  Get the logged-in employee's leave balance.
*/
router.get("/balance", authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        userId: req.user.userId,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found.",
      });
    }

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId: employee.id,
      },
    });

    if (!balance) {
      return res.status(404).json({
        message: "Leave balance not found.",
      });
    }

    res.json({
      balance,
    });
  } catch (error) {
    console.error("Leave balance error:", error);

    res.status(500).json({
      message: "Unable to load leave balance.",
    });
  }
});

/*
  GET /api/leave
  Get the logged-in employee's leave requests.
*/
router.get("/", authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        userId: req.user.userId,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found.",
      });
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      leaveRequests,
    });
  } catch (error) {
    console.error("Leave history error:", error);

    res.status(500).json({
      message: "Unable to load leave history.",
    });
  }
});

/*
  POST /api/leave
  Apply for leave for the logged-in employee.
*/
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      reason,
    } = req.body;

    // Validate required fields
    if (
      !type ||
      !startDate ||
      !endDate ||
      !reason?.trim()
    ) {
      return res.status(400).json({
        message: "Leave type, dates and reason are required.",
      });
    }

    // Allowed leave types
    const allowedTypes = [
      "CASUAL",
      "SICK",
      "EARNED",
      "OTHER",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid leave type.",
      });
    }

    // Calculate requested leave duration
    const leaveDays = calculateLeaveDays(
      startDate,
      endDate
    );

    if (!leaveDays) {
      return res.status(400).json({
        message: "End date must be on or after start date.",
      });
    }

    // Find logged-in employee
    const employee = await prisma.employee.findUnique({
      where: {
        userId: req.user.userId,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found.",
      });
    }

    /*
      OTHER leave does not consume
      Casual/Sick/Earned leave balance.
    */
    if (type !== "OTHER") {
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId: employee.id,
        },
      });

      if (!balance) {
        return res.status(404).json({
          message: "Leave balance not found.",
        });
      }

      const balanceField = {
        CASUAL: "casualLeave",
        SICK: "sickLeave",
        EARNED: "earnedLeave",
      }[type];

      /*
        Include both PENDING and APPROVED requests.

        This prevents an employee from submitting
        multiple pending requests that together exceed
        their available leave balance.
      */
      const existingRequests =
        await prisma.leaveRequest.findMany({
          where: {
            employeeId: employee.id,
            type,
            status: {
              in: ["PENDING", "APPROVED"],
            },
          },
          select: {
            startDate: true,
            endDate: true,
          },
        });

      const alreadyRequestedDays =
        existingRequests.reduce(
          (total, request) => {
            const start = request.startDate
              .toISOString()
              .slice(0, 10);

            const end = request.endDate
              .toISOString()
              .slice(0, 10);

            const days = calculateLeaveDays(
              start,
              end
            );

            return total + (days || 0);
          },
          0
        );

      const availableDays =
        balance[balanceField] -
        alreadyRequestedDays;

      if (leaveDays > availableDays) {
        return res.status(400).json({
          message: `Insufficient ${type.toLowerCase()} leave balance.`,
          availableDays,
        });
      }
    }

    // Create leave request
    const leaveRequest =
      await prisma.leaveRequest.create({
        data: {
          employeeId: employee.id,
          type,
          startDate: new Date(
            `${startDate}T00:00:00`
          ),
          endDate: new Date(
            `${endDate}T00:00:00`
          ),
          reason: reason.trim(),
          status: "PENDING",
        },
      });

    res.status(201).json({
      message:
        "Leave request submitted successfully.",
      leaveRequest,
    });
  } catch (error) {
    console.error(
      "Leave application error:",
      error
    );

    res.status(500).json({
      message: "Unable to submit leave request.",
    });
  }
});

module.exports = router;