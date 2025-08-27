import type { Server } from 'socket.io';
import { getTeamRoom } from './utils.js';

const getPublicRoom = (matchId: string) => `room:match:${matchId}:public`;

export interface Emitter {
  emit(event: string, payload: unknown): void;
}

export interface Publisher {
  toTeam(teamId: string): Emitter;
  toPublic(matchId: string): Emitter;
  toUser(socketId: string): Emitter;
}

export class SocketPublisher implements Publisher {
  constructor(private readonly io: Server) {}

  toTeam(teamId: string): Emitter {
    const room = getTeamRoom(teamId);
    return {
      emit: (event, payload) => {
        this.io.to(room).emit(event, payload as any);
      },
    };
  }

  toPublic(matchId: string): Emitter {
    const room = getPublicRoom(matchId);
    return {
      emit: (event, payload) => {
        this.io.to(room).emit(event, payload as any);
      },
    };
  }

  toUser(socketId: string): Emitter {
    return {
      emit: (event, payload) => {
        this.io.to(socketId).emit(event, payload as any);
      },
    };
  }
}

export class NoopPublisher implements Publisher {
  toTeam(_teamId: string): Emitter { return { emit: () => {} }; }
  toPublic(_matchId: string): Emitter { return { emit: () => {} }; }
  toUser(_socketId: string): Emitter { return { emit: () => {} }; }
}

export type SpyRecord = { scope: 'team'|'public'|'user'; key: string; event: string; payload: unknown };

export class SpyPublisher implements Publisher {
  public calls: SpyRecord[] = [];

  toTeam(teamId: string): Emitter {
    return {
      emit: (event, payload) => {
        this.calls.push({ scope: 'team', key: teamId, event, payload });
      },
    };
  }

  toPublic(matchId: string): Emitter {
    return {
      emit: (event, payload) => {
        this.calls.push({ scope: 'public', key: matchId, event, payload });
      },
    };
  }

  toUser(socketId: string): Emitter {
    return {
      emit: (event, payload) => {
        this.calls.push({ scope: 'user', key: socketId, event, payload });
      },
    };
  }
}
