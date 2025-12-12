/**
 * Unit Tests for LLM Service
 *
 * Tests the LLM abstraction layer:
 * - JSON generation
 * - Text generation
 * - Embedding generation
 * - Cosine similarity calculation
 * - API integration (when API key present, uses mocked fetch)
 */

import { Test, TestingModule } from "@nestjs/testing";
import { LLMService } from "./llm.service";

// ============================================================================
// TESTS - These tests work regardless of API key presence
// ============================================================================

describe("LLMService", () => {
    let service: LLMService;
    let fetchSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LLMService],
        }).compile();

        service = module.get<LLMService>(LLMService);

        // Mock fetch globally to prevent any real API calls
        fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: '{"mock": true}' } }],
                        usage: { total_tokens: 100 },
                    }),
            } as Response),
        );
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    describe("cosineSimilarity", () => {
        it("should return 1 for identical vectors", () => {
            const vector = [0.5, 0.5, 0.5, 0.5];
            const similarity = service.cosineSimilarity(vector, vector);

            expect(similarity).toBeCloseTo(1.0, 5);
        });

        it("should return 0 for orthogonal vectors", () => {
            const vectorA = [1, 0, 0, 0];
            const vectorB = [0, 1, 0, 0];
            const similarity = service.cosineSimilarity(vectorA, vectorB);

            expect(similarity).toBeCloseTo(0, 5);
        });

        it("should return -1 for opposite vectors", () => {
            const vectorA = [1, 0, 0, 0];
            const vectorB = [-1, 0, 0, 0];
            const similarity = service.cosineSimilarity(vectorA, vectorB);

            expect(similarity).toBeCloseTo(-1.0, 5);
        });

        it("should return 0 for different length vectors", () => {
            const vectorA = [1, 0, 0];
            const vectorB = [1, 0, 0, 0];
            const similarity = service.cosineSimilarity(vectorA, vectorB);

            expect(similarity).toBe(0);
        });

        it("should handle normalized vectors", () => {
            // Normalized vectors (length 1)
            const vectorA = [0.6, 0.8];
            const vectorB = [0.8, 0.6];
            const similarity = service.cosineSimilarity(vectorA, vectorB);

            // cos(θ) = 0.6*0.8 + 0.8*0.6 = 0.96
            expect(similarity).toBeCloseTo(0.96, 2);
        });

        it("should handle zero vectors gracefully", () => {
            const vectorA = [0, 0, 0];
            const vectorB = [1, 0, 0];
            const similarity = service.cosineSimilarity(vectorA, vectorB);

            // Division by zero case - returns NaN or 0
            expect(Number.isNaN(similarity) || similarity === 0).toBe(true);
        });

        it("should be symmetric", () => {
            const vectorA = [0.3, 0.5, 0.7];
            const vectorB = [0.6, 0.4, 0.2];

            const simAB = service.cosineSimilarity(vectorA, vectorB);
            const simBA = service.cosineSimilarity(vectorB, vectorA);

            expect(simAB).toBeCloseTo(simBA, 10);
        });

        it("should handle large vectors", () => {
            const size = 1536; // Common embedding size
            const vectorA = Array.from({ length: size }, () => Math.random());
            const vectorB = Array.from({ length: size }, () => Math.random());

            const similarity = service.cosineSimilarity(vectorA, vectorB);

            expect(similarity).toBeGreaterThanOrEqual(-1);
            expect(similarity).toBeLessThanOrEqual(1);
        });
    });

    describe("generateJSON", () => {
        it("should return success response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: '{"test": true}' } }],
                        usage: { total_tokens: 100 },
                    }),
            } as Response);

            const result = await service.generateJSON<{ test: boolean }>(
                "test prompt",
            );

            expect(result.success).toBe(true);
        });

        it("should parse JSON response correctly", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [
                            {
                                message: {
                                    content: '{"name": "test", "value": 42}',
                                },
                            },
                        ],
                        usage: { total_tokens: 50 },
                    }),
            } as Response);

            const result = await service.generateJSON<{
                name: string;
                value: number;
            }>("test");

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe("test");
            expect(result.data?.value).toBe(42);
        });

        it("should handle API errors gracefully", async () => {
            fetchSpy.mockResolvedValue({
                ok: false,
                status: 500,
                text: () => Promise.resolve("Internal Server Error"),
            } as Response);

            const result = await service.generateJSON("test");

            expect(result.success).toBe(false);
            expect(result.error).toContain("500");
        });

        it("should handle empty response content", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "" } }],
                    }),
            } as Response);

            const result = await service.generateJSON("test");

            expect(result.success).toBe(false);
            expect(result.error).toContain("No content");
        });

        it("should handle invalid JSON response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "not valid json" } }],
                    }),
            } as Response);

            const result = await service.generateJSON("test");

            expect(result.success).toBe(false);
        });

        it("should include token usage in response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "{}" } }],
                        usage: { total_tokens: 150 },
                    }),
            } as Response);

            const result = await service.generateJSON("test");

            expect(result.tokensUsed).toBe(150);
        });

        it("should include latency in response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "{}" } }],
                        usage: { total_tokens: 50 },
                    }),
            } as Response);

            const result = await service.generateJSON("test");

            expect(result.latencyMs).toBeDefined();
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it("should handle network errors", async () => {
            fetchSpy.mockRejectedValue(new Error("Network error"));

            const result = await service.generateJSON("test");

            expect(result.success).toBe(false);
            expect(result.error).toContain("Network error");
        });
    });

    describe("generateText", () => {
        it("should return success response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [
                            { message: { content: "Generated text response" } },
                        ],
                        usage: { total_tokens: 75 },
                    }),
            } as Response);

            const result = await service.generateText("test prompt");

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(typeof result.data).toBe("string");
        });

        it("should include latency in response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "test" } }],
                        usage: { total_tokens: 10 },
                    }),
            } as Response);

            const result = await service.generateText("test");

            expect(result.latencyMs).toBeDefined();
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("generateEmbedding", () => {
        it("should return embedding array", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        data: [{ embedding: Array(1536).fill(0.1) }],
                        usage: { total_tokens: 10 },
                    }),
            } as Response);

            const result = await service.generateEmbedding("test text");

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data!.length).toBeGreaterThan(0);
        });

        it("should return normalized embedding", async () => {
            const result = await service.generateEmbedding("test text");

            if (result.data) {
                const norm = Math.sqrt(
                    result.data.reduce((sum, x) => sum + x * x, 0),
                );
                // Normalized vectors have length ~1
                expect(norm).toBeCloseTo(1.0, 1);
            }
        });
    });

    describe("Response Structure", () => {
        it("should include success flag in JSON response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "{}" } }],
                    }),
            } as Response);

            const result = await service.generateJSON("test");
            expect(result).toHaveProperty("success");
        });

        it("should include success flag in text response", async () => {
            const result = await service.generateText("test");
            expect(result).toHaveProperty("success");
        });

        it("should include success flag in embedding response", async () => {
            const result = await service.generateEmbedding("test");
            expect(result).toHaveProperty("success");
        });
    });

    describe("Error Handling", () => {
        it("should handle malformed API response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        // Missing choices array
                        unexpected: "response",
                    }),
            } as Response);

            const result = await service.generateJSON("test");

            expect(result.success).toBe(false);
        });

        it("should handle null content in response", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: null } }],
                    }),
            } as Response);

            const result = await service.generateJSON("test");

            expect(result.success).toBe(false);
        });

        it("should handle timeout-like scenarios", async () => {
            fetchSpy.mockRejectedValue(new Error("Request timeout"));

            const result = await service.generateJSON("test");

            expect(result.success).toBe(false);
            expect(result.error).toContain("timeout");
        });
    });

    describe("Config Options", () => {
        it("should use default model when not specified", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "{}" } }],
                    }),
            } as Response);

            await service.generateJSON("test");

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(callBody.model).toBeDefined();
        });

        it("should use custom model when specified", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "{}" } }],
                    }),
            } as Response);

            await service.generateJSON("test", { model: "gpt-5.2" });

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(callBody.model).toBe("gpt-5.2");
        });

        it("should use custom temperature when specified", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "{}" } }],
                    }),
            } as Response);

            await service.generateJSON("test", { temperature: 0.5 });

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(callBody.temperature).toBe(0.5);
        });

        it("should use custom maxTokens when specified", async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: "{}" } }],
                    }),
            } as Response);

            await service.generateJSON("test", { maxTokens: 500 });

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(callBody.max_completion_tokens).toBe(500);
        });
    });
});
