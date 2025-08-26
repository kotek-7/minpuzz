import { 
  createTeam, 
  getTeam, 
  searchTeamByNumber, 
  deleteTeam, 
  addMember, 
  getMembers, 
  removeMember, 
  updateMemberStatus,
  removeUserFromAllTeams,
  RedisTTL 
} from "../../../model/team/team.js";
import { TeamStatus, MemberRole, MemberStatus } from "../../../model/team/types.js";
import { MockRedisClient } from "../../setup/MockRedisClient.js";
import { redisKeys } from "../../../repository/redisKeys.js";
import { RedisStringKey } from "../../../repository/redisKeyTypes.js";

describe("Team Redis CRUD Operations", () => {
  let mockRedis: MockRedisClient;

  beforeEach(() => {
    mockRedis = new MockRedisClient();
  });

  afterEach(() => {
    mockRedis.reset();
  });

  describe("Team CRUD Operations", () => {
    describe("createTeam", () => {
      it("should create a team with valid parameters", async () => {
        const userId = "user-123";
        const maxMembers = 4;

        const result = await createTeam(mockRedis, userId, maxMembers);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const team = result.value;
          expect(team.id).toBeDefined();
          expect(team.teamNumber).toBeDefined();
          expect(team.teamNumber).toHaveLength(6);
          expect(team.currentMembers).toBe(0);
          expect(team.maxMembers).toBe(maxMembers);
          expect(team.status).toBe(TeamStatus.WAITING);
          expect(team.createdBy).toBe(userId);
          expect(team.createdAt).toBeDefined();
          expect(team.updatedAt).toBeDefined();
        }
      });

      it("should create a team with default maxMembers when not specified", async () => {
        const userId = "user-123";

        const result = await createTeam(mockRedis, userId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.maxMembers).toBe(4);
        }
      });

      it("should store team data in Redis correctly", async () => {
        const userId = "user-123";

        const result = await createTeam(mockRedis, userId);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const team = result.value;
          
          // Check team data storage
          const storedTeamResult = await mockRedis.get(redisKeys.team(team.id));
          expect(storedTeamResult.isOk()).toBe(true);
          if (storedTeamResult.isOk()) {
            const storedTeam = JSON.parse(storedTeamResult.value!);
            expect(storedTeam.id).toBe(team.id);
            expect(storedTeam.teamNumber).toBe(team.teamNumber);
          }

          // Check team number index
          const teamByNumberResult = await mockRedis.get(redisKeys.teamByNumber(team.teamNumber));
          expect(teamByNumberResult.isOk()).toBe(true);
          if (teamByNumberResult.isOk()) {
            expect(teamByNumberResult.value).toBe(team.id);
          }

          // Check team number in active set
          const isInSetResult = await mockRedis.sismember(redisKeys.teamNumbers(), team.teamNumber);
          expect(isInSetResult.isOk()).toBe(true);
          if (isInSetResult.isOk()) {
            expect(isInSetResult.value).toBe(true);
          }
        }
      });

      it("should generate unique team numbers", async () => {
        const userId = "user-123";
        const teams = [];

        for (let i = 0; i < 5; i++) {
          const result = await createTeam(mockRedis, userId);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            teams.push(result.value);
          }
        }

        const teamNumbers = teams.map(team => team.teamNumber);
        const uniqueNumbers = new Set(teamNumbers);
        expect(uniqueNumbers.size).toBe(teams.length);
      });

      it("should return error when Redis operation fails", async () => {
        mockRedis.simulateError("Redis connection failed");

        const result = await createTeam(mockRedis, "user-123");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toMatch(/Failed to generate unique team number|failed to create team/);
        }
      });
    });

    describe("getTeam", () => {
      it("should retrieve existing team", async () => {
        const userId = "user-123";
        const createResult = await createTeam(mockRedis, userId);
        expect(createResult.isOk()).toBe(true);

        if (createResult.isOk()) {
          const createdTeam = createResult.value;
          const getResult = await getTeam(mockRedis, createdTeam.id);

          expect(getResult.isOk()).toBe(true);
          if (getResult.isOk()) {
            expect(getResult.value).toEqual(createdTeam);
          }
        }
      });

      it("should return null for non-existent team", async () => {
        const result = await getTeam(mockRedis, "non-existent-id");

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBeNull();
        }
      });

      it("should return error when Redis operation fails", async () => {
        mockRedis.simulateError("Redis connection failed");

        const result = await getTeam(mockRedis, "team-123");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("Redis connection failed");
        }
      });
    });

    describe("searchTeamByNumber", () => {
      it("should find team by team number", async () => {
        const userId = "user-123";
        const createResult = await createTeam(mockRedis, userId);
        expect(createResult.isOk()).toBe(true);

        if (createResult.isOk()) {
          const createdTeam = createResult.value;
          const searchResult = await searchTeamByNumber(mockRedis, createdTeam.teamNumber);

          expect(searchResult.isOk()).toBe(true);
          if (searchResult.isOk()) {
            expect(searchResult.value).toEqual(createdTeam);
          }
        }
      });

      it("should return null for non-existent team number", async () => {
        const result = await searchTeamByNumber(mockRedis, "NONEXT");

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBeNull();
        }
      });

      it("should return error when Redis operation fails", async () => {
        mockRedis.simulateError("Redis connection failed");

        const result = await searchTeamByNumber(mockRedis, "TEAM01");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("Redis connection failed");
        }
      });
    });

    describe("deleteTeam", () => {
      it("should delete existing team and clean up all related data", async () => {
        const userId = "user-123";
        const createResult = await createTeam(mockRedis, userId);
        expect(createResult.isOk()).toBe(true);

        if (createResult.isOk()) {
          const team = createResult.value;
          
          // Add some members first
          const memberResult = await addMember(mockRedis, team.id, "member-1");
          expect(memberResult.isOk()).toBe(true);

          const deleteResult = await deleteTeam(mockRedis, team.id);
          expect(deleteResult.isOk()).toBe(true);

          // Verify team data is deleted
          const getTeamResult = await getTeam(mockRedis, team.id);
          expect(getTeamResult.isOk()).toBe(true);
          if (getTeamResult.isOk()) {
            expect(getTeamResult.value).toBeNull();
          }

          // Verify team number index is deleted
          const getByNumberResult = await mockRedis.get(redisKeys.teamByNumber(team.teamNumber));
          expect(getByNumberResult.isOk()).toBe(true);
          if (getByNumberResult.isOk()) {
            expect(getByNumberResult.value).toBeNull();
          }

          // Verify team members are deleted
          const getMembersResult = await mockRedis.hgetall(redisKeys.teamMembers(team.id));
          expect(getMembersResult.isOk()).toBe(true);
          if (getMembersResult.isOk()) {
            expect(Object.keys(getMembersResult.value)).toHaveLength(0);
          }

          // Verify team number is removed from active set
          const isInSetResult = await mockRedis.sismember(redisKeys.teamNumbers(), team.teamNumber);
          expect(isInSetResult.isOk()).toBe(true);
          if (isInSetResult.isOk()) {
            expect(isInSetResult.value).toBe(false);
          }
        }
      });

      it("should return error for non-existent team", async () => {
        const result = await deleteTeam(mockRedis, "non-existent-id");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("team not found");
        }
      });

      it("should return error when Redis operation fails", async () => {
        const userId = "user-123";
        const createResult = await createTeam(mockRedis, userId);
        expect(createResult.isOk()).toBe(true);

        if (createResult.isOk()) {
          const team = createResult.value;
          mockRedis.simulateError("Redis connection failed");

          const deleteResult = await deleteTeam(mockRedis, team.id);

          expect(deleteResult.isErr()).toBe(true);
          if (deleteResult.isErr()) {
            expect(deleteResult.error).toContain("could not retrieve team");
          }
        }
      });
    });
  });

  describe("Member CRUD Operations", () => {
    let teamId: string;
    
    beforeEach(async () => {
      const createResult = await createTeam(mockRedis, "team-leader");
      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        teamId = createResult.value.id;
      }
    });

    describe("addMember", () => {
      it("should add member to existing team", async () => {
        const userId = "member-1";
        const socketId = "socket-123";

        const result = await addMember(mockRedis, teamId, userId, socketId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const member = result.value;
          expect(member.id).toBeDefined();
          expect(member.userId).toBe(userId);
          expect(member.role).toBe(MemberRole.MEMBER);
          expect(member.status).toBe(MemberStatus.ACTIVE);
          expect(member.socketId).toBe(socketId);
          expect(member.joinedAt).toBeDefined();
        }
      });

      it("should add team creator as LEADER", async () => {
        const userId = "team-leader";

        const result = await addMember(mockRedis, teamId, userId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const member = result.value;
          expect(member.role).toBe(MemberRole.LEADER);
        }
      });

      it("should update team currentMembers count", async () => {
        const userId = "member-1";

        const result = await addMember(mockRedis, teamId, userId);
        expect(result.isOk()).toBe(true);

        const teamResult = await getTeam(mockRedis, teamId);
        expect(teamResult.isOk()).toBe(true);
        if (teamResult.isOk()) {
          expect(teamResult.value!.currentMembers).toBe(1);
        }
      });

      it("should return error when team is full", async () => {
        // Fill the team to max capacity
        for (let i = 1; i <= 4; i++) {
          const addResult = await addMember(mockRedis, teamId, `member-${i}`);
          expect(addResult.isOk()).toBe(true);
        }

        // Try to add one more member
        const result = await addMember(mockRedis, teamId, "member-5");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("team is full");
        }
      });

      it("should return error for non-existent team", async () => {
        const result = await addMember(mockRedis, "non-existent-team", "member-1");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("team not found");
        }
      });

      it("should return error when Redis operation fails", async () => {
        mockRedis.simulateError("Redis connection failed");

        const result = await addMember(mockRedis, teamId, "member-1");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toContain("could not retrieve team");
        }
      });
    });

    describe("getMembers", () => {
      beforeEach(async () => {
        // Add some test members
        await addMember(mockRedis, teamId, "member-1", "socket-1");
        await addMember(mockRedis, teamId, "member-2", "socket-2");
      });

      it("should retrieve all team members", async () => {
        const result = await getMembers(mockRedis, teamId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const members = result.value;
          expect(members).toHaveLength(2);
          expect(members.some(m => m.userId === "member-1")).toBe(true);
          expect(members.some(m => m.userId === "member-2")).toBe(true);
        }
      });

      it("should return empty array for team with no members", async () => {
        const emptyTeamResult = await createTeam(mockRedis, "empty-team-leader");
        expect(emptyTeamResult.isOk()).toBe(true);

        if (emptyTeamResult.isOk()) {
          const emptyTeamId = emptyTeamResult.value.id;
          const result = await getMembers(mockRedis, emptyTeamId);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value).toHaveLength(0);
          }
        }
      });

      it("should return error when Redis operation fails", async () => {
        mockRedis.simulateError("Redis connection failed");

        const result = await getMembers(mockRedis, teamId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toContain("could not retrieve team members");
        }
      });
    });

    describe("removeMember", () => {
      beforeEach(async () => {
        await addMember(mockRedis, teamId, "member-1");
        await addMember(mockRedis, teamId, "member-2");
      });

      it("should remove member from team", async () => {
        const result = await removeMember(mockRedis, teamId, "member-1");

        expect(result.isOk()).toBe(true);

        const membersResult = await getMembers(mockRedis, teamId);
        expect(membersResult.isOk()).toBe(true);
        if (membersResult.isOk()) {
          const members = membersResult.value;
          expect(members).toHaveLength(1);
          expect(members.some(m => m.userId === "member-1")).toBe(false);
          expect(members.some(m => m.userId === "member-2")).toBe(true);
        }
      });

      it("should update team currentMembers count", async () => {
        const result = await removeMember(mockRedis, teamId, "member-1");
        expect(result.isOk()).toBe(true);

        const teamResult = await getTeam(mockRedis, teamId);
        expect(teamResult.isOk()).toBe(true);
        if (teamResult.isOk()) {
          expect(teamResult.value!.currentMembers).toBe(1);
        }
      });

      it("should delete team when last member is removed", async () => {
        // Remove all members
        await removeMember(mockRedis, teamId, "member-1");
        const result = await removeMember(mockRedis, teamId, "member-2");

        expect(result.isOk()).toBe(true);

        // Team should be deleted
        const teamResult = await getTeam(mockRedis, teamId);
        expect(teamResult.isOk()).toBe(true);
        if (teamResult.isOk()) {
          expect(teamResult.value).toBeNull();
        }
      });

      it("should return error for non-existent member", async () => {
        const result = await removeMember(mockRedis, teamId, "non-existent-member");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("member not found in team");
        }
      });

      it("should return error for non-existent team", async () => {
        const result = await removeMember(mockRedis, "non-existent-team", "member-1");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("team not found");
        }
      });

      it("should return error when Redis operation fails", async () => {
        mockRedis.simulateError("Redis connection failed");

        const result = await removeMember(mockRedis, teamId, "member-1");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("Redis connection failed");
        }
      });
    });

    describe("updateMemberStatus", () => {
      const userId = "member-1";

      beforeEach(async () => {
        const memberResult = await addMember(mockRedis, teamId, userId);
        expect(memberResult.isOk()).toBe(true);
      });

      it("should update member status", async () => {
        const result = await updateMemberStatus(mockRedis, teamId, userId, MemberStatus.DISCONNECTED);

        expect(result.isOk()).toBe(true);

        const membersResult = await getMembers(mockRedis, teamId);
        expect(membersResult.isOk()).toBe(true);
        if (membersResult.isOk()) {
          const member = membersResult.value.find(m => m.userId === userId);
          expect(member?.status).toBe(MemberStatus.DISCONNECTED);
        }
      });

      it("should return error for non-existent member", async () => {
        const result = await updateMemberStatus(mockRedis, teamId, "non-existent-member", MemberStatus.DISCONNECTED);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("member not found");
        }
      });

      it("should return error when Redis operation fails", async () => {
        mockRedis.simulateError("Redis connection failed");

        const result = await updateMemberStatus(mockRedis, teamId, userId, MemberStatus.DISCONNECTED);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe("Redis connection failed");
        }
      });
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle concurrent team creation attempts", async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        createTeam(mockRedis, `user-${i}`)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.isOk()).toBe(true);
      });

      // All team numbers should be unique
      const teamNumbers = results
        .filter(r => r.isOk())
        .map(r => r.isOk() ? r.value.teamNumber : "");
      const uniqueNumbers = new Set(teamNumbers);
      expect(uniqueNumbers.size).toBe(teamNumbers.length);
    });

    it("should handle team operations with maximum members", async () => {
      const teamResult = await createTeam(mockRedis, "leader", 2);
      expect(teamResult.isOk()).toBe(true);

      if (teamResult.isOk()) {
        const team = teamResult.value;

        // Add members up to max capacity
        const member1Result = await addMember(mockRedis, team.id, "member-1");
        expect(member1Result.isOk()).toBe(true);

        const member2Result = await addMember(mockRedis, team.id, "member-2");
        expect(member2Result.isOk()).toBe(true);

        // Should fail to add one more
        const member3Result = await addMember(mockRedis, team.id, "member-3");
        expect(member3Result.isErr()).toBe(true);

        // Should successfully remove and add again
        const removeResult = await removeMember(mockRedis, team.id, "member-1");
        expect(removeResult.isOk()).toBe(true);

        const member4Result = await addMember(mockRedis, team.id, "member-4");
        expect(member4Result.isOk()).toBe(true);
      }
    });

    it("should handle invalid JSON data gracefully", async () => {
      // Manually corrupt data in Redis
      await mockRedis.set(redisKeys.team("corrupted-team"), "invalid-json");

      try {
        const result = await getTeam(mockRedis, "corrupted-team");
        // If no error is thrown, the result should be an error
        expect(result.isErr()).toBe(true);
      } catch (error) {
        // If an error is thrown, that's also acceptable behavior
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe("removeUserFromAllTeams", () => {
    let team1Id: string;
    let team2Id: string;
    let team3Id: string;
    const userId = "test-user";
    const otherUserId = "other-user";

    beforeEach(async () => {
      // Create multiple teams
      const team1Result = await createTeam(mockRedis, "leader-1");
      const team2Result = await createTeam(mockRedis, "leader-2");
      const team3Result = await createTeam(mockRedis, "leader-3");
      
      expect(team1Result.isOk()).toBe(true);
      expect(team2Result.isOk()).toBe(true);
      expect(team3Result.isOk()).toBe(true);
      
      if (team1Result.isOk()) team1Id = team1Result.value.id;
      if (team2Result.isOk()) team2Id = team2Result.value.id;
      if (team3Result.isOk()) team3Id = team3Result.value.id;

      // Add the target user to team1 and team2
      await addMember(mockRedis, team1Id, userId);
      await addMember(mockRedis, team2Id, userId);
      
      // Add other users to all teams
      await addMember(mockRedis, team1Id, otherUserId);
      await addMember(mockRedis, team2Id, otherUserId);
      await addMember(mockRedis, team3Id, otherUserId);
    });

    it("should remove user from all teams they belong to", async () => {
      const result = await removeUserFromAllTeams(mockRedis, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { removedFromTeams, deletedTeams } = result.value;
        expect(removedFromTeams).toHaveLength(2);
        expect(removedFromTeams).toContain(team1Id);
        expect(removedFromTeams).toContain(team2Id);
        expect(deletedTeams).toHaveLength(0); // Teams should not be deleted as they still have other members
      }

      // Verify user is removed from team1
      const team1MembersResult = await getMembers(mockRedis, team1Id);
      expect(team1MembersResult.isOk()).toBe(true);
      if (team1MembersResult.isOk()) {
        const members = team1MembersResult.value;
        expect(members.some(m => m.userId === userId)).toBe(false);
        expect(members.some(m => m.userId === otherUserId)).toBe(true);
      }

      // Verify user is removed from team2
      const team2MembersResult = await getMembers(mockRedis, team2Id);
      expect(team2MembersResult.isOk()).toBe(true);
      if (team2MembersResult.isOk()) {
        const members = team2MembersResult.value;
        expect(members.some(m => m.userId === userId)).toBe(false);
        expect(members.some(m => m.userId === otherUserId)).toBe(true);
      }

      // Verify user was never in team3
      const team3MembersResult = await getMembers(mockRedis, team3Id);
      expect(team3MembersResult.isOk()).toBe(true);
      if (team3MembersResult.isOk()) {
        const members = team3MembersResult.value;
        expect(members.some(m => m.userId === userId)).toBe(false);
        expect(members.some(m => m.userId === otherUserId)).toBe(true);
      }
    });

    it("should delete teams when user was the last member", async () => {
      // Create a team with only the target user
      const soloTeamResult = await createTeam(mockRedis, "solo-leader");
      expect(soloTeamResult.isOk()).toBe(true);
      
      if (soloTeamResult.isOk()) {
        const soloTeamId = soloTeamResult.value.id;
        await addMember(mockRedis, soloTeamId, userId);

        const result = await removeUserFromAllTeams(mockRedis, userId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const { removedFromTeams, deletedTeams } = result.value;
          expect(removedFromTeams).toHaveLength(3); // team1, team2, soloTeam
          expect(deletedTeams).toHaveLength(1); // Only soloTeam should be deleted
          expect(deletedTeams).toContain(soloTeamId);
        }

        // Verify solo team was deleted
        const soloTeamCheckResult = await getTeam(mockRedis, soloTeamId);
        expect(soloTeamCheckResult.isOk()).toBe(true);
        if (soloTeamCheckResult.isOk()) {
          expect(soloTeamCheckResult.value).toBeNull();
        }
      }
    });

    it("should return empty arrays when user is not in any team", async () => {
      const nonExistentUserId = "non-existent-user";
      
      const result = await removeUserFromAllTeams(mockRedis, nonExistentUserId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { removedFromTeams, deletedTeams } = result.value;
        expect(removedFromTeams).toHaveLength(0);
        expect(deletedTeams).toHaveLength(0);
      }
    });

    it("should handle teams with corrupted data gracefully", async () => {
      // Create a corrupted team entry (team exists but members data is corrupted)
      const corruptedTeamResult = await createTeam(mockRedis, "corrupted-leader");
      expect(corruptedTeamResult.isOk()).toBe(true);
      
      if (corruptedTeamResult.isOk()) {
        const corruptedTeamId = corruptedTeamResult.value.id;
        // Manually corrupt the team members data
        await mockRedis.hset(redisKeys.teamMembers(corruptedTeamId), userId, "invalid-json");

        const result = await removeUserFromAllTeams(mockRedis, userId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Should still process other teams correctly
          const { removedFromTeams } = result.value;
          expect(removedFromTeams).toContain(team1Id);
          expect(removedFromTeams).toContain(team2Id);
        }
      }
    });

    it("should handle Redis keys operation failure", async () => {
      mockRedis.simulateError("Redis keys operation failed");

      const result = await removeUserFromAllTeams(mockRedis, userId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain("failed to get team keys");
      }
    });

    it("should continue processing even if some teams fail", async () => {
      // Manually delete one team's data to cause failure
      await mockRedis.delete(redisKeys.team(team1Id));

      const result = await removeUserFromAllTeams(mockRedis, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { removedFromTeams } = result.value;
        // Should still remove from team2 even if team1 failed
        expect(removedFromTeams).toContain(team2Id);
        // team1 should not be in the results due to failure
        expect(removedFromTeams).not.toContain(team1Id);
      }
    });

    it("should filter team keys correctly", async () => {
      // Add some non-team keys that match the pattern
      const invalidKeyResult = await mockRedis.set(RedisStringKey("team:invalid-uuid"), "some data");
      const anotherInvalidKeyResult = await mockRedis.set(RedisStringKey("team:not-a-team"), "some data");
      
      expect(invalidKeyResult.isOk()).toBe(true);
      expect(anotherInvalidKeyResult.isOk()).toBe(true);
      
      const result = await removeUserFromAllTeams(mockRedis, userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should only process valid team UUIDs
        const { removedFromTeams } = result.value;
        expect(removedFromTeams).toHaveLength(2);
      }
    });
  });
});