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
  teamId: z.string().uuid("Invalid team ID format"),
});

const searchTeamSchema = z.object({
  teamNumber: z.string().length(6, "Team number must be 6 characters"),
});

const addMemberSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  socketId: z.string().optional(),
});

const memberIdSchema = z.object({
  memberId: z.string().uuid("Invalid member ID format"),
});

const userIdSchema = z.object({
  userId: z.string().min(1, "userId is required"),
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
export const createTeam = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validate(createTeamSchema, req.body);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team data",
          message: validationResult.error,
        });
        return;
      }

      const teamResult = await TeamModel.createTeam(
        redis,
        validationResult.value.createdBy,
        validationResult.value.maxMembers,
      );
      if (teamResult.isErr()) {
        res.status(500).json({
          error: "Failed to create team",
          message: teamResult.error,
        });
        return;
      }

      console.log("Team created:", teamResult.value);
      res.status(201).json({
        success: true,
        data: teamResult.value,
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
      const validationResult = validate(teamIdSchema, req.params);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team ID",
          message: validationResult.error,
        });
        return;
      }

      const teamResult = await TeamModel.getTeam(redis, validationResult.value.teamId);

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
      const validationResult = validate(teamIdSchema, req.params);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team ID",
          message: validationResult.error,
        });
        return;
      }

      const deleteResult = await TeamModel.deleteTeam(redis, validationResult.value.teamId);

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
      const validationResult = validate(searchTeamSchema, req.body);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team number",
          message: validationResult.error,
        });
        return;
      }

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
      const paramsValidationResult = validate(teamIdSchema, req.params);
      if (paramsValidationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team ID",
          message: paramsValidationResult.error,
        });
        return;
      }

      const bodyValidationResult = validate(addMemberSchema, req.body);
      if (bodyValidationResult.isErr()) {
        res.status(400).json({
          error: "Invalid member data",
          message: bodyValidationResult.error,
        });
        return;
      }

      const addResult = await TeamModel.addMember(
        redis,
        paramsValidationResult.value.teamId,
        bodyValidationResult.value.userId,
        bodyValidationResult.value.socketId,
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
      const validationResult = validate(teamIdSchema, req.params);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team ID",
          message: validationResult.error,
        });
        return;
      }

      const membersResult = await TeamModel.getMembers(redis, validationResult.value.teamId);

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
      const validationResult = validate(teamIdSchema.merge(memberIdSchema), req.params);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team or member ID",
          message: validationResult.error,
        });
        return;
      }

      const removeResult = await TeamModel.removeMember(
        redis,
        validationResult.value.teamId,
        validationResult.value.memberId,
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

export const removeUserFromAllTeams = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validate(userIdSchema, req.params);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid user ID",
          message: validationResult.error,
        });
        return;
      }

      const removeResult = await TeamModel.removeUserFromAllTeams(
        redis,
        validationResult.value.userId,
      );

      if (removeResult.isErr()) {
        res.status(500).json({
          error: "Failed to remove user from teams",
          message: removeResult.error,
        });
        return;
      }

      const { removedFromTeams, deletedTeams } = removeResult.value;

      res.status(200).json({
        success: true,
        message: "User removed from all teams successfully",
        data: {
          removedFromTeams: removedFromTeams.length,
          deletedTeams: deletedTeams.length,
          removedFromTeamIds: removedFromTeams,
          deletedTeamIds: deletedTeams,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to remove user from all teams",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

export const startMatching = (redis: RedisClient) => {
  return async (req: Request, res: Response) => {
    try {
      const validationResult = validate(teamIdSchema, req.params);
      if (validationResult.isErr()) {
        res.status(400).json({
          error: "Invalid team ID",
          message: validationResult.error,
        });
        return;
      }

      const matchingResult = await TeamModel.startMatching(redis, validationResult.value.teamId);

      if (matchingResult.isErr()) {
        const statusCode = matchingResult.error === "team not found" ? 404 : 400;
        res.status(statusCode).json({
          error: "Failed to start matching",
          message: matchingResult.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Matching started successfully",
        data: matchingResult.value,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to start matching",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};
