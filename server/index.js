const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const server = http.createServer(app);
require("dotenv").config();

const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

// Enable CORS
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, "http://localhost:3000"]
  : "*";
app.use(cors({ origin: allowedOrigins }));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint for Render
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "CodeCast backend is running" });
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  // User joins room
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // notify everyone in the room
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // Real-time code change broadcast
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Real-time language change broadcast
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  // Sync existing code and language to newly joined user
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, language }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    if (language) {
      io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    }
  });

  // Handle user disconnect
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
  });
});


const judge0LanguageMap = {
  python3: 71,
  java: 91,
  cpp: 54,
  nodejs: 93,
  c: 50,
  ruby: 72,
  go: 95,
  scala: 81,
  bash: 46,
  sql: 82,
  pascal: 67,
  csharp: 51,
  php: 98,
  swift: 83,
  rust: 73,
  r: 80,
};

app.post("/compile", async (req, res) => {
  const { code, language, input } = req.body;

  try {
    // If JDoodle API credentials are provided in .env
    if (process.env.jDoodle_clientId && (process.env.jDoodle_clientSecret || process.env.kDoodle_clientSecret)) {
      const response = await axios.post("https://api.jdoodle.com/v1/execute", {
        script: code,
        stdin: input || "",
        language: language,
        versionIndex: languageConfig[language]?.versionIndex || "0",
        clientId: process.env.jDoodle_clientId,
        clientSecret: process.env.jDoodle_clientSecret || process.env.kDoodle_clientSecret,
      });
      return res.json(response.data);
    }

    // Default to free Judge0 Compiler API (No API key needed)
    const languageId = judge0LanguageMap[language] || 71;
    const response = await axios.post(
      "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
      {
        source_code: code,
        language_id: languageId,
        stdin: input || "",
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    const data = response.data;
    const output =
      data.stdout ||
      data.stderr ||
      data.compile_output ||
      data.message ||
      (data.status && data.status.description) ||
      "Execution completed with no output";

    res.json({
      output,
      time: data.time,
      memory: data.memory,
      status: data.status,
      ...data,
    });
  } catch (error) {
    console.error("Compilation error:", error.message);
    res.status(500).json({
      error: "Failed to compile code: " + (error.response?.data?.message || error.message),
    });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

