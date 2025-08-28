"use client";

import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

let sock: Socket | null = null;

export function getSocket(): Socket {
  if (sock) return sock;
  // SSRガード
  if (typeof window === "undefined") {
    throw new Error("Socket is only available on client side");
  }
  const url = process.env.NEXT_PUBLIC_API_URL || "";
  sock = io(url, {
    transports: ["websocket"],
    reconnection: true,
  });
  return sock;
}

