export const serializeError = (error: Error): Record<string, unknown> => {
  const errorWithCause = error as Error & { code?: string; cause?: unknown }
  const serialized: Record<string, unknown> = {
    name: error?.name ?? 'Error',
    message: error?.message ?? String(error),
    stack: error?.stack
  }
  if (errorWithCause.code) serialized.code = errorWithCause.code
  if (errorWithCause.cause) {
    serialized.cause = errorWithCause.cause instanceof Error
      ? serializeError(errorWithCause.cause)
      : errorWithCause.cause
  }
  for (const key of Object.keys(error)) {
    if (!['name', 'message', 'stack', 'code', 'cause'].includes(key)) {
      serialized[key] = (error as unknown as Record<string, unknown>)[key]
    }
  }
  return serialized
}
