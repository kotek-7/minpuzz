import express from "express";
import * as TeamController from "../../controller/team.js";
import { getRedisClient } from "../../repository/redisClientImpl.js";

const router = express.Router();

const redisClient = getRedisClient();

router.delete("/:userId/teams", TeamController.removeUserFromAllTeams(redisClient));

export default router;