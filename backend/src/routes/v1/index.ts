import express from "express";
import teamsRouter from "./teams.js";

const router = express.Router();

router.use("/teams", teamsRouter);

export default router;
