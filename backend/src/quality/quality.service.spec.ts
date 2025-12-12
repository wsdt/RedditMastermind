/**
 * Unit Tests for Quality Service
 *
 * Tests the adversarial review system:
 * - Ad detection (heuristic)
 * - Tone consistency checking
 * - Format validation
 * - Conversation flow validation
 * - Keyword stuffing detection
 */

import { Test, TestingModule } from "@nestjs/testing";
import { SLIDEFORGE_PERSONAS } from "../domain/sample-data";
import { CommentPlan, PostCandidate, ThreadPlan } from "../domain/types";
import { LLMService } from "../generation/llm.service";
import { PersistenceService } from "../persistence/persistence.service";
import { QualityService } from "./quality.service";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockPost(overrides: Partial<PostCandidate> = {}): PostCandidate {
    return {
        id: `post_${Date.now()}`,
        title: "Best AI Presentation Maker?",
        body: "Just like it says in the title, what is the best AI Presentation Maker? I'm looking for something that can take my rough notes and turn them into something presentable.",
        subreddit: "r/PowerPoint",
        targetKeywords: ["K1"],
        opPersonaId: "riley_ops",
        potentialImpact: 75,
        generatedAt: new Date(),
        ...overrides,
    };
}

function createMockComment(overrides: Partial<CommentPlan> = {}): CommentPlan {
    return {
        id: `comment_${Date.now()}_${Math.random()}`,
        personaId: "jordan_consults",
        text: "I've tried a bunch of tools. The key is finding something that doesn't make you fight the interface.",
        replyTo: "root",
        delayMinutes: 20,
        mentionsProduct: false,
        subtletyScore: 0.8,
        ...overrides,
    };
}

function createMockThread(overrides: Partial<ThreadPlan> = {}): ThreadPlan {
    return {
        id: `thread_${Date.now()}`,
        post: createMockPost(),
        comments: [
            createMockComment({ personaId: "jordan_consults" }),
            createMockComment({
                id: "comment_2",
                personaId: "emily_econ",
                text: "+1 on this. Really helpful for my projects.",
                replyTo: "comment_0",
                delayMinutes: 15,
            }),
        ],
        conversationStyle: "question-answer",
        estimatedEngagement: 70,
        ...overrides,
    };
}

// ============================================================================
// MOCK SERVICES
// ============================================================================

const mockLLMService = {
    generateJSON: jest.fn().mockResolvedValue({
        success: true,
        data: {
            adScore: 0.3,
            naturalScore: 0.8,
            consistencyScore: 0.85,
            subtletyScore: 0.75,
            balanceScore: 0.7,
            overallScore: 78,
            passed: true,
            issues: [],
            suggestions: [],
        },
    }),
    cosineSimilarity: jest.fn().mockReturnValue(0.3),
};

const mockPersistenceService = {
    getRecentTopicEmbeddings: jest.fn().mockReturnValue([]),
};

// ============================================================================
// TESTS
// ============================================================================

describe("QualityService", () => {
    let service: QualityService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QualityService,
                { provide: LLMService, useValue: mockLLMService },
                {
                    provide: PersistenceService,
                    useValue: mockPersistenceService,
                },
            ],
        }).compile();

        service = module.get<QualityService>(QualityService);
        jest.clearAllMocks();
    });

    describe("evaluateThread", () => {
        it("should pass a well-formed thread", async () => {
            const thread = createMockThread();
            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            expect(report.passed).toBe(true);
            expect(report.overallScore).toBeGreaterThan(50);
            expect(report.checks.length).toBeGreaterThan(0);
        });

        it("should fail a thread with format issues", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    title: "X", // Too short
                    body: "Y", // Too short
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const formatCheck = report.checks.find(
                (c) => c.name === "format_validation",
            );
            expect(formatCheck?.passed).toBe(false);
        });

        it("should flag threads with placeholders", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    body: "This is a test post [INSERT LINK HERE] with placeholder text.",
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const formatCheck = report.checks.find(
                (c) => c.name === "format_validation",
            );
            expect(formatCheck?.passed).toBe(false);
            expect(formatCheck?.details).toContain("placeholder");
        });
    });

    describe("quickValidate", () => {
        it("should pass valid thread", () => {
            const thread = createMockThread();
            const result = service.quickValidate(thread, SLIDEFORGE_PERSONAS);

            expect(result.valid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it("should catch OP as first commenter with multiple violations", () => {
            // OP as first commenter + consecutive comments = score drops below 0.6
            const thread = createMockThread({
                post: createMockPost({ opPersonaId: "riley_ops" }),
                comments: [
                    createMockComment({
                        personaId: "riley_ops",
                        delayMinutes: 0,
                    }), // OP first + instant
                    createMockComment({
                        personaId: "riley_ops",
                        delayMinutes: 0,
                    }), // Consecutive + instant
                ],
            });

            const result = service.quickValidate(thread, SLIDEFORGE_PERSONAS);

            // Multiple violations should fail the check
            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });

        it("should catch multiple consecutive comments by same persona", () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        personaId: "jordan_consults",
                        delayMinutes: 0,
                    }),
                    createMockComment({
                        personaId: "jordan_consults",
                        delayMinutes: 0,
                    }), // Same persona
                    createMockComment({
                        personaId: "jordan_consults",
                        delayMinutes: 0,
                    }), // Same again
                ],
            });

            const result = service.quickValidate(thread, SLIDEFORGE_PERSONAS);

            // Multiple violations should fail
            expect(result.valid).toBe(false);
        });
    });

    describe("Tone Consistency", () => {
        it("should run tone consistency check on personas", async () => {
            // priya_pm has neutral formality - the check validates persona consistency
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        personaId: "priya_pm",
                        text: "lol this is so true tbh gonna try it",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const toneCheck = report.checks.find(
                (c) => c.name === "tone_consistency",
            );
            // The check should run and return a valid score
            expect(toneCheck).toBeDefined();
            expect(toneCheck?.score).toBeLessThanOrEqual(1.0);
            expect(toneCheck?.score).toBeGreaterThanOrEqual(0);
        });

        it("should accept emojis from emily_econ", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        personaId: "emily_econ",
                        text: "+1 on this! 😊 Really helpful for my projects.",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const toneCheck = report.checks.find(
                (c) => c.name === "tone_consistency",
            );
            // emily_econ uses emojis, so this should be fine
            expect(toneCheck?.score).toBeGreaterThan(0.5);
        });
    });

    describe("Ad Detection (Heuristic)", () => {
        it("should flag marketing buzzwords", async () => {
            // Mock LLM to return failure for this test
            mockLLMService.generateJSON.mockResolvedValueOnce({
                success: false,
            });

            const thread = createMockThread({
                comments: [
                    createMockComment({
                        text: "Slideforge is a revolutionary, game-changing, best-in-class tool that will transform your workflow!",
                        mentionsProduct: true,
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const adCheck = report.checks.find(
                (c) => c.name === "ad_detection",
            );
            expect(adCheck?.score).toBeLessThan(0.7);
        });

        it("should flag excessive product mentions", async () => {
            mockLLMService.generateJSON.mockResolvedValueOnce({
                success: false,
            });

            const thread = createMockThread({
                post: createMockPost({
                    body: "Looking for a tool like Slideforge. Has anyone used Slideforge? Slideforge seems good. Slideforge Slideforge.",
                }),
                comments: [
                    createMockComment({
                        text: "Slideforge is great! I love Slideforge!",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const adCheck = report.checks.find(
                (c) => c.name === "ad_detection",
            );
            expect(adCheck?.score).toBeLessThan(0.8);
        });

        it("should pass subtle, balanced mentions", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        text: "I've tried a few tools. Slideforge works for me, but it's not perfect - the export options are limited. Canva is also worth checking out.",
                        mentionsProduct: true,
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            // With LLM mock returning good scores, should pass
            expect(report.passed).toBe(true);
        });
    });

    describe("Conversation Flow", () => {
        it("should pass natural conversation structure", async () => {
            const thread = createMockThread({
                post: createMockPost({ opPersonaId: "riley_ops" }),
                comments: [
                    createMockComment({
                        personaId: "jordan_consults",
                        replyTo: "root",
                        delayMinutes: 21,
                    }),
                    createMockComment({
                        personaId: "emily_econ",
                        replyTo: "comment_0",
                        delayMinutes: 16,
                    }),
                    createMockComment({
                        personaId: "riley_ops",
                        replyTo: "comment_0",
                        delayMinutes: 13,
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const flowCheck = report.checks.find(
                (c) => c.name === "conversation_flow",
            );
            expect(flowCheck?.passed).toBe(true);
        });

        it("should flag unrealistic timing", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        delayMinutes: 0, // Instant response is suspicious
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const flowCheck = report.checks.find(
                (c) => c.name === "conversation_flow",
            );
            expect(flowCheck?.score).toBeLessThan(1.0);
        });
    });

    describe("Keyword Stuffing", () => {
        it("should flag excessive word repetition", async () => {
            // The keyword stuffing check detects repetitive patterns
            const thread = createMockThread({
                post: createMockPost({
                    title: "Slideforge slideforge slideforge",
                    body: "Slideforge is great. Slideforge works well. Slideforge slideforge slideforge. I love slideforge. Slideforge is the best slideforge ever.",
                    targetKeywords: ["K1"],
                }),
                comments: [
                    createMockComment({
                        text: "Slideforge slideforge slideforge is amazing slideforge",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const keywordCheck = report.checks.find(
                (c) => c.name === "keyword_stuffing",
            );
            // Excessive repetition should lower the score
            expect(keywordCheck?.score).toBeLessThan(0.8);
        });

        it("should pass natural keyword usage", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    title: "Best AI Presentation Maker?",
                    body: "Looking for recommendations on tools that can help me create better slides. I've tried a few but nothing has clicked yet. Any suggestions for something that handles design automatically?",
                    targetKeywords: ["K1"],
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const keywordCheck = report.checks.find(
                (c) => c.name === "keyword_stuffing",
            );
            expect(keywordCheck?.passed).toBe(true);
        });
    });

    describe("Recommendations", () => {
        it("should generate recommendations for failed checks", async () => {
            mockLLMService.generateJSON.mockResolvedValueOnce({
                success: true,
                data: {
                    adScore: 0.8,
                    naturalScore: 0.8,
                    consistencyScore: 0.85,
                    subtletyScore: 0.3,
                    balanceScore: 0.4,
                    overallScore: 55,
                    passed: false,
                    issues: ["Sounds like marketing copy"],
                    suggestions: ["Add criticism", "Mention alternatives"],
                },
            });

            const thread = createMockThread({
                comments: [
                    createMockComment({
                        text: "Slideforge is amazing! Best tool ever!",
                        mentionsProduct: true,
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            expect(report.recommendations.length).toBeGreaterThan(0);
            expect(
                report.recommendations.some(
                    (r) =>
                        r.toLowerCase().includes("criticism") ||
                        r.toLowerCase().includes("alternative"),
                ),
            ).toBe(true);
        });
    });

    describe("Overlap Detection", () => {
        it("should pass when no recent posts exist", async () => {
            mockPersistenceService.getRecentTopicEmbeddings.mockReturnValueOnce(
                [],
            );

            const thread = createMockThread({
                post: createMockPost({ topicEmbedding: [0.1, 0.2, 0.3] }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const overlapCheck = report.checks.find(
                (c) => c.name === "overlap_detection",
            );
            expect(overlapCheck?.passed).toBe(true);
        });

        it("should flag high similarity with recent posts", async () => {
            mockPersistenceService.getRecentTopicEmbeddings.mockReturnValueOnce(
                [{ id: "post_123", embedding: [0.9, 0.9, 0.9] }],
            );
            mockLLMService.cosineSimilarity.mockReturnValueOnce(0.85);

            const thread = createMockThread({
                post: createMockPost({ topicEmbedding: [0.9, 0.9, 0.9] }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const overlapCheck = report.checks.find(
                (c) => c.name === "overlap_detection",
            );
            expect(overlapCheck?.passed).toBe(false);
        });

        it("should pass when no topic embedding exists", async () => {
            const thread = createMockThread({
                post: createMockPost({ topicEmbedding: undefined }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const overlapCheck = report.checks.find(
                (c) => c.name === "overlap_detection",
            );
            expect(overlapCheck?.passed).toBe(true);
        });
    });

    describe("Format Validation Edge Cases", () => {
        it("should flag TODO and FIXME placeholders", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    body: "This is a test TODO: add more content here",
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const formatCheck = report.checks.find(
                (c) => c.name === "format_validation",
            );
            expect(formatCheck?.passed).toBe(false);
        });

        it("should allow legitimate markdown like [link]", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    body: "Check out this [link] for more information about presentations.",
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const formatCheck = report.checks.find(
                (c) => c.name === "format_validation",
            );
            expect(formatCheck?.passed).toBe(true);
        });

        it("should flag title that is too long", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    title: "A".repeat(250),
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const formatCheck = report.checks.find(
                (c) => c.name === "format_validation",
            );
            expect(formatCheck?.passed).toBe(false);
        });

        it("should flag very short comments", async () => {
            const thread = createMockThread({
                comments: [createMockComment({ text: "ok" })],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const formatCheck = report.checks.find(
                (c) => c.name === "format_validation",
            );
            expect(formatCheck?.passed).toBe(false);
        });
    });

    describe("Tone Consistency Edge Cases", () => {
        it("should detect emoji usage mismatch", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        personaId: "jordan_consults",
                        text: "This is great! 😊👍",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const toneCheck = report.checks.find(
                (c) => c.name === "tone_consistency",
            );
            expect(toneCheck?.score).toBeLessThan(1.0);
        });

        it("should detect formal language in informal persona", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        personaId: "emily_econ",
                        text: "Furthermore, I would like to state that this is consequently beneficial.",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const toneCheck = report.checks.find(
                (c) => c.name === "tone_consistency",
            );
            expect(toneCheck?.score).toBeLessThan(1.0);
        });

        it("should detect sentence length mismatch for short style", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        personaId: "emily_econ",
                        text: "This is an extraordinarily long sentence that goes on and on with many words and clauses that make it very lengthy indeed and probably exceeds what would be considered appropriate for someone who typically writes in short sentences.",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const toneCheck = report.checks.find(
                (c) => c.name === "tone_consistency",
            );
            expect(toneCheck?.score).toBeLessThan(1.0);
        });
    });

    describe("Conversation Flow Edge Cases", () => {
        it("should flag delay over 24 hours", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        delayMinutes: 1500,
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const flowCheck = report.checks.find(
                (c) => c.name === "conversation_flow",
            );
            expect(flowCheck?.score).toBeLessThan(1.0);
        });

        it("should flag invalid reply targets", async () => {
            const thread = createMockThread({
                comments: [
                    createMockComment({
                        replyTo: "invalid_target_123",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const flowCheck = report.checks.find(
                (c) => c.name === "conversation_flow",
            );
            expect(flowCheck?.score).toBeLessThan(1.0);
        });
    });

    describe("Heuristic Ad Check Edge Cases", () => {
        it("should detect superlative overuse", async () => {
            mockLLMService.generateJSON.mockResolvedValueOnce({
                success: false,
            });

            const thread = createMockThread({
                post: createMockPost({
                    body: "Slideforge is the best revolutionary game-changer! It's amazing, incredible, and perfect! Must-have best tool! Slideforge best amazing incredible perfect!",
                }),
                comments: [
                    createMockComment({
                        text: "Best tool ever! Amazing and incredible!",
                    }),
                ],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const adCheck = report.checks.find(
                (c) => c.name === "ad_detection",
            );
            expect(adCheck?.score).toBeLessThan(1.0);
            expect(adCheck?.passed).toBe(false);
        });

        it("should penalize lack of criticism when product is mentioned", async () => {
            mockLLMService.generateJSON.mockResolvedValueOnce({
                success: false,
            });

            const thread = createMockThread({
                post: createMockPost({
                    body: "Slideforge is great. Slideforge works well. I use Slideforge daily.",
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const adCheck = report.checks.find(
                (c) => c.name === "ad_detection",
            );
            expect(adCheck?.score).toBeLessThan(0.9);
        });
    });

    describe("Keyword Stuffing Edge Cases", () => {
        it("should handle empty content gracefully", async () => {
            const thread = createMockThread({
                post: createMockPost({ title: "", body: "" }),
                comments: [],
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const keywordCheck = report.checks.find(
                (c) => c.name === "keyword_stuffing",
            );
            expect(keywordCheck?.passed).toBe(true);
        });

        it("should flag repetitive two-word phrases", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    body: "presentation tool presentation tool presentation tool presentation tool presentation tool presentation tool",
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const keywordCheck = report.checks.find(
                (c) => c.name === "keyword_stuffing",
            );
            expect(keywordCheck?.score).toBeLessThan(0.8);
        });

        it("should ignore common words in density calculation", async () => {
            const thread = createMockThread({
                post: createMockPost({
                    body: "This is a test and this is good and this is what I think about this thing that I want to make work with this tool",
                }),
            });

            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            const keywordCheck = report.checks.find(
                (c) => c.name === "keyword_stuffing",
            );
            expect(keywordCheck?.passed).toBe(true);
        });
    });

    describe("Overall Scoring", () => {
        it("should weight ad_detection and tone_consistency higher", async () => {
            mockLLMService.generateJSON.mockResolvedValueOnce({
                success: true,
                data: {
                    adScore: 0.9,
                    naturalScore: 0.2,
                    consistencyScore: 0.2,
                    subtletyScore: 0.2,
                    balanceScore: 0.2,
                    overallScore: 30,
                    passed: false,
                    issues: ["Sounds like an ad"],
                    suggestions: [],
                },
            });

            const thread = createMockThread();
            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            expect(report.passed).toBe(false);
            const adCheck = report.checks.find(
                (c) => c.name === "ad_detection",
            );
            expect(adCheck?.passed).toBe(false);
        });

        it("should fail if critical checks fail even with good overall score", async () => {
            mockLLMService.generateJSON.mockResolvedValueOnce({
                success: true,
                data: {
                    adScore: 0.9,
                    naturalScore: 1.0,
                    consistencyScore: 1.0,
                    subtletyScore: 1.0,
                    balanceScore: 1.0,
                    overallScore: 80,
                    passed: false,
                    issues: [],
                    suggestions: [],
                },
            });

            const thread = createMockThread();
            const report = await service.evaluateThread(
                thread,
                "Slideforge",
                SLIDEFORGE_PERSONAS,
            );

            expect(report.passed).toBe(false);
        });
    });
});
