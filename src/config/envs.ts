import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
}

const envSchema = joi
  .object<EnvVars>({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
  })
  .unknown(true);

const validationResult = envSchema.validate(process.env);
const error = validationResult.error;
const envVars = validationResult.value as EnvVars;
// console.log("envVars", envVars);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const envs: EnvVars = {
  PORT: envVars.PORT,
  DATABASE_URL: envVars.DATABASE_URL,
};
