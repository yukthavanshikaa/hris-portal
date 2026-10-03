const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../lib/prisma");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000
};

/*
  POST /api/auth/login
  Login employee and create secure HTTP-only cookie
*/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim()
      },
      include: {
        employee: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.cookie("token", token, cookieOptions);

    return res.json({
      message: "Login successful.",
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login."
    });
  }
});


/*
  GET /api/auth/me
  Check whether the employee is logged in
*/
router.get("/me", async (req, res) => {
  try {
    let token = req.cookies.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated."
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId
      },
      include: {
        employee: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "User not found."
      });
    }

    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee
      }
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session."
    });
  }
});


/*
  POST /api/auth/logout
*/
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax"
  });

  return res.json({
    message: "Logged out successfully."
  });
});


module.exports = router;