const mongoose = require("mongoose");

const periodSchema = new mongoose.Schema({
  period: {
    type: Number,
    required: true,
    unique: true,
  },
  start: {
    type: String, // HH:mm
    required: true,
  },
  duration: {
    type: Number, // seconds
    required: true,
  },
  days: {
    type: [String], // e.g., ["Mon","Tue","Wed"]
    required: true,
  },
}, { timestamps: true }); // optional: adds createdAt and updatedAt

module.exports = mongoose.model("Period", periodSchema);
