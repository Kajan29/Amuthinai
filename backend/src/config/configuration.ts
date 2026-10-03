/** Single typed view of the environment, registered with ConfigModule.forRoot({ load }). */
export const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((origin) => origin.trim()),

  database: {
    uri: process.env.MONGODB_URI!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  uploads: {
    driver: (process.env.UPLOAD_DRIVER ?? 'local') as 'local' | 's3',
    dir: process.env.UPLOAD_DIR ?? './uploads',
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
  },

  /** FR3 */
  freshness: {
    defaultSafeHours: Number(process.env.DEFAULT_SAFE_HOURS ?? 6),
    cron: process.env.FRESHNESS_CRON ?? '0 */15 * * * *',
  },
});

export type Configuration = ReturnType<typeof configuration>;
