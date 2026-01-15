export const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error)
}

export const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${timestamp}-${random}`
}
