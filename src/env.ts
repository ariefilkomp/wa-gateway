import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    KEY: z.string().default(""),
    PORT: z
      .string()
      .default("5001")
      .transform((e) => Number(e)),
    WEBHOOK_BASE_URL: z.string().optional(),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z
      .string()
      .default("3306")
      .transform((e) => Number(e)),
    DB_USER: z.string().default("root"),
    DB_PASSWORD: z.string().default(""),
    DB_DATABASE: z.string().default("sapamas2"),
  })
  .parse(process.env);
