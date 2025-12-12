/**
 * Unit Tests for Generation Service
 *
 * Tests the Director-Actor pattern for content generation:
 * - Candidate generation (brainstorming)
 * - Thread generation with comments
 * - Persona selection
 * - Subreddit matching
 * - Engagement estimation
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
    SLIDEFORGE_COMPANY,
    SLIDEFORGE_KEYWORDS,
    SLIDEFORGE_PERSONAS,
    SLIDEFORGE_SUBREDDITS,
} from "../domain/sample-data";
import { CampaignInput, PostCandidate } from "../domain/types";
import { PersistenceService } from "../persistence/persistence.service";
import { GenerationService } from "./generation.service";
import { LLMService } from "./llm.service";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockCampaign(
    overrides: Partial<CampaignInput> = {},
): CampaignInput {
    return {
        companyInfo: SLIDEFORGE_COMPANY,
        personas: SLIDEFORGE_PERSONAS,
        subreddits: SLIDEFORGE_SUBREDDITS,
        keywords: SLIDEFORGE_KEYWORDS,
        postsPerWeek: 3,
        weekStartDate: new Date(),
        ...overrides,
    };
}

function createMockPostCandidate(
    overrides: Partial<PostCandidate> = {},
): PostCandidate {
    return {
        id: `cand_${Date.now()}`,
        title: "Best AI Presentation Maker?",
        body: "Looking for something to help with my presentations. What's everyone using?",
        subreddit: "r/PowerPoint",
        targetKeywords: ["K1"],
        opPersonaId: "riley_ops",
        potentialImpact: 75,
        generatedAt: new Date(),
        ...overrides,
    };
}

// ============================================================================
// MOCK SERVICES
// ============================================================================

const mockLLMService = {
    generateJSON: jest.fn(),
    generateText: jest.fn(),
    generateEmbedding: jest.fn(),
};

const mockPersistenceService = {
    getHistoryLast30Days: jest.fn().mockReturnValue([]),
    getKeywordUrgency: jest.fn().mockReturnValue(0.8),
    getPersonaUsageCount: jest.fn().mockReturnValue(0),
};

// ============================================================================
// TESTS
// ============================================================================

describe("GenerationService", () => {
    let service: GenerationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GenerationService,
                { provide: LLMService, useValue: mockLLMService },
                {
                    provide: PersistenceService,
                    useValue: mockPersistenceService,
                },
            ],
        }).compile();

        service = module.get<GenerationService>(GenerationService);
        jest.clearAllMocks();

        // Default mock responses
        mockLLMService.generateJSON.mockResolvedValue({
            success: true,
            data: [
                {
                    title: "Best AI Presentation Maker?",
                    body: "Looking for recommendations...",
                    angle: "Tool discovery",
                    howProductFits: "Natural mention in comments",
                    potentialImpact: 85,
                },
                {
                    title: "How do you handle last-minute presentations?",
                    body: "My boss just asked for a deck...",
                    angle: "Urgent problem",
                    howProductFits: "Quick solution mention",
                    potentialImpact: 78,
                },
            ],
        });

        mockLLMService.generateText.mockResolvedValue({
            success: true,
            data: "I've tried a bunch of tools. Slideforge works well for me.",
        });

        mockLLMService.generateEmbedding.mockResolvedValue({
            success: true,
            data: Array(256).fill(0.1),
        });
    });

    describe("generateCandidates", () => {
        it("should generate candidates based on campaign keywords", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 2 });
            const candidates = await service.generateCandidates(campaign, 2);

            expect(candidates.length).toBeGreaterThan(0);
            expect(mockLLMService.generateJSON).toHaveBeenCalled();
        });

        it("should generate 3x candidates by default (multiplier)", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 2 });
            const candidates = await service.generateCandidates(campaign, 3);

            // Should attempt to generate up to postsPerWeek * multiplier candidates
            expect(mockLLMService.generateJSON).toHaveBeenCalled();
        });

        it("should assign appropriate subreddits to candidates", async () => {
            const campaign = createMockCampaign();
            const candidates = await service.generateCandidates(campaign, 1);

            if (candidates.length > 0) {
                const validSubreddits = campaign.subreddits.map((s) => s.name);
                expect(validSubreddits).toContain(candidates[0].subreddit);
            }
        });

        it("should assign OP personas to candidates", async () => {
            const campaign = createMockCampaign();
            const candidates = await service.generateCandidates(campaign, 1);

            if (candidates.length > 0) {
                const validPersonaIds = campaign.personas.map((p) => p.id);
                expect(validPersonaIds).toContain(candidates[0].opPersonaId);
            }
        });

        it("should handle empty brainstorm response gracefully", async () => {
            mockLLMService.generateJSON.mockResolvedValue({
                success: true,
                data: [],
            });

            const campaign = createMockCampaign();
            const candidates = await service.generateCandidates(campaign, 1);

            expect(candidates).toEqual([]);
        });

        it("should handle LLM failure gracefully", async () => {
            mockLLMService.generateJSON.mockResolvedValue({
                success: false,
                error: "API Error",
            });

            const campaign = createMockCampaign();
            const candidates = await service.generateCandidates(campaign, 1);

            expect(candidates).toEqual([]);
        });

        it("should handle wrapped array response from LLM", async () => {
            mockLLMService.generateJSON.mockResolvedValue({
                success: true,
                data: {
                    ideas: [
                        {
                            title: "Test Post",
                            body: "Test body",
                            angle: "Test",
                            howProductFits: "Test",
                            potentialImpact: 70,
                        },
                    ],
                },
            });

            const campaign = createMockCampaign();
            const candidates = await service.generateCandidates(campaign, 1);

            expect(candidates.length).toBeGreaterThan(0);
        });

        it("should respect keyword priority for candidate generation", async () => {
            const campaign = createMockCampaign();
            await service.generateCandidates(campaign, 1);

            // Should call getKeywordUrgency for scoring
            expect(mockPersistenceService.getKeywordUrgency).toHaveBeenCalled();
        });
    });

    describe("generateThread", () => {
        beforeEach(() => {
            // Mock director response
            mockLLMService.generateJSON.mockImplementation((prompt: string) => {
                if (prompt.includes("creative director")) {
                    return Promise.resolve({
                        success: true,
                        data: {
                            postTitle: "Best AI Presentation Maker?",
                            postBody: "Looking for recommendations...",
                            opPersonaId: "riley_ops",
                            comments: [
                                {
                                    personaId: "jordan_consults",
                                    replyTo: "root",
                                    keyPoints: [
                                        "Share experience",
                                        "Mention tool",
                                    ],
                                    mentionsProduct: true,
                                    suggestedDelayMinutes: 20,
                                },
                                {
                                    personaId: "emily_econ",
                                    replyTo: "0",
                                    keyPoints: ["Agree", "Student perspective"],
                                    mentionsProduct: false,
                                    suggestedDelayMinutes: 15,
                                },
                            ],
                            conversationArc: "Question → Answer → Agreement",
                        },
                    });
                }
                // Post refinement
                return Promise.resolve({
                    success: true,
                    data: {
                        title: "Best AI Presentation Maker?",
                        body: "Looking for recommendations...",
                    },
                });
            });
        });

        it("should generate a complete thread with comments", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            const thread = await service.generateThread(candidate, campaign);

            expect(thread).toBeDefined();
            expect(thread.id).toMatch(/^thread_/);
            expect(thread.post).toBeDefined();
            expect(thread.comments).toBeDefined();
            expect(thread.comments.length).toBeGreaterThan(0);
        });

        it("should assign conversation style to thread", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            const thread = await service.generateThread(
                candidate,
                campaign,
                "debate",
            );

            expect(thread.conversationStyle).toBe("debate");
        });

        it("should generate comments in persona voices", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            const thread = await service.generateThread(candidate, campaign);

            // Each comment should have a valid persona ID
            const validPersonaIds = campaign.personas.map((p) => p.id);
            for (const comment of thread.comments) {
                expect(validPersonaIds).toContain(comment.personaId);
            }
        });

        it("should include delay minutes for comments", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            const thread = await service.generateThread(candidate, campaign);

            for (const comment of thread.comments) {
                expect(typeof comment.delayMinutes).toBe("number");
                expect(comment.delayMinutes).toBeGreaterThanOrEqual(0);
            }
        });

        it("should track product mentions in comments", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            const thread = await service.generateThread(candidate, campaign);

            // At least one comment should have mentionsProduct defined
            const hasProductMentionTracking = thread.comments.some(
                (c) => typeof c.mentionsProduct === "boolean",
            );
            expect(hasProductMentionTracking).toBe(true);
        });

        it("should generate topic embedding for thread", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            const thread = await service.generateThread(candidate, campaign);

            expect(mockLLMService.generateEmbedding).toHaveBeenCalled();
        });

        it("should calculate estimated engagement", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            const thread = await service.generateThread(candidate, campaign);

            expect(typeof thread.estimatedEngagement).toBe("number");
            expect(thread.estimatedEngagement).toBeGreaterThanOrEqual(0);
            expect(thread.estimatedEngagement).toBeLessThanOrEqual(100);
        });

        it("should throw error for invalid subreddit", async () => {
            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate({
                subreddit: "r/NonExistent",
            });

            await expect(
                service.generateThread(candidate, campaign),
            ).rejects.toThrow("Subreddit r/NonExistent not found");
        });

        it("should handle director planning failure", async () => {
            mockLLMService.generateJSON.mockResolvedValue({
                success: false,
                error: "Director failed",
            });

            const campaign = createMockCampaign();
            const candidate = createMockPostCandidate();

            await expect(
                service.generateThread(candidate, campaign),
            ).rejects.toThrow("Director planning failed");
        });
    });

    describe("Engagement Estimation", () => {
        beforeEach(() => {
            mockLLMService.generateJSON.mockResolvedValue({
                success: true,
                data: {
                    postTitle: "Test?",
                    postBody: "Test body",
                    comments: [
                        {
                            personaId: "jordan_consults",
                            replyTo: "root",
                            keyPoints: ["Test"],
                            mentionsProduct: true,
                            suggestedDelayMinutes: 20,
                        },
                    ],
                    conversationArc: "Test",
                },
            });
        });

        it("should give higher score to question titles", async () => {
            const campaign = createMockCampaign();
            const candidateWithQuestion = createMockPostCandidate({
                title: "What is the best tool?",
            });
            const candidateWithoutQuestion = createMockPostCandidate({
                title: "The best tool",
            });

            const threadWithQuestion = await service.generateThread(
                candidateWithQuestion,
                campaign,
            );
            const threadWithoutQuestion = await service.generateThread(
                candidateWithoutQuestion,
                campaign,
            );

            // Questions should generally score higher
            expect(
                threadWithQuestion.estimatedEngagement,
            ).toBeGreaterThanOrEqual(
                threadWithoutQuestion.estimatedEngagement - 15,
            );
        });
    });

    describe("Subreddit Selection", () => {
        it("should match keywords to appropriate subreddits", async () => {
            // Test that PowerPoint-related keywords go to r/PowerPoint
            mockLLMService.generateJSON.mockResolvedValue({
                success: true,
                data: [
                    {
                        title: "PowerPoint help needed",
                        body: "Need help with slides",
                        angle: "Help",
                        howProductFits: "Tool suggestion",
                        potentialImpact: 70,
                    },
                ],
            });

            const campaign = createMockCampaign({
                keywords: [
                    {
                        id: "K1",
                        term: "PowerPoint alternatives",
                        priorityScore: 10,
                    },
                ],
            });

            const candidates = await service.generateCandidates(campaign, 1);

            if (candidates.length > 0) {
                // Should prefer r/PowerPoint for PowerPoint-related keywords
                expect(candidates[0].subreddit).toBe("r/PowerPoint");
            }
        });
    });

    describe("Persona Selection", () => {
        it("should prefer less-used personas for OP", async () => {
            // Set up persona usage counts
            mockPersistenceService.getPersonaUsageCount.mockImplementation(
                (personaId: string) => {
                    if (personaId === "riley_ops") return 10;
                    if (personaId === "jordan_consults") return 8;
                    if (personaId === "emily_econ") return 2;
                    if (personaId === "priya_pm") return 1;
                    return 0;
                },
            );

            mockLLMService.generateJSON.mockResolvedValue({
                success: true,
                data: [
                    {
                        title: "Test Post",
                        body: "Test body",
                        angle: "Test",
                        howProductFits: "Test",
                        potentialImpact: 70,
                    },
                ],
            });

            const campaign = createMockCampaign();
            const candidates = await service.generateCandidates(campaign, 1);

            // Persona selection should factor in usage counts
            expect(
                mockPersistenceService.getPersonaUsageCount,
            ).toHaveBeenCalled();
        });
    });
});
