import { mapStoreErrorToHttp, mapStoreErrorToSocket } from '../../shared/errors.js';

describe('errors mapping', () => {
  test('mapStoreErrorToHttp status codes', () => {
    expect(mapStoreErrorToHttp('notFound').status).toBe(404);
    expect(mapStoreErrorToHttp('conflict').status).toBe(409);
    expect(mapStoreErrorToHttp('invalid').status).toBe(400);
    expect(mapStoreErrorToHttp('io').status).toBe(500);
  });

  test('mapStoreErrorToSocket codes', () => {
    expect(mapStoreErrorToSocket('notFound')).toEqual({ code: 'store:notFound', message: 'resource not found' });
    expect(mapStoreErrorToSocket('conflict')).toEqual({ code: 'store:conflict', message: 'conflict' });
  });
});

