import { Request, Response } from "express";
import { z } from "zod";
import * as TeamModel from "../model/team/team.js";
import { RedisClient } from "../repository/redisClient.js";
import { ok, err, Result } from "neverthrow";

// Zod Validation Schemas
const createTeamSchema = z.object({
  createdBy: z.string().min(1, "createdBy is required"),
  maxMembers: z.number().int().min(2).max(8).optional(),
});

const teamIdSchema = z.object({
  team_id: z.string().uuid("Invalid team ID format"),
});

const searchTeamSchema = z.object({
  teamNumber: z.string().length(6, "Team number must be 6 characters"),
});

const addMemberSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  socketId: z.string().optional(),
});

const memberIdSchema = z.object({
  member_id: z.string().uuid("Invalid member ID format"),
});

// Helper function for validation and error handling
const validateAndHandle = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  res: Response
): Result<T, string> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      details: result.error.errors,
    });
    return err("Validation failed");
  }
  return ok(result.data);
};

// Controller functions
export const createTeam = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validateAndHandle(createTeamSchema, req.body, res);
      if (validationResult.isErr()) return;

      const team = await TeamModel.createTeam(redis, validationResult.value.createdBy, validationResult.value.maxMembers);
      
      res.status(201).json({
        success: true,
        data: team,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to create team",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const getTeam = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validateAndHandle(teamIdSchema, req.params, res);
      if (validationResult.isErr()) return;

      const teamResult = await TeamModel.getTeam(redis, validationResult.value.team_id);
      
      if (teamResult.isErr()) {
        res.status(500).json({
          error: "Failed to retrieve team",
          message: teamResult.error,
        });
        return;
      }

      if (!teamResult.value) {
        res.status(404).json({
          error: "Team not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: teamResult.value,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get team",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const deleteTeam = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validateAndHandle(teamIdSchema, req.params, res);
      if (validationResult.isErr()) return;

      const deleteResult = await TeamModel.deleteTeam(redis, validationResult.value.team_id);
      
      if (deleteResult.isErr()) {
        res.status(400).json({
          error: "Failed to delete team",
          message: deleteResult.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Team deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete team",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const searchTeamByNumber = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validateAndHandle(searchTeamSchema, req.body, res);
      if (validationResult.isErr()) return;

      const searchResult = await TeamModel.searchTeamByNumber(redis, validationResult.value.teamNumber);
      
      if (searchResult.isErr()) {
        res.status(500).json({
          error: "Failed to search team",
          message: searchResult.error,
        });
        return;
      }

      if (!searchResult.value) {
        res.status(404).json({
          error: "Team not found with the provided team number",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: searchResult.value,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to search team by number",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const addMember = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const paramsValidationResult = validateAndHandle(teamIdSchema, req.params, res);
      if (paramsValidationResult.isErr()) return;

      const bodyValidationResult = validateAndHandle(addMemberSchema, req.body, res);
      if (bodyValidationResult.isErr()) return;

      const addResult = await TeamModel.addMember(
        redis,
        paramsValidationResult.value.team_id,
        bodyValidationResult.value.userId,
        bodyValidationResult.value.socketId
      );
      
      if (addResult.isErr()) {
        const statusCode = addResult.error === "team is full" ? 409 : 400;
        res.status(statusCode).json({
          error: "Failed to add member",
          message: addResult.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: addResult.value,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to add member",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const getMembers = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validateAndHandle(teamIdSchema, req.params, res);
      if (validationResult.isErr()) return;

      const membersResult = await TeamModel.getMembers(redis, validationResult.value.team_id);
      
      if (membersResult.isErr()) {
        res.status(500).json({
          error: "Failed to get members",
          message: membersResult.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: membersResult.value,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get members",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const removeMember = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validateAndHandle(
        teamIdSchema.merge(memberIdSchema),
        req.params,
        res
      );
      if (validationResult.isErr()) return;

      const removeResult = await TeamModel.removeMember(
        redis,
        validationResult.value.team_id,
        validationResult.value.member_id
      );
      
      if (removeResult.isErr()) {
        res.status(400).json({
          error: "Failed to remove member",
          message: removeResult.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Member removed successfully",
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to remove member",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};