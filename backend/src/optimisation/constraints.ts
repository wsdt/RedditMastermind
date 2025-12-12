/**
 * Constraint Definitions for the Content Scheduler
 *
 * Hard Constraints: Must be satisfied (violations = rejection)
 * Soft Constraints: Should be optimized (violations = lower score)
 */

import {
    ConstraintCheckResult,
    PostHistory,
    ScheduledThread,
    ThreadPlan,
    TimeSlot,
} from "../domain/types";

// ============================================================================
// HARD CONSTRAINT CHECKERS
// ============================================================================

/**
 * No subreddit gets more than 1 post per 48 hours
 * Prevents spam detection and maintains authenticity
 */
export function checkSubredditFrequency(
    thread: ThreadPlan,
    existingSchedule: ScheduledThread[],
    history: PostHistory[],
    proposedSlot: TimeSlot,
): { passed: boolean; reason?: string } {
    const subreddit = thread.post.subreddit;
    const proposedDate = proposedSlot.date;

    // Check against already scheduled posts this week
    for (const scheduled of existingSchedule) {
        if (scheduled.thread.post.subreddit !== subreddit) continue;

        const hoursDiff = Math.abs(
            (proposedDate.getTime() - scheduled.slot.date.getTime()) /
                (1000 * 60 * 60),
        );

        if (hoursDiff < 48) {
            return {
                passed: false,
                reason: `${subreddit} already has a post scheduled within 48 hours`,
            };
        }
    }

    // Check against historical posts
    const twoDaysAgo = new Date(proposedDate.getTime() - 48 * 60 * 60 * 1000);
    const recentInSubreddit = history.filter(
        (h) => h.subreddit === subreddit && h.postedAt >= twoDaysAgo,
    );

    if (recentInSubreddit.length > 0) {
        return {
            passed: false,
            reason: `${subreddit} was posted to within the last 48 hours`,
        };
    }

    return { passed: true };
}

/**
 * Checks for unnatural conversation patterns:
 * 1. No consecutive comments by the same persona (posting twice in a row)
 * 2. No persona replying to themselves
 * 3. OP shouldn't be the first commenter on their own post
 */
export function checkPersonaSelfReply(thread: ThreadPlan): {
    passed: boolean;
    reason?: string;
} {
    const opPersona = thread.post.opPersonaId;
    const comments = thread.comments;

    // Build a map of comment ID to persona for self-reply detection
    const commentIdToPersona = new Map<string, string>();
    for (const comment of comments) {
        commentIdToPersona.set(comment.id, comment.personaId);
    }

    for (let i = 0; i < comments.length; i++) {
        const comment = comments[i];

        // Check 1: No consecutive comments by same persona (posting twice in a row)
        if (i > 0 && comment.personaId === comments[i - 1].personaId) {
            return {
                passed: false,
                reason: `Persona ${comment.personaId} has consecutive comments`,
            };
        }

        // Check 2: No persona replying to themselves
        if (comment.replyTo !== "root") {
            const parentPersona = commentIdToPersona.get(comment.replyTo);
            if (parentPersona && parentPersona === comment.personaId) {
                return {
                    passed: false,
                    reason: `Persona ${comment.personaId} is replying to themselves`,
                };
            }
        }
    }

    // Check 3: OP can comment but not as first responder
    if (comments.length > 0 && comments[0].personaId === opPersona) {
        return {
            passed: false,
            reason: "OP cannot be the first commenter on their own post",
        };
    }

    return { passed: true };
}

/**
 * Weekly post limit must be respected
 */
export function checkWeeklyLimit(
    existingSchedule: ScheduledThread[],
    weeklyLimit: number,
): { passed: boolean; reason?: string } {
    if (existingSchedule.length >= weeklyLimit) {
        return {
            passed: false,
            reason: `Weekly limit of ${weeklyLimit} posts already reached`,
        };
    }
    return { passed: true };
}

// ============================================================================
// SOFT CONSTRAINT SCORERS (return 0-1, higher = better)
// ============================================================================

/**
 * Calculate topic diversity score
 * Uses cosine similarity of embeddings if available, falls back to title comparison
 */
export function scoreToDiversity(
    thread: ThreadPlan,
    existingSchedule: ScheduledThread[],
    history: PostHistory[],
): number {
    if (existingSchedule.length === 0 && history.length === 0) {
        return 1.0; // Perfect diversity if nothing to compare
    }

    const embedding = thread.post.topicEmbedding;

    if (embedding) {
        // Use embedding similarity
        let maxSimilarity = 0;

        // Check against this week's schedule
        for (const scheduled of existingSchedule) {
            const otherEmbedding = scheduled.thread.post.topicEmbedding;
            if (otherEmbedding) {
                const similarity = cosineSimilarity(embedding, otherEmbedding);
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
        }

        // Check against recent history
        for (const post of history.slice(-10)) {
            if (post.topicEmbedding) {
                const similarity = cosineSimilarity(
                    embedding,
                    post.topicEmbedding,
                );
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
        }

        // Convert similarity to diversity (1 - similarity)
        return 1 - maxSimilarity;
    }

    // Fallback: simple title word overlap
    const titleWords = new Set(thread.post.title.toLowerCase().split(/\s+/));
    let maxOverlap = 0;

    for (const scheduled of existingSchedule) {
        const otherWords = new Set(
            scheduled.thread.post.title.toLowerCase().split(/\s+/),
        );
        const overlap =
            setIntersectionSize(titleWords, otherWords) / titleWords.size;
        maxOverlap = Math.max(maxOverlap, overlap);
    }

    return 1 - maxOverlap;
}

/**
 * Calculate persona distribution score
 * Prefers even distribution of persona usage
 */
export function scorePersonaDistribution(
    thread: ThreadPlan,
    existingSchedule: ScheduledThread[],
    personaUsageCounts: Map<string, number>,
): number {
    // Count personas used in this thread
    const threadPersonas = new Set<string>();
    threadPersonas.add(thread.post.opPersonaId);
    for (const comment of thread.comments) {
        threadPersonas.add(comment.personaId);
    }

    // Calculate how "overused" these personas are
    let totalUsage = 0;
    let maxUsage = 0;

    for (const personaId of threadPersonas) {
        const usage = personaUsageCounts.get(personaId) || 0;
        totalUsage += usage;
        maxUsage = Math.max(maxUsage, usage);
    }

    // Also count usage in current schedule
    for (const scheduled of existingSchedule) {
        if (threadPersonas.has(scheduled.thread.post.opPersonaId)) {
            totalUsage += 1;
        }
        for (const comment of scheduled.thread.comments) {
            if (threadPersonas.has(comment.personaId)) {
                totalUsage += 0.5; // Comments count less than OPs
            }
        }
    }

    // Score: prefer lower total usage
    // Normalize assuming max reasonable usage is 10 per persona
    const avgUsage = totalUsage / threadPersonas.size;
    return Math.max(0, 1 - avgUsage / 10);
}

/**
 * Calculate keyword coverage score
 * Prefers keywords that haven't been used recently
 */
export function scoreKeywordCoverage(
    thread: ThreadPlan,
    usedKeywordsThisWeek: Set<string>,
    keywordUrgencies: Map<string, number>,
): number {
    const targetKeywords = thread.post.targetKeywords;

    if (targetKeywords.length === 0) return 0.5;

    let totalUrgency = 0;
    let novelKeywords = 0;

    for (const keywordId of targetKeywords) {
        const urgency = keywordUrgencies.get(keywordId) || 0.5;
        totalUrgency += urgency;

        if (!usedKeywordsThisWeek.has(keywordId)) {
            novelKeywords += 1;
        }
    }

    // Combine urgency and novelty
    const avgUrgency = totalUrgency / targetKeywords.length;
    const noveltyRatio = novelKeywords / targetKeywords.length;

    return avgUrgency * 0.6 + noveltyRatio * 0.4;
}

// ============================================================================
// COMBINED CONSTRAINT CHECK
// ============================================================================

export function checkAllConstraints(
    thread: ThreadPlan,
    slot: TimeSlot,
    existingSchedule: ScheduledThread[],
    history: PostHistory[],
    weeklyLimit: number,
    personaUsageCounts: Map<string, number>,
    keywordUrgencies: Map<string, number>,
): ConstraintCheckResult {
    const usedKeywordsThisWeek = new Set<string>();
    for (const scheduled of existingSchedule) {
        for (const kw of scheduled.thread.post.targetKeywords) {
            usedKeywordsThisWeek.add(kw);
        }
    }

    // Hard constraints
    const subredditCheck = checkSubredditFrequency(
        thread,
        existingSchedule,
        history,
        slot,
    );
    const personaCheck = checkPersonaSelfReply(thread);
    const limitCheck = checkWeeklyLimit(existingSchedule, weeklyLimit);

    // Soft constraints
    const topicDiversity = scoreToDiversity(thread, existingSchedule, history);
    const personaDistribution = scorePersonaDistribution(
        thread,
        existingSchedule,
        personaUsageCounts,
    );
    const keywordCoverage = scoreKeywordCoverage(
        thread,
        usedKeywordsThisWeek,
        keywordUrgencies,
    );

    const warnings: string[] = [];

    if (!subredditCheck.passed) warnings.push(subredditCheck.reason!);
    if (!personaCheck.passed) warnings.push(personaCheck.reason!);
    if (!limitCheck.passed) warnings.push(limitCheck.reason!);

    if (topicDiversity < 0.3) {
        warnings.push("Topic is very similar to recent posts");
    }
    if (personaDistribution < 0.3) {
        warnings.push("Personas are being overused");
    }
    if (keywordCoverage < 0.3) {
        warnings.push("Keywords have been used recently");
    }

    return {
        passed:
            subredditCheck.passed && personaCheck.passed && limitCheck.passed,
        hardConstraints: {
            subredditFrequency: subredditCheck.passed,
            personaNoSelfReply: personaCheck.passed,
            weeklyLimit: limitCheck.passed,
        },
        softConstraints: {
            topicDiversity,
            personaDistribution,
            keywordCoverage,
        },
        warnings,
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

function setIntersectionSize<T>(a: Set<T>, b: Set<T>): number {
    let count = 0;
    for (const item of a) {
        if (b.has(item)) count++;
    }
    return count;
}
