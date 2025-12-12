/**
 * LLM Service - Handles all AI/LLM interactions
 *
 * Abstracts the LLM provider (OpenAI) and provides:
 * - Structured output parsing
 * - Retry logic
 * - Token tracking
 */

import { Injectable, Logger } from "@nestjs/common";
import { TYPED_ENV } from "../utils/env.utils";

export interface LLMResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    tokensUsed?: number;
    latencyMs?: number;
}

export interface LLMConfig {
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

const DEFAULT_MODEL = "gpt-5.2";

@Injectable()
export class LLMService {
    private readonly logger = new Logger(LLMService.name);
    private readonly apiKey: string | undefined;
    private readonly baseUrl = "https://api.openai.com/v1/chat/completions";

    constructor() {
        this.apiKey = TYPED_ENV.OPENAI_API_KEY;
    }

    /**
     * Send a prompt and get a JSON response
     */
    async generateJSON<T>(
        prompt: string,
        config: LLMConfig = {},
    ): Promise<LLMResponse<T>> {
        const startTime = Date.now();

        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model || DEFAULT_MODEL,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a helpful assistant that outputs valid JSON. Always respond with properly formatted JSON that can be parsed.",
                        },
                        { role: "user", content: prompt },
                    ],
                    temperature: config.temperature ?? 0.7,
                    // GPT-5.2 uses reasoning tokens, so we need more headroom for both reasoning + output
                    max_completion_tokens: config.maxTokens || 8000,
                    response_format: { type: "json_object" },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `OpenAI API error: ${response.status} - ${errorText}`,
                );
            }

            const result = await response.json();
            const content = result.choices[0]?.message?.content;

            if (!content) {
                // Log the full response to understand why content is empty
                this.logger.error(
                    `No content in LLM response. Full response: ${JSON.stringify(result)}`,
                );
                throw new Error("No content in LLM response");
            }

            const parsed = JSON.parse(content) as T;

            return {
                success: true,
                data: parsed,
                tokensUsed: result.usage?.total_tokens,
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            this.logger.error(`LLM generation failed: ${error}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                latencyMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Send a prompt and get plain text response
     */
    async generateText(
        prompt: string,
        config: LLMConfig = {},
    ): Promise<LLMResponse<string>> {
        const startTime = Date.now();

        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model || DEFAULT_MODEL,
                    messages: [{ role: "user", content: prompt }],
                    temperature: config.temperature ?? 0.7,
                    max_completion_tokens: config.maxTokens || 1000,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `OpenAI API error: ${response.status} - ${errorText}`,
                );
            }

            const result = await response.json();
            const content = result.choices[0]?.message?.content;

            return {
                success: true,
                data: content,
                tokensUsed: result.usage?.total_tokens,
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            this.logger.error(`LLM text generation failed: ${error}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                latencyMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Generate embeddings for similarity comparison
     */
    async generateEmbedding(text: string): Promise<LLMResponse<number[]>> {
        try {
            const response = await fetch(
                "https://api.openai.com/v1/embeddings",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: "text-embedding-3-small",
                        input: text,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(`Embedding API error: ${response.status}`);
            }

            const result = await response.json();
            return {
                success: true,
                data: result.data[0].embedding,
                tokensUsed: result.usage?.total_tokens,
            };
        } catch (error) {
            this.logger.error(`Embedding generation failed: ${error}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
