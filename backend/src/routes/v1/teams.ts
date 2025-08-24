import express from "express";
import * as TeamController from "../../controller/team.js";
import { RedisClient } from "../../shared/redisClient.js";
import { ok } from "neverthrow";

const router = express.Router();

// Redis client mock (実際の実装では依存性注入)
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
  lpush: async () => ok(0),
  rpush: async () => ok(0),
  lpop: async () => ok(null),
  rpop: async () => ok(null),
  lrange: async () => ok([]),
  llen: async () => ok(0),
};

router.post("/", TeamController.createTeam(mockRedisClient));
router.get("/:team_id", TeamController.getTeam(mockRedisClient));
router.delete("/:team_id", TeamController.deleteTeam(mockRedisClient));
router.post("/:search", TeamController.searchTeamByNumber(mockRedisClient));

// メンバー管理エンドポイント
router.post("/:team_id/members", TeamController.addMember(mockRedisClient));
router.get("/:team_id/members", TeamController.getMembers(mockRedisClient));
router.delete("/:team_id/members/:member_id", TeamController.removeMember(mockRedisClient));

export default router;
