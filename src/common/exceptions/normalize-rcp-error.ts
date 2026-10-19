export const normalizeRpcError = (error: unknown): string | object => {
  if (typeof error === 'string') return error;

  if (typeof error === 'object' && error !== null) return error;

  return { message: 'Unexpected microservice error' };
};
