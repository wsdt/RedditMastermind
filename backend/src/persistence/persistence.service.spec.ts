/**
 * Unit Tests for Persistence Service
 *
 * Tests the in-memory data store:
 * - Calendar save and retrieval operations
 * - History tracking
 * - Usage tracking (keywords, personas, subreddits)
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
    ScheduledThread,
    ThreadPlan,
} from "../domain/types";
import { PersistenceService } from "./persistence.service";

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
        id: `thread_${Date.now()}`,
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
        id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
        id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

// ============================================================================
// TESTS
// ============================================================================

describe("PersistenceService", () => {
    let service: PersistenceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PersistenceService],
        }).compile();

        service = module.get<PersistenceService>(PersistenceService);
    });

    describe("Calendar Operations", () => {
        describe("saveCalendar", () => {
            it("should save a calendar and retrieve it via getLatestCalendar", () => {
                const calendar = createMockCalendar({ id: "cal_1" });
                service.saveCalendar(calendar);

                const retrieved = service.getLatestCalendar();
                expect(retrieved).toEqual(calendar);
            });

            it("should track keyword usage from calendar entries", () => {
                // Use a weekStartDate in the past so urgency calculation works
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

                const calendar = createMockCalendar({
                    weekStartDate: pastDate,
                    entries: [
                        createMockScheduledThread({
                            thread: createMockThread({
                                post: createMockPost({
                                    targetKeywords: ["K1", "K2"],
                                }),
                            }),
                        }),
                    ],
                });

                service.saveCalendar(calendar);

                // Keywords should now have usage tracked
                const urgencyK1 = service.getKeywordUrgency("K1");
                const urgencyK2 = service.getKeywordUrgency("K2");

                // After being used 7 days ago, urgency should be around 0.5 (7/14 days)
                expect(urgencyK1).toBeLessThan(1.0);
                expect(urgencyK2).toBeLessThan(1.0);
            });

            it("should track persona usage from calendar entries", () => {
                // Use current date for weekStartDate so it's within the 30-day window
                const calendar = createMockCalendar({
                    weekStartDate: new Date(),
                    entries: [
                        createMockScheduledThread({
                            thread: createMockThread({
                                post: createMockPost({
                                    opPersonaId: "riley_ops",
                                }),
                                comments: [
                                    createMockComment({
                                        personaId: "jordan_consults",
                                    }),
                                ],
                            }),
                        }),
                    ],
                });

                service.saveCalendar(calendar);

                const rileyUsage = service.getPersonaUsageCount(
                    "riley_ops",
                    30,
                );
                const jordanUsage = service.getPersonaUsageCount(
                    "jordan_consults",
                    30,
                );

                expect(rileyUsage).toBe(1);
                expect(jordanUsage).toBe(1);
            });
        });

        describe("getLatestCalendar", () => {
            it("should return most recent calendar", () => {
                const calendar1 = createMockCalendar({
                    id: "cal_1",
                    createdAt: new Date("2025-01-01"),
                });
                const calendar2 = createMockCalendar({
                    id: "cal_2",
                    createdAt: new Date("2025-01-05"),
                });

                service.saveCalendar(calendar1);
                service.saveCalendar(calendar2);

                const latest = service.getLatestCalendar();

                expect(latest?.id).toBe("cal_2");
            });

            it("should return undefined when no calendars", () => {
                const latest = service.getLatestCalendar();
                expect(latest).toBeUndefined();
            });
        });
    });

    describe("History Operations", () => {
        describe("getHistoryLast30Days", () => {
            it("should return empty array when no history", () => {
                const recent = service.getHistoryLast30Days();
                expect(recent).toHaveLength(0);
            });
        });
    });

    describe("Usage Tracking", () => {
        describe("getKeywordUrgency", () => {
            it("should return 1.0 for never-used keywords", () => {
                const urgency = service.getKeywordUrgency("K_never_used");
                expect(urgency).toBe(1.0);
            });

            it("should return lower urgency for recently used keywords", () => {
                // Save a calendar with keyword K1, using a date 7 days ago
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 7);

                const calendar = createMockCalendar({
                    weekStartDate: pastDate,
                    entries: [
                        createMockScheduledThread({
                            thread: createMockThread({
                                post: createMockPost({
                                    targetKeywords: ["K1"],
                                }),
                            }),
                        }),
                    ],
                });
                service.saveCalendar(calendar);

                const urgency = service.getKeywordUrgency("K1");
                // 7 days ago should give urgency of about 0.5 (7/14)
                expect(urgency).toBeLessThan(1.0);
                expect(urgency).toBeGreaterThan(0);
            });
        });

        describe("getPersonaUsageCount", () => {
            it("should return 0 for unused personas", () => {
                const count = service.getPersonaUsageCount(
                    "unused_persona",
                    30,
                );
                expect(count).toBe(0);
            });

            it("should count persona usage within time window", () => {
                // Use current date for weekStartDate so it's within the 30-day window
                const calendar = createMockCalendar({
                    weekStartDate: new Date(),
                    entries: [
                        createMockScheduledThread({
                            thread: createMockThread({
                                post: createMockPost({
                                    opPersonaId: "riley_ops",
                                }),
                            }),
                        }),
                    ],
                });
                service.saveCalendar(calendar);

                const count = service.getPersonaUsageCount("riley_ops", 30);
                expect(count).toBe(1);
            });
        });

        describe("getLastPostDateForSubreddit", () => {
            it("should return null for never-posted subreddit", () => {
                const lastPost =
                    service.getLastPostDateForSubreddit("r/NeverPosted");
                expect(lastPost).toBeNull();
            });
        });

        describe("getRecentTopicEmbeddings", () => {
            it("should return empty array when no history", () => {
                const embeddings = service.getRecentTopicEmbeddings(30);
                expect(embeddings).toHaveLength(0);
            });
        });
    });

    describe("Campaign Operations", () => {
        describe("saveCampaign", () => {
            it("should save campaign without error", () => {
                const campaign = createMockCampaign();
                expect(() =>
                    service.saveCampaign("campaign_1", campaign),
                ).not.toThrow();
            });
        });
    });
});
