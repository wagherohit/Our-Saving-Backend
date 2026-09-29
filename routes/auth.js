const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;

    if (!["Rohit", "Sakhi"].includes(name)) {
      return res.status(400).json({
        message: "Invalid member name"
      });
    }

    if (inviteCode !== process.env.INVITE_CODE) {
      return res.status(403).json({
        message: "Invalid invite code"
      });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        message: "Valid email is required"
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    const existing = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { name }
      ]
    });

    if (existing) {
      return res.status(409).json({
        message: "This member or email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: String(email || "").toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { id: user._id.toString(), name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;