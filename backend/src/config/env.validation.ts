import Joi from 'joi';

/**
 * Validated at boot by ConfigModule, so a missing or malformed variable fails fast with a
 * readable message instead of surfacing as a runtime error later.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),

  MONGODB_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  MONGODB_DNS_SERVERS: Joi.string().optional(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  CORS_ORIGINS: Joi.string().default('*'),

  UPLOAD_DRIVER: Joi.string().valid('local', 's3').default('local'),
  UPLOAD_DIR: Joi.string().default('./uploads'),
  PUBLIC_BASE_URL: Joi.string().uri().default('http://localhost:3000'),

  DEFAULT_SAFE_HOURS: Joi.number().min(1).max(72).default(6),
  FRESHNESS_CRON: Joi.string().default('0 */15 * * * *'),
});
