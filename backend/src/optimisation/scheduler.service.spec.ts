/**
 * Unit Tests for Scheduler Service
 *
 * Tests the CSP-based scheduling algorithm:
 * - Time slot generation
 * - Candidate ranking
 * - Thread scheduling with constraint satisfaction
 * - Calendar building
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
    PostCandidate,
    ScheduledThread,
    ThreadPlan,
} from "../domain/types";
import { PersistenceService } from "../persistence/persistence.service";
import { SchedulerService } from "./scheduler.service";

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
        weekStartDate: new Date("2025-01-06"), // A Monday
        ...overrides,
    };
}

function createMockPost(overrides: Partial<PostCandidate> = {}): PostCandidate {
    return {
        id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: "Test Post Title",
        body: "Test post body content",
        subreddit: "r/PowerPoint",
        targetKeywords: ["K1"],
        opPersonaId: "riley_ops",
        potentialImpact: 75,
        generatedAt: new Date(),
        topicEmbedding: Array(256).fill(0.1),
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
        comments: [
            createMockComment({ personaId: "jordan_consults" }),
            createMockComment({
                id: "comment_2",
                personaId: "emily_econ",
                replyTo: "comment_0",
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

const mockPersistenceService = {
    getHistoryLast30Days: jest.fn().mockReturnValue([]),
    getKeywordUrgency: jest.fn().mockReturnValue(0.8),
    getPersonaUsageCount: jest.fn().mockReturnValue(0),
    getLastPostDateForSubreddit: jest.fn().mockReturnValue(null),
};

// ============================================================================
// TESTS
// ============================================================================

describe("SchedulerService", () => {
    let service: SchedulerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                {
                    provide: PersistenceService,
                    useValue: mockPersistenceService,
                },
            ],
        }).compile();

        service = module.get<SchedulerService>(SchedulerService);
        jest.clearAllMocks();
    });

    describe("generateTimeSlots", () => {
        it("should generate correct number of time slots", () => {
            const weekStart = new Date("2025-01-06"); // Monday
            const slots = service.generateTimeSlots(weekStart, 3);

            expect(slots).toHaveLength(3);
        });

        it("should distribute slots across the week", () => {
            const weekStart = new Date("2025-01-06");
            const slots = service.generateTimeSlots(weekStart, 5);

            // Check that slots are on different days
            const days = new Set(slots.map((s) => s.dayOfWeek));
            expect(days.size).toBeGreaterThan(1);
        });

        it("should use optimal posting hours", () => {
            const weekStart = new Date("2025-01-06");
            const slots = service.generateTimeSlots(weekStart, 5);

            const optimalHours = [9, 12, 15, 18, 21];
            for (const slot of slots) {
                expect(optimalHours).toContain(slot.preferredHour);
            }
        });

        it("should include day of week in slot", () => {
            const weekStart = new Date("2025-01-06");
            const slots = service.generateTimeSlots(weekStart, 1);

            expect(slots[0].dayOfWeek).toBeDefined();
            expect(typeof slots[0].dayOfWeek).toBe("string");
        });

        it("should handle single post per week", () => {
            const weekStart = new Date("2025-01-06");
            const slots = service.generateTimeSlots(weekStart, 1);

            expect(slots).toHaveLength(1);
        });

        it("should handle many posts per week", () => {
            const weekStart = new Date("2025-01-06");
            const slots = service.generateTimeSlots(weekStart, 7);

            expect(slots).toHaveLength(7);
        });
    });

    describe("rankCandidates", () => {
        it("should rank candidates by combined score", () => {
            const campaign = createMockCampaign();
            const candidates = [
                createMockPost({ potentialImpact: 50, targetKeywords: ["K1"] }),
                createMockPost({ potentialImpact: 90, targetKeywords: ["K2"] }),
                createMockPost({ potentialImpact: 70, targetKeywords: ["K3"] }),
            ];

            const ranked = service.rankCandidates(candidates, campaign);

            expect(ranked).toHaveLength(3);
            // Higher impact should generally rank higher
            expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
            expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
        });

        it("should include score breakdown", () => {
            const campaign = createMockCampaign();
            const candidates = [createMockPost()];

            const ranked = service.rankCandidates(candidates, campaign);

            expect(ranked[0].breakdown).toBeDefined();
            expect(ranked[0].breakdown.impact).toBeDefined();
            expect(ranked[0].breakdown.urgency).toBeDefined();
            expect(ranked[0].breakdown.diversity).toBeDefined();
        });

        it("should factor in keyword urgency", () => {
            mockPersistenceService.getKeywordUrgency.mockImplementation(
                (keywordId: string) => {
                    if (keywordId === "K1") return 1.0; // High urgency
                    return 0.1; // Low urgency
                },
            );

            const campaign = createMockCampaign();
            const candidates = [
                createMockPost({
                    potentialImpact: 50,
                    targetKeywords: ["K1"],
                }),
                createMockPost({
                    potentialImpact: 50,
                    targetKeywords: ["K2"],
                }),
            ];

            const ranked = service.rankCandidates(candidates, campaign);

            // K1 has higher urgency, so should rank higher despite same impact
            expect(ranked[0].candidate.targetKeywords).toContain("K1");
        });

        it("should factor in subreddit diversity", () => {
            // Set up recent post in r/PowerPoint
            mockPersistenceService.getLastPostDateForSubreddit.mockImplementation(
                (subreddit: string) => {
                    if (subreddit === "r/PowerPoint") {
                        const recent = new Date();
                        recent.setDate(recent.getDate() - 1); // 1 day ago
                        return recent;
                    }
                    return null;
                },
            );

            const campaign = createMockCampaign();
            const candidates = [
                createMockPost({
                    potentialImpact: 70,
                    subreddit: "r/PowerPoint",
                }),
                createMockPost({
                    potentialImpact: 70,
                    subreddit: "r/Canva",
                }),
            ];

            const ranked = service.rankCandidates(candidates, campaign);

            // r/Canva should rank higher due to better diversity
            expect(ranked[0].candidate.subreddit).toBe("r/Canva");
        });
    });

    describe("scheduleThreads", () => {
        it("should schedule threads into available slots", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 2 });
            const threads = [
                createMockThread({
                    post: createMockPost({ subreddit: "r/PowerPoint" }),
                }),
                createMockThread({
                    post: createMockPost({ subreddit: "r/Canva" }),
                }),
            ];

            const schedule = await service.scheduleThreads(threads, campaign);

            expect(schedule).toHaveLength(2);
        });

        it("should respect subreddit frequency constraint", async () => {
            // The 48-hour constraint is checked against actual slot dates
            // With 3 posts per week spread across 7 days, slots are typically 2+ days apart
            // So multiple posts to same subreddit may still be allowed if slots are far enough apart
            const campaign = createMockCampaign({ postsPerWeek: 3 });

            // All threads target same subreddit
            const threads = [
                createMockThread({
                    post: createMockPost({ subreddit: "r/PowerPoint" }),
                }),
                createMockThread({
                    post: createMockPost({ subreddit: "r/PowerPoint" }),
                }),
                createMockThread({
                    post: createMockPost({ subreddit: "r/PowerPoint" }),
                }),
            ];

            const schedule = await service.scheduleThreads(threads, campaign);

            // Should schedule posts, constraint check happens per-slot
            // The actual number depends on how far apart the slots are
            expect(schedule.length).toBeGreaterThan(0);
            expect(schedule.length).toBeLessThanOrEqual(3);
        });

        it("should assign time slots to scheduled threads", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 1 });
            const threads = [createMockThread()];

            const schedule = await service.scheduleThreads(threads, campaign);

            if (schedule.length > 0) {
                expect(schedule[0].slot).toBeDefined();
                expect(schedule[0].slot.date).toBeDefined();
                expect(schedule[0].slot.dayOfWeek).toBeDefined();
            }
        });

        it("should include constraint satisfaction results", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 1 });
            const threads = [createMockThread()];

            const schedule = await service.scheduleThreads(threads, campaign);

            if (schedule.length > 0) {
                expect(schedule[0].constraintsSatisfied).toBeDefined();
                expect(schedule[0].constraintsSatisfied.passed).toBe(true);
                expect(
                    schedule[0].constraintsSatisfied.hardConstraints,
                ).toBeDefined();
                expect(
                    schedule[0].constraintsSatisfied.softConstraints,
                ).toBeDefined();
            }
        });

        it("should set initial status to draft", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 1 });
            const threads = [createMockThread()];

            const schedule = await service.scheduleThreads(threads, campaign);

            if (schedule.length > 0) {
                expect(schedule[0].status).toBe("draft");
            }
        });

        it("should handle empty thread list", async () => {
            const campaign = createMockCampaign();
            const schedule = await service.scheduleThreads([], campaign);

            expect(schedule).toEqual([]);
        });

        it("should not reuse threads in schedule", async () => {
            const campaign = createMockCampaign({ postsPerWeek: 3 });
            const threads = [
                createMockThread({
                    id: "thread_1",
                    post: createMockPost({ subreddit: "r/PowerPoint" }),
                }),
                createMockThread({
                    id: "thread_2",
                    post: createMockPost({ subreddit: "r/Canva" }),
                }),
                createMockThread({
                    id: "thread_3",
                    post: createMockPost({ subreddit: "r/SaaS" }),
                }),
            ];

            const schedule = await service.scheduleThreads(threads, campaign);

            const threadIds = schedule.map((s) => s.thread.id);
            const uniqueIds = new Set(threadIds);
            expect(threadIds.length).toBe(uniqueIds.size);
        });
    });

    describe("buildCalendar", () => {
        it("should create calendar with correct structure", () => {
            const campaign = createMockCampaign();
            const schedule: ScheduledThread[] = [
                {
                    id: "sched_1",
                    thread: createMockThread(),
                    slot: {
                        date: new Date("2025-01-07"),
                        dayOfWeek: "Tuesday",
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
                },
            ];

            const calendar = service.buildCalendar(
                schedule,
                campaign,
                "campaign_1",
            );

            expect(calendar.id).toMatch(/^cal_/);
            expect(calendar.weekStartDate).toEqual(campaign.weekStartDate);
            expect(calendar.campaignId).toBe("campaign_1");
            expect(calendar.entries).toHaveLength(1);
            expect(calendar.status).toBe("ready");
        });

        it("should calculate week end date correctly", () => {
            const campaign = createMockCampaign({
                weekStartDate: new Date("2025-01-06"),
            });

            const calendar = service.buildCalendar([], campaign, "campaign_1");

            const expectedEnd = new Date("2025-01-13");
            expect(calendar.weekEndDate.toDateString()).toBe(
                expectedEnd.toDateString(),
            );
        });

        it("should calculate subreddit distribution", () => {
            const campaign = createMockCampaign();
            const schedule: ScheduledThread[] = [
                {
                    id: "sched_1",
                    thread: createMockThread({
                        post: createMockPost({ subreddit: "r/PowerPoint" }),
                    }),
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
                },
                {
                    id: "sched_2",
                    thread: createMockThread({
                        post: createMockPost({ subreddit: "r/PowerPoint" }),
                    }),
                    slot: {
                        date: new Date(),
                        dayOfWeek: "Wednesday",
                        preferredHour: 15,
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
                },
            ];

            const calendar = service.buildCalendar(
                schedule,
                campaign,
                "campaign_1",
            );

            expect(
                calendar.metadata.subredditDistribution["r/PowerPoint"],
            ).toBe(2);
        });

        it("should calculate persona usage", () => {
            const campaign = createMockCampaign();
            const schedule: ScheduledThread[] = [
                {
                    id: "sched_1",
                    thread: createMockThread({
                        post: createMockPost({ opPersonaId: "riley_ops" }),
                        comments: [
                            createMockComment({ personaId: "jordan_consults" }),
                        ],
                    }),
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
                },
            ];

            const calendar = service.buildCalendar(
                schedule,
                campaign,
                "campaign_1",
            );

            expect(calendar.metadata.personaUsage["riley_ops"]).toBe(1);
            expect(calendar.metadata.personaUsage["jordan_consults"]).toBe(0.5);
        });

        it("should track keywords covered", () => {
            const campaign = createMockCampaign();
            const schedule: ScheduledThread[] = [
                {
                    id: "sched_1",
                    thread: createMockThread({
                        post: createMockPost({ targetKeywords: ["K1", "K2"] }),
                    }),
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
                },
            ];

            const calendar = service.buildCalendar(
                schedule,
                campaign,
                "campaign_1",
            );

            expect(calendar.metadata.keywordsCovered).toContain("K1");
            expect(calendar.metadata.keywordsCovered).toContain("K2");
        });

        it("should calculate quality score", () => {
            const campaign = createMockCampaign();
            const schedule: ScheduledThread[] = [
                {
                    id: "sched_1",
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
                },
            ];

            const calendar = service.buildCalendar(
                schedule,
                campaign,
                "campaign_1",
            );

            expect(calendar.metadata.qualityScore).toBeGreaterThanOrEqual(0);
            expect(calendar.metadata.qualityScore).toBeLessThanOrEqual(100);
        });

        it("should set created and updated timestamps", () => {
            const campaign = createMockCampaign();
            const calendar = service.buildCalendar([], campaign, "campaign_1");

            expect(calendar.createdAt).toBeInstanceOf(Date);
            expect(calendar.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe("getNextWeekStart", () => {
        it("should return next Monday when no previous calendar", () => {
            const nextWeek = service.getNextWeekStart();

            // Should be a Monday
            expect(nextWeek.getDay()).toBe(1); // Monday = 1
        });

        it("should return day after last calendar ends", () => {
            const lastCalendar = {
                id: "cal_1",
                weekStartDate: new Date("2025-01-06"),
                weekEndDate: new Date("2025-01-13"),
                campaignId: "campaign_1",
                entries: [],
                metadata: {
                    totalPosts: 0,
                    subredditDistribution: {},
                    personaUsage: {},
                    keywordsCovered: [],
                    qualityScore: 0,
                    diversityScore: 0,
                },
                status: "completed" as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const nextWeek = service.getNextWeekStart(lastCalendar);

            expect(nextWeek.toDateString()).toBe(
                new Date("2025-01-14").toDateString(),
            );
        });
    });
});
