require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));
app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
  res.json({ message: "Our Savings API is running" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/savings", require("./routes/savings"));
app.use("/api/withdrawals", require("./routes/withdrawals"));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });