import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import * as middlewares from "./middlewares.js";
import { env } from "./env.js";
import router from "./routes/index.js";

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
}));
app.use(express.json());

app.use("/", router);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
