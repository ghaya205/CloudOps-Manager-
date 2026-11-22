
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];

  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    errors.push('DATABASE_URL is required');
  }

  const jwtSecret = config.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 16) {
    errors.push('JWT_SECRET is required and must be at least 16 characters');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }
  return config;
}
