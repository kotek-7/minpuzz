import express from "express";
import * as TeamController from "../../controller/team.js";
import { getRedisClient } from "../../repository/redisClientImpl.js";

const router = express.Router();

// 本物のRedisクライアントを使用
const redisClient = getRedisClient();

router.post("/", TeamController.createTeam(redisClient));
router.get("/:teamId", TeamController.getTeam(redisClient));
router.delete("/:teamId", TeamController.deleteTeam(redisClient));
router.post("/:search", TeamController.searchTeamByNumber(redisClient));

// メンバー管理エンドポイント
router.post("/:teamId/members", TeamController.addMember(redisClient));
router.get("/:teamId/members", TeamController.getMembers(redisClient));
router.delete("/:teamId/members/:memberId", TeamController.removeMember(redisClient));

export default router;
