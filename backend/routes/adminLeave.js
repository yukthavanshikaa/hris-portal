const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

function requireHRorAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  if (req.user.role !== "HR" && req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "HR or Admin access required.",
    });
  }

  next();
}

function calculateLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const startStr =
    startDate instanceof Date
      ? startDate.toISOString().slice(0, 10)
      : String(startDate).slice(0, 10);

  const endStr =
    endDate instanceof Date
      ? endDate.toISOString().slice(0, 10)
      : String(endDate).slice(0, 10);

  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const difference = end.getTime() - start.getTime();
  const days = Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;

  return days > 0 ? days : null;
}

/*
  GET ALL LEAVE REQUESTS
*/
router.get(
  "/",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const requests = await prisma.leaveRequest.findMany({
        include: {
          employee: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                },
              },
              leaveBalance: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(requests);
    } catch (error) {
      console.error("Get admin leave requests error:", error);

      res.status(500).json({
        message: "Failed to load leave requests.",
        error: error.message,
      });
    }
  }
);

/*
  APPROVE LEAVE
*/
router.patch(
  "/:id/approve",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const id = req.params.id;

      const result = await prisma.$transaction(async (tx) => {
        const leaveRequest = await tx.leaveRequest.findUnique({
          where: {
            id,
          },
          include: {
            employee: true,
          },
        });

        if (!leaveRequest) {
          const err = new Error("Leave request not found.");
          err.statusCode = 404;
          throw err;
        }

        if (leaveRequest.status !== "PENDING") {
          const err = new Error("This leave request has already been processed.");
          err.statusCode = 400;
          throw err;
        }

        const leaveDays = calculateLeaveDays(
          leaveRequest.startDate,
          leaveRequest.endDate
        );

        if (!leaveDays || leaveDays <= 0) {
          const err = new Error("Invalid leave date range.");
          err.statusCode = 400;
          throw err;
        }

        // Deduct from LeaveBalance if type is CASUAL, SICK, or EARNED
        if (leaveRequest.type !== "OTHER") {
          const balanceField = {
            CASUAL: "casualLeave",
            SICK: "sickLeave",
            EARNED: "earnedLeave",
          }[leaveRequest.type];

          if (!balanceField) {
            const err = new Error(`Unsupported leave type: ${leaveRequest.type}`);
            err.statusCode = 400;
            throw err;
          }

          let balance = await tx.leaveBalance.findUnique({
            where: {
              employeeId: leaveRequest.employeeId,
            },
          });

          if (!balance) {
            const requestYear = leaveRequest.startDate
              ? new Date(leaveRequest.startDate).getFullYear()
              : new Date().getFullYear();

            balance = await tx.leaveBalance.findFirst({
              where: {
                employeeId: leaveRequest.employeeId,
                year: requestYear,
              },
            });
          }

          if (!balance) {
            const err = new Error("Leave balance record not found for this employee.");
            err.statusCode = 404;
            throw err;
          }

          const currentAvailable = balance[balanceField] ?? 0;

          if (currentAvailable < leaveDays) {
            const err = new Error(
              `Insufficient ${leaveRequest.type.toLowerCase()} leave balance. Requested: ${leaveDays} day(s), Available: ${currentAvailable} day(s).`
            );
            err.statusCode = 400;
            throw err;
          }

          await tx.leaveBalance.update({
            where: {
              id: balance.id,
            },
            data: {
              [balanceField]: currentAvailable - leaveDays,
            },
          });
        }

        const updatedRequest = await tx.leaveRequest.update({
          where: {
            id,
          },
          data: {
            status: "APPROVED",
            reviewedById: req.user.userId,
            reviewedAt: new Date(),
          },
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                  },
                },
                leaveBalance: true,
              },
            },
          },
        });

        return updatedRequest;
      });

      res.json({
        message: "Leave approved successfully.",
        request: result,
      });
    } catch (error) {
      console.error("Approve leave error:", error);

      if (error.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }

      res.status(500).json({
        message: "Failed to approve leave.",
        error: error.message,
      });
    }
  }
);

/*
  REJECT LEAVE
*/
router.patch(
  "/:id/reject",
  authenticateToken,
  requireHRorAdmin,
  async (req, res) => {
    try {
      const id = req.params.id;

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: {
          id,
        },
      });

      if (!leaveRequest) {
        return res.status(404).json({
          message: "Leave request not found.",
        });
      }

      if (leaveRequest.status !== "PENDING") {
        return res.status(400).json({
          message: "This leave request has already been processed.",
        });
      }

      const updatedRequest = await prisma.leaveRequest.update({
        where: {
          id,
        },
        data: {
          status: "REJECTED",
          reviewedById: req.user.userId,
          reviewedAt: new Date(),
        },
        include: {
          employee: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                },
              },
              leaveBalance: true,
            },
          },
        },
      });

      res.json({
        message: "Leave rejected successfully.",
        request: updatedRequest,
      });
    } catch (error) {
      console.error("Reject leave error:", error);

      res.status(500).json({
        message: "Failed to reject leave.",
        error: error.message,
      });
    }
  }
);

module.exports = router;