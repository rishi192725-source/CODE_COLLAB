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
app.use(cors());

// Parse JSON bodies
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
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
  // console.log('Socket connected', socket.id);
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // notify that new user join
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // sync the code
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });
  // when new user join the room all the code which are there are also shows on that persons editor
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // leave room
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    // leave all the room
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
    socket.leave();
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
  const { code, language } = req.body;

  try {
    // If JDoodle API credentials are provided in .env
    if (process.env.jDoodle_clientId && (process.env.jDoodle_clientSecret || process.env.kDoodle_clientSecret)) {
      const response = await axios.post("https://api.jdoodle.com/v1/execute", {
        script: code,
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

    res.json({ output, ...data });
  } catch (error) {
    console.error("Compilation error:", error.message);
    res.status(500).json({ error: "Failed to compile code: " + (error.response?.data?.message || error.message) });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is runnint on port ${PORT}`));
