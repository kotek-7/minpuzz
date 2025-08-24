import { Server, Socket } from "socket.io";
import { RedisClient } from "../shared/redisClient.js";
import {
  SOCKET_EVENTS,
  JoinTeamPayload,
  LeaveTeamPayload,
  MemberJoinedPayload,
  MemberLeftPayload,
  TeamUpdatedPayload,
} from "./events.js";
import { getTeamRoom, addSocketUserMapping, removeSocketUserMapping, getUserBySocketId } from "./utils.js";

export function registerTeamHandler(io: Server, socket: Socket, redis: RedisClient) {
  socket.on(SOCKET_EVENTS.JOIN_TEAM, async (payload: JoinTeamPayload) => {
    try {
      const { teamId, userId } = payload;
      const teamRoom = getTeamRoom(teamId);

      // リアルタイム通信のためSocket ID↔User IDマッピングをRedis管理
      // 同一ユーザーの重複接続防止と切断時の自動クリーンアップに使用
      const mappingResult = await addSocketUserMapping(redis, socket.id, userId);
      if (mappingResult.isErr()) {
        console.error(`Failed to add socket mapping: ${mappingResult.error}`);
        socket.emit("error", { message: "Failed to join team" });
        return;
      }

      await socket.join(teamRoom);

      console.log(`User ${userId} (${socket.id}) joined team ${teamId}`);

      // 既存チームメンバーのみに新メンバー参加通知（本人は除外）
      // リアルタイムUIの同期のため即座にブロードキャスト
      const memberJoinedPayload: MemberJoinedPayload = {
        teamId,
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      };

      socket.to(teamRoom).emit(SOCKET_EVENTS.MEMBER_JOINED, memberJoinedPayload);

      // チーム人数変更の全体通知（参加者本人も含む）
      // フロントエンドでのメンバー数表示更新とマッチング条件判定に必要
      const roomSockets = await io.in(teamRoom).fetchSockets();
      const teamUpdatedPayload: TeamUpdatedPayload = {
        teamId,
        memberCount: roomSockets.length,
        timestamp: new Date().toISOString(),
      };

      io.to(teamRoom).emit(SOCKET_EVENTS.TEAM_UPDATED, teamUpdatedPayload);
    } catch (error) {
      console.error(`Error joining team:`, error);
      socket.emit("error", { message: "Failed to join team" });
    }
  });

  socket.on(SOCKET_EVENTS.LEAVE_TEAM, async (payload: LeaveTeamPayload) => {
    try {
      const { teamId, userId } = payload;
      const teamRoom = getTeamRoom(teamId);

      await socket.leave(teamRoom);

      console.log(`User ${userId} (${socket.id}) left team ${teamId}`);

      // 残存メンバーへの離脱通知（離脱者本人は既にルーム外のため除外）
      // チーム待機画面でのメンバーリスト即座更新のため
      const memberLeftPayload: MemberLeftPayload = {
        teamId,
        userId,
        timestamp: new Date().toISOString(),
      };

      socket.to(teamRoom).emit(SOCKET_EVENTS.MEMBER_LEFT, memberLeftPayload);

      // 人数変更後のチーム状態通知
      // マッチング条件（最小人数）判定とUI表示更新のため必須
      const roomSockets = await io.in(teamRoom).fetchSockets();
      const teamUpdatedPayload: TeamUpdatedPayload = {
        teamId,
        memberCount: roomSockets.length,
        timestamp: new Date().toISOString(),
      };

      io.to(teamRoom).emit(SOCKET_EVENTS.TEAM_UPDATED, teamUpdatedPayload);

      // メモリリーク防止のためSocket↔User関連付けをRedisから削除
      const removeResult = await removeSocketUserMapping(redis, socket.id);
      if (removeResult.isErr()) {
        console.error(`Failed to remove socket mapping: ${removeResult.error}`);
      }
    } catch (error) {
      console.error(`Error leaving team:`, error);
      socket.emit("error", { message: "Failed to leave team" });
    }
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
    try {
      const userResult = await getUserBySocketId(redis, socket.id);
      if (userResult.isErr()) {
        console.error(`Failed to get user by socket ID: ${userResult.error}`);
        return;
      }
      
      const userId = userResult.value;
      if (!userId) {
        console.log(`Socket ${socket.id} disconnected (no user mapping found)`);
        return;
      }

      console.log(`User ${userId} (${socket.id}) disconnected`);

      // 予期しない切断（ブラウザ終了・ネットワーク障害等）への対応
      // 全てのチームルームから自動離脱処理を実行
      const rooms = Array.from(socket.rooms).filter((room) => room.startsWith("team:"));

      for (const teamRoom of rooms) {
        const teamId = teamRoom.replace("team:", "");

        // 切断による離脱を他メンバーへ通知
        // UI上での「メンバーが退出しました」表示のため
        const memberLeftPayload: MemberLeftPayload = {
          teamId,
          userId,
          timestamp: new Date().toISOString(),
        };

        socket.to(teamRoom).emit(SOCKET_EVENTS.MEMBER_LEFT, memberLeftPayload);

        // 切断後の正確な人数カウント通知
        // マッチング継続可否の判断とUI更新のため重要
        const roomSockets = await io.in(teamRoom).fetchSockets();
        const teamUpdatedPayload: TeamUpdatedPayload = {
          teamId,
          memberCount: roomSockets.length,
          timestamp: new Date().toISOString(),
        };

        io.to(teamRoom).emit(SOCKET_EVENTS.TEAM_UPDATED, teamUpdatedPayload);
      }

      // 切断時の必須クリーンアップ：Redisからマッピング削除でメモリリーク防止
      const removeResult = await removeSocketUserMapping(redis, socket.id);
      if (removeResult.isErr()) {
        console.error(`Failed to remove socket mapping on disconnect: ${removeResult.error}`);
      }
    } catch (error) {
      console.error(`Error handling disconnect:`, error);
    }
  });
}
