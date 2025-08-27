import express from "express";
import * as TeamController from "../../controller/team.js";
import { getRedisClient } from "../../repository/redisClientImpl.js";
import { redisKeys } from "../../repository/redisKeys.js";

const router = express.Router();

const redisClient = getRedisClient();

// ユーザーを全チームから削除
router.delete("/:userId/teams", TeamController.removeUserFromAllTeams(redisClient));

// GET /v1/users/:userId/name - ユーザー名取得
router.get("/:userId/name", async (req, res) => {
  const userId = String(req.params.userId || "").trim();
  if (userId.length === 0 || userId.length > 100) {
    return res.status(400).json({ message: "invalid userId" });
  }

  const result = await redisClient.get(redisKeys.userName(userId));
  if (result.isErr()) {
    return res.status(500).json({ message: result.error });
  }

  const name = result.value;
  if (name === null) {
    return res.status(404).json({ message: "not found" });
  }
  return res.json({ name });
});

// POST /v1/users/:userId/name - ユーザー名登録/更新
router.post("/:userId/name", async (req, res) => {
  const userId = String(req.params.userId || "").trim();
  if (userId.length === 0 || userId.length > 100) {
    return res.status(400).json({ message: "invalid userId" });
  }

  // body.name を検証
  const rawName = (req.body?.name ?? "");
  if (typeof rawName !== "string") {
    return res.status(400).json({ message: "name must be string" });
  }
  const name = rawName.trim();
  if (name.length === 0 || name.length > 32) {
    return res.status(400).json({ message: "name must be 1-32 chars" });
  }

  const setResult = await redisClient.set(redisKeys.userName(userId), name);
  if (setResult.isErr()) {
    return res.status(500).json({ message: setResult.error });
  }
  return res.json({ ok: true, name });
});

export default router;
