// REST呼び出しの極薄ラッパ。モード切替（mock/real）に対応します。

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
};

export function isMockMode() {
  if (typeof process !== "undefined") {
    return process.env.NEXT_PUBLIC_API_MODE === "mock";
  }
  return false;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const url = `${base}/v1${path}`;

  const init: RequestInit = {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  };

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const json = (await res.json().catch(() => null)) as T | null;
  if (json == null) throw new Error("Invalid JSON response");
  return json as T;
}

