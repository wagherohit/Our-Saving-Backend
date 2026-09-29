const express = require("express");
const Contribution = require("../models/Contribution");
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

async function getBalance() {
  const deposits = await Contribution.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const withdrawals = await Withdrawal.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  return (deposits[0]?.total || 0) - (withdrawals[0]?.total || 0);
}

router.get("/summary", async (req, res) => {
  try {
    const members = await User.find().select("name");
    const contributions = await Contribution.find()
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const balance = await getBalance();

    const totals = members.map(member => ({
      name: member.name,
      total: contributions
        .filter(c => c.user && c.user._id.equals(member._id))
        .reduce((sum, c) => sum + c.amount, 0)
    }));

    res.json({
      balance,
      monthlyTargetPerPerson: 1000,
      duration: "Flexible",
      members: totals,
      contributions
    });
  } catch {
    res.status(500).json({ message: "Could not load savings" });
  }
});

router.post("/contributions", async (req, res) => {
  try {
    const { amount, note } = req.body;
    const value = Number(amount);

    if (!Number.isSafeInteger(value) || value < 1) {
      return res.status(400).json({
        message: "Enter a valid whole amount"
      });
    }

    const contribution = await Contribution.create({
      user: req.user.id,
      amount: value,
      note: String(note || "").slice(0, 200)
    });

    res.status(201).json(contribution);
  } catch {
    res.status(500).json({ message: "Could not add contribution" });
  }
});

module.exports = router;