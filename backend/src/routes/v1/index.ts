import express from "express";
import teamsRouter from "./teams.js";
import usersRouter from "./users.js";

const router = express.Router();

router.use("/teams", teamsRouter);
router.use("/users", usersRouter);

export default router;
