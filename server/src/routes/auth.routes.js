const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const handleValidation = require("../middleware/validate");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

router.post(
  "/signup",
  [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").optional().isIn(["Admin", "Member"]).withMessage("Role must be Admin or Member")
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, email, password, role = "Member" } = req.body;
      const existing = await User.findOne({ email });

      if (existing) {
        return res.status(409).json({ message: "Email is already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash, role });

      res.status(201).json({
        token: signToken(user),
        user: user.toSafeJSON()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json({
        token: signToken(user),
        user: user.toSafeJSON()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

router.get("/users", requireAuth, async (req, res, next) => {
  try {
    const users = await User.find().select("name email role").sort({ name: 1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
