import { Request, Response } from "express";
import { z } from "zod";
import { RedisClient } from "../repository/redisClient.js";
import { redisKeys } from "../repository/redisKeys.js";
import { ok, err, Result } from "neverthrow";

// Zod Validation Schemas
const userIdSchema = z.object({
  userId: z.string().min(1).max(100, "userId must be between 1 and 100 characters"),
});

const userNameSchema = z.object({
  name: z.string().min(1).max(32, "name must be between 1 and 32 characters"),
});

// Helper function for validation
const validate = <T>(schema: z.ZodSchema<T>, data: unknown): Result<T, string> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return err("Validation failed");
  }
  return ok(result.data);
};

// Controller functions
export const getUserName = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validate(userIdSchema, req.params);
      if (validationResult.isErr()) {
        res.status(400).json({ message: "invalid userId" });
        return;
      }

      const { userId } = validationResult.value;
      const result = await redis.get(redisKeys.userName(userId));
      
      if (result.isErr()) {
        res.status(500).json({ message: result.error });
        return;
      }

      const name = result.value;
      if (name === null) {
        res.status(404).json({ message: "not found" });
        return;
      }
      
      res.json({ name });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const setUserName = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const paramsValidationResult = validate(userIdSchema, req.params);
      if (paramsValidationResult.isErr()) {
        res.status(400).json({ message: "invalid userId" });
        return;
      }

      const bodyValidationResult = validate(userNameSchema, req.body);
      if (bodyValidationResult.isErr()) {
        res.status(400).json({ message: "name must be string and 1-32 chars" });
        return;
      }

      const { userId } = paramsValidationResult.value;
      const { name } = bodyValidationResult.value;

      const setResult = await redis.set(redisKeys.userName(userId), name);
      if (setResult.isErr()) {
        res.status(500).json({ message: setResult.error });
        return;
      }
      
      res.json({ ok: true, name });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};