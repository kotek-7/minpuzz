import app from "./app.js";
import { env } from "./env.js";
import { Server } from "socket.io";
import { registerTeamHandler } from "./socket/teamSocket.js";
import { createServer } from "http";
import { RedisClient } from "./shared/redisClient.js";
import { ok } from "neverthrow";

const port = env.PORT;

// Redis client (実際の本番環境では適切なRedis実装を使用)
const mockRedisClient: RedisClient = {
  set: async () => ok(true),
  get: async () => ok(null),
  delete: async () => ok(1),
  hset: async () => ok(1),
  hget: async () => ok(null),
  hgetall: async () => ok({}),
  hdel: async () => ok(1),
  sadd: async () => ok(1),
  srem: async () => ok(1),
  sismember: async () => ok(false),
  smembers: async () => ok([]),
  lpush: async () => ok(1),
  rpush: async () => ok(1),
  lpop: async () => ok(null),
  rpop: async () => ok(null),
  lrange: async () => ok([]),
  llen: async () => ok(0),
};

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
  registerTeamHandler(io, socket, mockRedisClient);
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
