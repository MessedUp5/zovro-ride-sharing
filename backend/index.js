const express = require("express");
const cors = require("cors");
const http = require("http");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/authRoutes");
const rideRoutes = require("./routes/rideRoutes");
const locationRoutes = require("./routes/location");

app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/location", locationRoutes);

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Socket.IO setup
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// Store drivers
let drivers = {};

// Socket logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("driver_online", (driverId) => {
    drivers[driverId] = socket.id;
    console.log("Driver online:", driverId);
  });

  socket.on("driver_location", (data) => {
    const { driverId, latitude, longitude } = data;
    drivers[driverId] = {
      socketId: socket.id,
      latitude,
      longitude
    };
    io.emit("driver_moved", data);
  });

  socket.on("ride_status_update", (data) => {
    io.emit("ride_status_changed", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ONLY call server.listen if we are running locally on your laptop
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Local development server running on port ${PORT}`);
  });
}

// CRUCIAL FOR VERCEL: Export the express app instance
module.exports = app;