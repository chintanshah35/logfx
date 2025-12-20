/**
 * Robust environment variable detection that handles:
 * - Browser environments (process.env might not exist or be polyfilled incorrectly)
 * - Serverless/Edge runtimes (inconsistent environment variable access)
 * - Build-time vs Runtime (bundlers replace process.env.NODE_ENV at build time)
 * - Custom environments (staging, dev, test, etc.)
 * - Edge runtimes (Cloudflare Workers, Deno Deploy, etc.)
 */

/**
 * Safely get an environment variable value
 * Handles cases where process.env might be polyfilled incorrectly or not exist
 * 
 * Edge cases handled:
 * - process.env is null (typeof null === 'object' but null[key] throws)
 * - process.env[key] is undefined vs key doesn't exist
 * - Empty strings are valid values (different from undefined)
 * - Bundlers replace process.env.NODE_ENV with string literals at build time
 * - Edge runtimes where neither window nor process exist
 */
const getEnvVar = (key: string): string | undefined => {
  try {
    // Check if process exists and process.env is a non-null object
    // Note: typeof null === 'object', so we must check for null explicitly
    if (typeof process !== 'undefined' && process.env !== null && typeof process.env === 'object') {
      // Check if key exists in the object
      // Use 'in' operator to distinguish between undefined value and missing key
      if (key in process.env) {
        const value = process.env[key]
        // Return string values (including empty strings)
        // Empty string is a valid value, different from undefined
        if (typeof value === 'string') {
          return value
        }
        // If value exists but is not a string, return undefined
        // This handles cases where process.env[key] is set to a non-string
        return undefined
      }
    }
  } catch {
    // process.env access failed (edge case in some serverless/edge runtimes)
    // Some runtimes throw when accessing process.env
  }

  return undefined
}

/**
 * Check if we're in production mode
 * Handles build-time replacements and custom environments
 */
export const isProduction = (): boolean => {
  const nodeEnv = getEnvVar('NODE_ENV')
  
  // Explicit production check
  if (nodeEnv === 'production') {
    return true
  }

  // If NODE_ENV is explicitly set to something else, we're not in production
  // This handles staging, dev, test, etc.
  if (nodeEnv !== undefined && nodeEnv !== 'production') {
    return false
  }

  // If NODE_ENV is undefined, default to non-production (safer for development)
  return false
}

/**
 * Get DEBUG filter value from environment
 * Checks both process.env.DEBUG and localStorage (for browser)
 * 
 * Edge cases handled:
 * - Empty string is a valid DEBUG value (means "enabled but no filter")
 * - localStorage.getItem returns null (not set) vs empty string (set but empty)
 * - localStorage access can throw (private browsing, CSP, etc.)
 * - DEBUG="" should be treated as enabled (no filter), not disabled
 */
export const getDebugFilter = (): string | null => {
  // Try process.env.DEBUG first
  const envDebug = getEnvVar('DEBUG')
  // Check for undefined explicitly - empty string is a valid value
  if (envDebug !== undefined) {
    return envDebug
  }

  // In browser, also check localStorage
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const localDebug = localStorage.getItem('DEBUG')
      // localStorage.getItem returns null if key doesn't exist
      // Empty string means key exists but is empty (valid value)
      if (localDebug !== null) {
        return localDebug
      }
    } catch {
      // localStorage access failed (private browsing, CSP, etc.)
    }
  }

  return null
}
