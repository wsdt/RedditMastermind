import * as dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

// Define the schema for our environment variables
const envSchema = z.object({
    BE_PORT: z.string().default("3000").transform(Number),
    OPENAI_API_KEY: z.string().optional().default(""), // for simplicity we allow empty key for testing (if this was a production app, we would not allow empty key)
    NODE_ENV: z.string().default("development"),
});

// Type for the validated environment
export type TypedEnv = z.infer<typeof envSchema>;

// Function to validate the environment
let lazyEnv: TypedEnv; // internal variable
export function validateEnv(): TypedEnv {
    if (lazyEnv) {
        return lazyEnv; // just validate once
    }
    const envParse = envSchema.safeParse(process.env);

    if (!envParse.success) {
        console.error(
            "❌ Invalid environment variables:",
            JSON.stringify(envParse.error.format(), null, 4),
        );
        throw new Error("Invalid environment variables");
    }

    console.log("✅ Environment variables validated successfully");
    lazyEnv = envParse.data;
    return lazyEnv;
}

// Export the validated environment variables
export const TYPED_ENV = validateEnv();
