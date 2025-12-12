/**
 * Unit Tests for Calendar Service
 *
 * Tests the main orchestration layer:
 * - Calendar generation pipeline
 * - Approval workflow
 * - Entry regeneration
 * - Status management
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
    SLIDEFORGE_COMPANY,
    SLIDEFORGE_KEYWORDS,
    SLIDEFORGE_PERSONAS,
    SLIDEFORGE_SUBREDDITS,
} from "../domain/sample-data";
import {
    CampaignInput,
    CommentPlan,
    ContentCalendar,
    PostCandidate,
    QualityReport,
    ScheduledThread,
    ThreadPlan,
} from "../domain/types";
import { GenerationService } from "../generation/generation.service";
import { SchedulerService } from "../optimisation/scheduler.service";
import { PersistenceService } from "../persistence/persistence.service";
import { QualityService } from "../quality/quality.service";
import { CalendarService } from "./calendar.service";

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
        weekStartDate: new Date("2025-01-06"),
        ...overrides,
    };
}

function createMockPost(overrides: Partial<PostCandidate> = {}): PostCandidate {
    return {
        id: `post_${Date.now()}`,
        title: "Test Post Title",
        body: "Test post body content",
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
        id: `comment_${Date.now()}`,
        personaId: "jordan_consults",
        text: "This is a test comment",
        replyTo: "root",
        delayMinutes: 20,
        mentionsProduct: false,
        subtletyScore: 0.8,
        ...overrides,
    };
}

function createMockThread(overrides: Partial<ThreadPlan> = {}): ThreadPlan {
    return {
        id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        post: createMockPost(),
        comments: [createMockComment()],
        conversationStyle: "question-answer",
        estimatedEngagement: 70,
        ...overrides,
    };
}

function createMockScheduledThread(
    overrides: Partial<ScheduledThread> = {},
): ScheduledThread {
    return {
        id: `sched_${Date.now()}`,
        thread: createMockThread(),
        slot: {
            date: new Date(),
            dayOfWeek: "Monday",
            preferredHour: 12,
        },
        status: "draft",
        constraintsSatisfied: {
            passed: true,
            hardConstraints: {
                subredditFrequency: true,
                personaNoSelfReply: true,
                weeklyLimit: true,
            },
            softConstraints: {
                topicDiversity: 0.8,
                personaDistribution: 0.7,
                keywordCoverage: 0.9,
            },
            warnings: [],
        },
        ...overrides,
    };
}

function createMockCalendar(
    overrides: Partial<ContentCalendar> = {},
): ContentCalendar {
    return {
        id: `cal_${Date.now()}`,
        weekStartDate: new Date("2025-01-06"),
        weekEndDate: new Date("2025-01-13"),
        campaignId: "campaign_1",
        entries: [createMockScheduledThread()],
        metadata: {
            totalPosts: 1,
            subredditDistribution: { "r/PowerPoint": 1 },
            personaUsage: { riley_ops: 1 },
            keywordsCovered: ["K1"],
            qualityScore: 80,
            diversityScore: 70,
        },
        status: "ready",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function createMockQualityReport(
    overrides: Partial<QualityReport> = {},
): QualityReport {
    return {
        threadId: "thread_1",
        overallScore: 75,
        checks: [
            {
                name: "ad_detection",
                passed: true,
                score: 0.8,
                details: "Passed",
            },
            {
                name: "format_validation",
                passed: true,
                score: 1.0,
                details: "Passed",
            },
        ],
        passed: true,
        recommendations: [],
        ...overrides,
    };
}

// ============================================================================
// MOCK SERVICES
// ============================================================================

const mockGenerationService = {
    generateCandidates: jest.fn(),
    generateThread: jest.fn(),
};

const mockSchedulerService = {
    rankCandidates: jest.fn(),
    scheduleThreads: jest.fn(),
    buildCalendar: jest.fn(),
    getNextWeekStart: jest.fn(),
};

const mockQualityService = {
    evaluateThread: jest.fn(),
};

const mockPersistenceService = {
    saveCampaign: jest.fn(),
    saveCalendar: jest.fn(),
    getLatestCalendar: jest.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe("CalendarService", () => {
    let service: CalendarService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarService,
                { provide: GenerationService, useValue: mockGenerationService },
                { provide: SchedulerService, useValue: mockSchedulerService },
                { provide: QualityService, useValue: mockQualityService },
                {
                    provide: PersistenceService,
                    useValue: mockPersistenceService,
                },
            ],
        }).compile();

        service = module.get<CalendarService>(CalendarService);
        jest.clearAllMocks();

        // Default mock implementations
        const mockCandidates = [
            createMockPost({ id: "cand_1" }),
            createMockPost({ id: "cand_2" }),
            createMockPost({ id: "cand_3" }),
        ];

        mockGenerationService.generateCandidates.mockResolvedValue(
            mockCandidates,
        );

        // rankCandidates returns scored candidates
        mockSchedulerService.rankCandidates.mockImplementation((candidates) =>
            candidates.map((c: PostCandidate) => ({
                candidate: c,
                score: 0.8,
                breakdown: { impact: 0.8, urgency: 0.8, diversity: 0.8 },
            })),
        );

        mockGenerationService.generateThread.mockResolvedValue(
            createMockThread(),
        );

        mockQualityService.evaluateThread.mockResolvedValue(
            createMockQualityReport(),
        );

        mockSchedulerService.scheduleThreads.mockResolvedValue([
            createMockScheduledThread(),
        ]);

        mockSchedulerService.buildCalendar.mockReturnValue(
            createMockCalendar(),
        );
    });

    describe("generateCalendar", () => {
        it("should generate a complete calendar", async () => {
            const campaign = createMockCampaign();
            const result = await service.generateCalendar(campaign);

            expect(result.success).toBe(true);
            expect(result.calendar).toBeDefined();
        });

        it("should save campaign before generation", async () => {
            const campaign = createMockCampaign();
            await service.generateCalendar(campaign, "test_campaign");

            expect(mockPersistenceService.saveCampaign).toHaveBeenCalledWith(
                "test_campaign",
                campaign,
            );
        });

        it("should generate candidates with 2x multiplier", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 2 });
            await service.generateCalendar(campaign);

            expect(
                mockGenerationService.generateCandidates,
            ).toHaveBeenCalledWith(campaign, 2);
        });

        it("should return error when no candidates generated", async () => {
            mockGenerationService.generateCandidates.mockResolvedValue([]);

            const campaign = createMockCampaign();
            const result = await service.generateCalendar(campaign);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(
                "Failed to generate any candidate posts",
            );
        });

        it("should generate threads for candidates", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 2 });
            await service.generateCalendar(campaign);

            expect(mockGenerationService.generateThread).toHaveBeenCalled();
        });

        it("should run quality checks on threads", async () => {
            const campaign = createMockCampaign();
            await service.generateCalendar(campaign);

            expect(mockQualityService.evaluateThread).toHaveBeenCalled();
        });

        it("should filter out threads that fail quality checks", async () => {
            mockQualityService.evaluateThread.mockResolvedValueOnce(
                createMockQualityReport({ passed: false, overallScore: 30 }),
            );
            mockQualityService.evaluateThread.mockResolvedValue(
                createMockQualityReport({ passed: true }),
            );

            const campaign = createMockCampaign();
            await service.generateCalendar(campaign);

            // Should still attempt scheduling with passing threads
            expect(mockSchedulerService.scheduleThreads).toHaveBeenCalled();
        });

        it("should use best failing threads if not enough pass quality", async () => {
            // All threads fail quality but with different scores
            mockQualityService.evaluateThread
                .mockResolvedValueOnce(
                    createMockQualityReport({
                        passed: false,
                        overallScore: 45,
                    }),
                )
                .mockResolvedValueOnce(
                    createMockQualityReport({
                        passed: false,
                        overallScore: 40,
                    }),
                )
                .mockResolvedValueOnce(
                    createMockQualityReport({
                        passed: false,
                        overallScore: 35,
                    }),
                );

            const campaign = createMockCampaign({ postsPerWeek: 2 });
            const result = await service.generateCalendar(campaign);

            // Should include warnings about using below-threshold threads
            expect(
                result.warnings?.some((w) => w.includes("below-threshold")),
            ).toBe(true);
        });

        it("should return error when scheduler fails", async () => {
            mockSchedulerService.scheduleThreads.mockResolvedValue([]);

            const campaign = createMockCampaign();
            const result = await service.generateCalendar(campaign);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(
                "Scheduler could not create any valid schedule",
            );
        });

        it("should save calendar after successful generation", async () => {
            const campaign = createMockCampaign();
            await service.generateCalendar(campaign);

            expect(mockPersistenceService.saveCalendar).toHaveBeenCalled();
        });

        it("should include generation time in response", async () => {
            const campaign = createMockCampaign();
            const result = await service.generateCalendar(campaign);

            expect(result.generationTimeMs).toBeDefined();
            expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
        });

        it("should handle errors gracefully", async () => {
            mockGenerationService.generateCandidates.mockRejectedValue(
                new Error("API Error"),
            );

            const campaign = createMockCampaign();
            const result = await service.generateCalendar(campaign);

            expect(result.success).toBe(false);
            expect(result.errors).toContain("API Error");
        });
    });

    describe("generateNextWeek", () => {
        it("should get next week start from last calendar", async () => {
            mockPersistenceService.getLatestCalendar.mockReturnValue(
                createMockCalendar(),
            );
            mockSchedulerService.getNextWeekStart.mockReturnValue(
                new Date("2025-01-13"),
            );

            const campaign = createMockCampaign();
            await service.generateNextWeek(campaign);

            expect(mockSchedulerService.getNextWeekStart).toHaveBeenCalled();
        });
    });
});
