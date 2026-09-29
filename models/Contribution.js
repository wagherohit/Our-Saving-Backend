const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  note: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model(
  "Contribution",
  contributionSchema
);