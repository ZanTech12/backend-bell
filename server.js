require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const mqtt = require("mqtt");
const schedule = require("node-schedule");
const cors = require("cors");




const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema
const periodSchema = new mongoose.Schema({
  period: Number,
  start: String, // HH:mm
  duration: Number, // seconds
  days: [String],
});
const Period = mongoose.model("Period", periodSchema);

// MQTT connection

const brokerUrl = process.env.REACT_APP_MQTT_BROKER;
const username = process.env.REACT_APP_MQTT_USERNAME;
const password = process.env.REACT_APP_MQTT_PASSWORD;

const client = mqtt.connect(brokerUrl, {
  username,
  password,
});


client.on("connect", () => console.log("✅ Connected to HiveMQ Cloud"));

// Function to (re)schedule periods
async function schedulePeriods() {
  schedule.gracefulShutdown().then(() => {
    console.log("⏰ Rescheduling all periods...");
  });

  const periods = await Period.find({}).sort("period");
  periods.forEach((p) => {
    const [hour, minute] = p.start.split(":").map(Number);

    schedule.scheduleJob({ hour, minute, dayOfWeek: new schedule.Range(1, 5) }, () => {
      const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
      if (p.days.includes(today)) {
        client.publish("school/bell/control", "ON");
        console.log(`🔔 Bell ON - Period ${p.period} (${p.start})`);

        setTimeout(() => {
          client.publish("school/bell/control", "OFF");
          console.log(`🔕 Bell OFF - Period ${p.period}`);
        }, p.duration * 1000);
      }
    });
  });
}

// ✅ API endpoints
// Get all periods
app.get("/periods", async (req, res) => {
  const periods = await Period.find({}).sort("period");
  res.json(periods);
});

// Update a period (by number)
app.put("/periods/:period", async (req, res) => {
  const { period } = req.params;
  const updated = await Period.findOneAndUpdate({ period }, req.body, { new: true });
  res.json(updated);
  await schedulePeriods();
});

// Initialize default 9 periods if empty
async function initPeriods() {
  const count = await Period.countDocuments();
  if (count === 0) {
    const defaults = [
      { period: 1, start: "08:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 2, start: "09:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 3, start: "10:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 4, start: "11:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 5, start: "12:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 6, start: "13:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 7, start: "14:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 8, start: "15:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
      { period: 9, start: "16:00", duration: 5, days: ["Mon","Tue","Wed","Thu","Fri"] },
    ];
    await Period.insertMany(defaults);
    console.log("✅ Inserted default 9 periods");
  }
  await schedulePeriods();
}


const PORT = process.env.PORT || 6000;

app.listen(process.env.PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}` );
  initPeriods();
});
