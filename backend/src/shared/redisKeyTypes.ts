export type RedisTypes = "string" | "hash" | "list" | "set";

export interface RedisKey {
    type: RedisTypes;
    key: string;
};

export interface RedisStringKey extends RedisKey {
    type: "string";
}
export const RedisStringKey = (key: string) => ({ key, type: "string" } as RedisStringKey);

export interface RedisHashKey extends RedisKey {
    type: "hash";
};
export const RedisHashKey = (key: string) => ({ key, type: "hash" } as RedisHashKey);

export interface RedisListKey extends RedisKey {
    type: "list";
};
export const RedisListKey = (key: string) => ({ key, type: "list" } as RedisListKey);

export interface RedisSetKey extends RedisKey {
    type: "set";
};
export const RedisSetKey = (key: string) => ({ key, type: "set" } as RedisSetKey);