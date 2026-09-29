const express = require("express");
const Withdrawal = require("../models/Withdrawal");
const Contribution = require("../models/Contribution");
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

router.get("/", async (req, res) => {
  try {
    const requests = await Withdrawal.find()
      .populate("requestedBy", "name")
      .populate("approvals", "name")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch {
    res.status(500).json({ message: "Could not load requests" });
  }
});

router.post("/", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const reason = String(req.body.reason || "").slice(0, 200);

    if (!Number.isSafeInteger(amount) || amount < 1) {
      return res.status(400).json({
        message: "Enter a valid whole amount"
      });
    }

    const members = await User.countDocuments();
    if (members !== 2) {
      return res.status(400).json({
        message: "Both members must be registered first"
      });
    }

    if (amount > await getBalance()) {
      return res.status(400).json({
        message: "Insufficient available balance"
      });
    }

    const request = await Withdrawal.create({
      requestedBy: req.user.id,
      amount,
      reason
    });

    res.status(201).json(request);
  } catch {
    res.status(500).json({ message: "Could not create request" });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    const request = await Withdrawal.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending" });
    }

    if (request.approvals.some(id => id.equals(req.user.id))) {
      return res.status(400).json({
        message: "You have already approved this request"
      });
    }

    const members = await User.find().select("_id");
    if (members.length !== 2) {
      return res.status(400).json({ message: "Two members are required" });
    }

    request.approvals.push(req.user.id);

    if (request.approvals.length === 2) {
      if (request.amount > await getBalance()) {
        request.approvals.pop();
        await request.save();
        return res.status(400).json({
          message: "Insufficient balance"
        });
      }
      request.status = "approved";
    }

    await request.save();
    res.json({
      message: "Approval recorded",
      request
    });
  } catch {
    res.status(500).json({ message: "Could not approve request" });
  }
});

router.post("/:id/reject", async (req, res) => {
  try {
    const request = await Withdrawal.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Request rejected", request });
  } catch {
    res.status(500).json({ message: "Could not reject request" });
  }
});

module.exports = router;