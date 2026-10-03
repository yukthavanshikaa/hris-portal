const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

async function getEmployeeId(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      employee: {
        select: {
          id: true
        }
      }
    }
  });

  return user?.employee?.id || null;
}


// GET attendance history
router.get("/", authenticateToken, async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);

    if (!employeeId) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId
      },
      orderBy: {
        date: "desc"
      }
    });

    res.json({
      attendance
    });
  } catch (error) {
    console.error("Attendance error:", error);

    res.status(500).json({
      message: "Unable to load attendance records."
    });
  }
});


// CHECK IN
router.post("/check-in", authenticateToken, async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);

    if (!employeeId) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "You have already checked in today."
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: startOfDay,
        checkIn: now,
        status: "PRESENT"
      }
    });

    res.status(201).json({
      message: "Check-in successful.",
      attendance
    });
  } catch (error) {
    console.error("Check-in error:", error);

    res.status(500).json({
      message: "Unable to check in."
    });
  }
});


// CHECK OUT
router.post("/check-out", authenticateToken, async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req.user.userId);

    if (!employeeId) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (!attendance) {
      return res.status(400).json({
        message: "You have not checked in today."
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        message: "You have already checked out today."
      });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: attendance.id
      },
      data: {
        checkOut: now
      }
    });

    res.json({
      message: "Check-out successful.",
      attendance: updatedAttendance
    });
  } catch (error) {
    console.error("Check-out error:", error);

    res.status(500).json({
      message: "Unable to check out."
    });
  }
});


module.exports = router;
