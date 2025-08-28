import express from "express";
import * as TeamController from "../../controller/team.js";
import * as UserController from "../../controller/user.js";
import { getRedisClient } from "../../repository/redisClientImpl.js";

const router = express.Router();

const redisClient = getRedisClient();

// ユーザーを全チームから削除
router.delete("/:userId/teams", TeamController.removeUserFromAllTeams(redisClient));

// GET /v1/users/:userId/name - ユーザー名取得
router.get("/:userId/name", UserController.getUserName(redisClient));

// POST /v1/users/:userId/name - ユーザー名登録/更新
router.post("/:userId/name", UserController.setUserName(redisClient));

export default router;
