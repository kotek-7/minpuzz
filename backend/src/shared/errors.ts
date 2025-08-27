import type { StoreError } from "../repository/gameStore.js";

export type HttpError = { status: number; message: string };
export type SocketError = { code: string; message: string };

const storeErrorMessages: Record<StoreError, string> = {
  notFound: 'resource not found',
  conflict: 'conflict',
  invalid: 'invalid input',
  io: 'internal error',
};

export function mapStoreErrorToHttp(err: StoreError): HttpError {
  switch (err) {
    case 'notFound':
      return { status: 404, message: storeErrorMessages[err] };
    case 'conflict':
      return { status: 409, message: storeErrorMessages[err] };
    case 'invalid':
      return { status: 400, message: storeErrorMessages[err] };
    case 'io':
    default:
      return { status: 500, message: storeErrorMessages.io };
  }
}

export function mapStoreErrorToSocket(err: StoreError, codePrefix = 'store'):
  SocketError {
  return { code: `${codePrefix}:${err}`, message: storeErrorMessages[err] };
}

