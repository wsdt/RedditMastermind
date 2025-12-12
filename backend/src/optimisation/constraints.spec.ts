/**
 * Unit Tests for Constraint Checker
 *
 * Tests the core scheduling constraints:
 * - Subreddit frequency (no more than 1 post per 48 hours)
 * - Persona self-reply prevention
 * - Weekly post limits
 * - Topic diversity scoring
 * - Persona distribution scoring
 * - Keyword coverage scoring
 */

import {
    CommentPlan,
    PostCandidate,
    PostHistory,
    ScheduledThread,
    ThreadPlan,
    TimeSlot,
} from "../domain/types";
import {
    checkAllConstraints,
    checkPersonaSelfReply,
    checkSubredditFrequency,
    checkWeeklyLimit,
    scoreKeywordCoverage,
    scorePersonaDistribution,
    scoreToDiversity,
} from "./constraints";

// ============================================================================
// TEST FIXTURES
// ============================================================================

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

function createMockSlot(date?: Date): TimeSlot {
    const slotDate = date || new Date();
    return {
        date: slotDate,
        dayOfWeek: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ][slotDate.getDay()],
        preferredHour: 12,
    };
}

function createMockScheduledThread(
    thread?: ThreadPlan,
    slot?: TimeSlot,
): ScheduledThread {
    return {
        id: `sched_${Date.now()}`,
        thread: thread || createMockThread(),
        slot: slot || createMockSlot(),
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
    };
}

function createMockHistory(subreddit: string, daysAgo: number): PostHistory {
    const postedAt = new Date();
    postedAt.setDate(postedAt.getDate() - daysAgo);

    return {
        id: `hist_${Date.now()}`,
        threadId: `thread_${Date.now()}`,
        subreddit,
        postedAt,
        keywordsUsed: ["K1"],
        personasUsed: ["riley_ops", "jordan_consults"],
    };
}

// ============================================================================
// HARD CONSTRAINT TESTS
// ============================================================================

describe("Hard Constraints", () => {
    describe("checkSubredditFrequency", () => {
        it("should pass when subreddit has no recent posts", () => {
            const thread = createMockThread();
            const result = checkSubredditFrequency(
                thread,
                [],
                [],
                createMockSlot(),
            );

            expect(result.passed).toBe(true);
        });

        it("should fail when subreddit was posted to within 48 hours (from schedule)", () => {
            const thread = createMockThread({
                post: createMockPost({ subreddit: "r/PowerPoint" }),
            });

            const recentSlot = createMockSlot(new Date());
            const existingThread = createMockThread({
                post: createMockPost({ subreddit: "r/PowerPoint" }),
            });
            const existingSchedule = [
                createMockScheduledThread(existingThread, recentSlot),
            ];

            const proposedSlot = createMockSlot();
            proposedSlot.date.setHours(proposedSlot.date.getHours() + 24); // 24 hours later

            const result = checkSubredditFrequency(
                thread,
                existingSchedule,
                [],
                proposedSlot,
            );

            expect(result.passed).toBe(false);
            expect(result.reason).toContain("r/PowerPoint");
            expect(result.reason).toContain("48 hours");
        });

        it("should pass when subreddit was posted to more than 48 hours ago", () => {
            const thread = createMockThread({
                post: createMockPost({ subreddit: "r/PowerPoint" }),
            });

            const history = [createMockHistory("r/PowerPoint", 3)]; // 3 days ago

            const result = checkSubredditFrequency(
                thread,
                [],
                history,
                createMockSlot(),
            );

            expect(result.passed).toBe(true);
        });

        it("should fail when subreddit was posted to within 48 hours (from history)", () => {
            const thread = createMockThread({
                post: createMockPost({ subreddit: "r/PowerPoint" }),
            });

            const history = [createMockHistory("r/PowerPoint", 1)]; // 1 day ago

            const result = checkSubredditFrequency(
                thread,
                [],
                history,
                createMockSlot(),
            );

            expect(result.passed).toBe(false);
        });

        it("should pass for different subreddits", () => {
            const thread = createMockThread({
                post: createMockPost({ subreddit: "r/Canva" }),
            });

            const history = [createMockHistory("r/PowerPoint", 1)]; // Different subreddit

            const result = checkSubredditFrequency(
                thread,
                [],
                history,
                createMockSlot(),
            );

            expect(result.passed).toBe(true);
        });
    });

    describe("checkPersonaSelfReply", () => {
        it("should pass with valid conversation structure", () => {
            const thread = createMockThread({
                post: createMockPost({ opPersonaId: "riley_ops" }),
                comments: [
                    createMockComment({ personaId: "jordan_consults" }),
                    createMockComment({ personaId: "emily_econ" }),
                    createMockComment({ personaId: "riley_ops" }), // OP can reply later
                ],
            });

            const result = checkPersonaSelfReply(thread);
            expect(result.passed).toBe(true);
        });

        it("should fail when OP is first commenter", () => {
            const thread = createMockThread({
                post: createMockPost({ opPersonaId: "riley_ops" }),
                comments: [
                    createMockComment({ personaId: "riley_ops" }), // OP first = bad
                    createMockComment({ personaId: "jordan_consults" }),
                ],
            });

            const result = checkPersonaSelfReply(thread);
            expect(result.passed).toBe(false);
            expect(result.reason).toContain("first commenter");
        });

        it("should fail with consecutive comments by same persona", () => {
            const thread = createMockThread({
                post: createMockPost({ opPersonaId: "riley_ops" }),
                comments: [
                    createMockComment({ personaId: "jordan_consults" }),
                    createMockComment({ personaId: "jordan_consults" }), // Same persona twice
                ],
            });

            const result = checkPersonaSelfReply(thread);
            expect(result.passed).toBe(false);
            expect(result.reason).toContain("consecutive");
        });

        it("should pass with empty comments", () => {
            const thread = createMockThread({
                comments: [],
            });

            const result = checkPersonaSelfReply(thread);
            expect(result.passed).toBe(true);
        });
    });

    describe("checkWeeklyLimit", () => {
        it("should pass when under limit", () => {
            const schedule = [createMockScheduledThread()];
            const result = checkWeeklyLimit(schedule, 3);

            expect(result.passed).toBe(true);
        });

        it("should fail when at limit", () => {
            const schedule = [
                createMockScheduledThread(),
                createMockScheduledThread(),
                createMockScheduledThread(),
            ];
            const result = checkWeeklyLimit(schedule, 3);

            expect(result.passed).toBe(false);
            expect(result.reason).toContain("3");
        });

        it("should pass with empty schedule", () => {
            const result = checkWeeklyLimit([], 3);
            expect(result.passed).toBe(true);
        });
    });
});

// ============================================================================
// SOFT CONSTRAINT TESTS
// ============================================================================

describe("Soft Constraints", () => {
    describe("scoreToDiversity", () => {
        it("should return 1.0 for first post (no comparisons)", () => {
            const thread = createMockThread();
            const score = scoreToDiversity(thread, [], []);

            expect(score).toBe(1.0);
        });

        it("should return lower score for similar titles", () => {
            const thread1 = createMockThread({
                post: createMockPost({ title: "Best AI presentation tools" }),
            });
            const thread2 = createMockThread({
                post: createMockPost({ title: "Best AI presentation makers" }),
            });

            const schedule = [createMockScheduledThread(thread1)];
            const score = scoreToDiversity(thread2, schedule, []);

            // Similar titles should have lower diversity
            expect(score).toBeLessThan(1.0);
        });

        it("should return higher score for different titles", () => {
            const thread1 = createMockThread({
                post: createMockPost({ title: "Best AI presentation tools" }),
            });
            const thread2 = createMockThread({
                post: createMockPost({
                    title: "How to handle last-minute deadlines",
                }),
            });

            const schedule = [createMockScheduledThread(thread1)];
            const score = scoreToDiversity(thread2, schedule, []);

            expect(score).toBeGreaterThan(0.5);
        });
    });

    describe("scorePersonaDistribution", () => {
        it("should return high score for unused personas", () => {
            const thread = createMockThread({
                post: createMockPost({ opPersonaId: "priya_pm" }),
                comments: [createMockComment({ personaId: "alex_sells" })],
            });

            const personaUsage = new Map<string, number>();
            personaUsage.set("riley_ops", 5);
            personaUsage.set("jordan_consults", 4);
            personaUsage.set("priya_pm", 0);
            personaUsage.set("alex_sells", 0);

            const score = scorePersonaDistribution(thread, [], personaUsage);

            expect(score).toBeGreaterThan(0.7);
        });

        it("should return lower score for overused personas", () => {
            const thread = createMockThread({
                post: createMockPost({ opPersonaId: "riley_ops" }),
                comments: [createMockComment({ personaId: "jordan_consults" })],
            });

            const personaUsage = new Map<string, number>();
            personaUsage.set("riley_ops", 10);
            personaUsage.set("jordan_consults", 8);

            const score = scorePersonaDistribution(thread, [], personaUsage);

            expect(score).toBeLessThan(0.5);
        });
    });

    describe("scoreKeywordCoverage", () => {
        it("should return high score for urgent unused keywords", () => {
            const thread = createMockThread({
                post: createMockPost({ targetKeywords: ["K5", "K6"] }),
            });

            const usedKeywords = new Set<string>(["K1", "K2"]);
            const keywordUrgencies = new Map<string, number>();
            keywordUrgencies.set("K5", 0.9); // High urgency
            keywordUrgencies.set("K6", 0.8);

            const score = scoreKeywordCoverage(
                thread,
                usedKeywords,
                keywordUrgencies,
            );

            expect(score).toBeGreaterThan(0.7);
        });

        it("should return lower score for recently used keywords", () => {
            const thread = createMockThread({
                post: createMockPost({ targetKeywords: ["K1", "K2"] }),
            });

            const usedKeywords = new Set<string>(["K1", "K2"]); // Already used this week
            const keywordUrgencies = new Map<string, number>();
            keywordUrgencies.set("K1", 0.1); // Low urgency
            keywordUrgencies.set("K2", 0.2);

            const score = scoreKeywordCoverage(
                thread,
                usedKeywords,
                keywordUrgencies,
            );

            expect(score).toBeLessThan(0.5);
        });

        it("should return 0.5 for posts with no keywords", () => {
            const thread = createMockThread({
                post: createMockPost({ targetKeywords: [] }),
            });

            const score = scoreKeywordCoverage(thread, new Set(), new Map());

            expect(score).toBe(0.5);
        });
    });
});

// ============================================================================
// COMBINED CONSTRAINT TESTS
// ============================================================================

describe("checkAllConstraints", () => {
    it("should pass all constraints for valid thread", () => {
        const thread = createMockThread({
            post: createMockPost({
                subreddit: "r/Canva",
                targetKeywords: ["K7"],
                opPersonaId: "priya_pm",
            }),
            comments: [
                createMockComment({ personaId: "alex_sells" }),
                createMockComment({ personaId: "emily_econ" }),
            ],
        });

        const slot = createMockSlot();
        const personaUsage = new Map<string, number>();
        const keywordUrgencies = new Map<string, number>();
        keywordUrgencies.set("K7", 0.8);

        const result = checkAllConstraints(
            thread,
            slot,
            [],
            [],
            3,
            personaUsage,
            keywordUrgencies,
        );

        expect(result.passed).toBe(true);
        expect(result.hardConstraints.subredditFrequency).toBe(true);
        expect(result.hardConstraints.personaNoSelfReply).toBe(true);
        expect(result.hardConstraints.weeklyLimit).toBe(true);
        expect(result.warnings).toHaveLength(0);
    });

    it("should fail when hard constraint violated", () => {
        const thread = createMockThread({
            post: createMockPost({ opPersonaId: "riley_ops" }),
            comments: [
                createMockComment({ personaId: "riley_ops" }), // OP first = violation
            ],
        });

        const result = checkAllConstraints(
            thread,
            createMockSlot(),
            [],
            [],
            3,
            new Map(),
            new Map(),
        );

        expect(result.passed).toBe(false);
        expect(result.hardConstraints.personaNoSelfReply).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should calculate low soft constraint scores for repeated keywords", () => {
        // Create a thread with low keyword urgency
        const newThread = createMockThread({
            post: createMockPost({
                title: "Best AI tools for slides",
                targetKeywords: ["K1"], // Keyword with low urgency
                opPersonaId: "riley_ops",
                subreddit: "r/PowerPoint",
            }),
            comments: [createMockComment({ personaId: "jordan_consults" })],
        });

        const personaUsage = new Map<string, number>();
        personaUsage.set("riley_ops", 8); // Overused
        personaUsage.set("jordan_consults", 7);

        const keywordUrgencies = new Map<string, number>();
        keywordUrgencies.set("K1", 0.1); // Low urgency - recently used

        // No existing schedule to avoid subreddit constraint issues
        const result = checkAllConstraints(
            newThread,
            createMockSlot(),
            [], // Empty schedule
            [],
            3,
            personaUsage,
            keywordUrgencies,
        );

        // Should pass hard constraints
        expect(result.passed).toBe(true);
        // Keyword coverage should be low due to low urgency
        expect(result.softConstraints.keywordCoverage).toBeLessThan(0.5);
    });
});
