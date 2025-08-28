import app from "./app.js";
import { env } from "./env.js";
import { Server } from "socket.io";
import { registerTeamHandler } from "./socket/teamSocket.js";
import { createServer } from "http";
import { getRedisClient, connectRedis } from "./repository/redisClientImpl.js";

console.log("CORS_ORIGIN:", env.CORS_ORIGIN);

const port = env.PORT;

// 本物のRedisクライアントを使用
const redisClient = getRedisClient();

const httpServer = createServer(app);

// Socket.io初期化（CORS設定とRedis連携）
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

console.log("Socket.io server initialized");

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  registerTeamHandler(io, socket, redisClient);
});

// Redis接続
connectRedis().then((result) => {
  if (result.isErr()) {
    console.error("Failed to connect to Redis:", result.error);
  } else {
    console.log("Redis connected successfully");
  }
});

// Start server
const server = httpServer.listen(port, () => {
  console.log(`Listening: http://localhost:${port}`);
});

server.on("error", (err) => {
  if ("code" in err && err.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} is already in use. Please choose another port or stop the process using it.`);
  } else {
    console.error("Failed to start server:", err);
  }
  process.exit(1);
});
