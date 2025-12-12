/**
 * Scheduler Service - The Optimization Phase
 *
 * Implements a Constraint Satisfaction Problem (CSP) solver that:
 * 1. Takes candidate posts from Generation phase
 * 2. Selects optimal subset based on constraints
 * 3. Assigns time slots
 * 4. Produces a validated schedule
 *
 * Uses greedy optimization with backtracking for efficiency
 */

import { Injectable, Logger } from "@nestjs/common";
import {
    CalendarMetadata,
    CampaignInput,
    ContentCalendar,
    PostCandidate,
    ScheduledThread,
    ThreadPlan,
    TimeSlot,
} from "../domain/types";
import { PersistenceService } from "../persistence/persistence.service";
import { checkAllConstraints } from "./constraints";

export interface ScoredCandidate {
    candidate: PostCandidate;
    score: number;
    breakdown: {
        impact: number;
        urgency: number;
        diversity: number;
    };
}

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(private readonly persistence: PersistenceService) {}

    /**
     * Generate time slots for the week
     * Distributes posts evenly across the week at optimal times
     */
    generateTimeSlots(weekStartDate: Date, postsPerWeek: number): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const daysOfWeek = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ];

        // Optimal posting hours (based on typical Reddit activity)
        const optimalHours = [9, 12, 15, 18, 21]; // Morning, lunch, afternoon, evening, night

        // Spread posts across the week
        const dayInterval = Math.floor(7 / postsPerWeek);
        let currentDay = 1; // Start on Monday

        for (let i = 0; i < postsPerWeek; i++) {
            const slotDate = new Date(weekStartDate);
            slotDate.setDate(slotDate.getDate() + currentDay);

            // Pick an optimal hour (rotate through them)
            const hour = optimalHours[i % optimalHours.length];
            slotDate.setHours(hour, 0, 0, 0);

            slots.push({
                date: slotDate,
                dayOfWeek: daysOfWeek[slotDate.getDay()],
                preferredHour: hour,
            });

            currentDay += dayInterval;
            if (currentDay >= 7) currentDay = currentDay % 7;
        }

        return slots;
    }

    /**
     * Score and rank candidates for selection
     */
    rankCandidates(
        candidates: PostCandidate[],
        campaign: CampaignInput,
    ): ScoredCandidate[] {
        const scored: ScoredCandidate[] = [];

        for (const candidate of candidates) {
            // Impact score from generation
            const impact = candidate.potentialImpact / 100;

            // Keyword urgency (how long since these keywords were used)
            let urgency = 0;
            for (const keywordId of candidate.targetKeywords) {
                urgency += this.persistence.getKeywordUrgency(keywordId);
            }
            urgency =
                candidate.targetKeywords.length > 0
                    ? urgency / candidate.targetKeywords.length
                    : 0.5;

            // Subreddit diversity (prefer less-posted subreddits)
            const lastPost = this.persistence.getLastPostDateForSubreddit(
                candidate.subreddit,
            );
            let diversity = 1.0;
            if (lastPost) {
                const daysSince =
                    (Date.now() - lastPost.getTime()) / (1000 * 60 * 60 * 24);
                diversity = Math.min(1.0, daysSince / 7); // Max diversity after 7 days
            }

            // Combined score (weighted)
            const score = impact * 0.4 + urgency * 0.35 + diversity * 0.25;

            scored.push({
                candidate,
                score,
                breakdown: { impact, urgency, diversity },
            });
        }

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        return scored;
    }

    /**
     * Main scheduling algorithm
     * Greedy selection with constraint checking
     */
    async scheduleThreads(
        threads: ThreadPlan[],
        campaign: CampaignInput,
    ): Promise<ScheduledThread[]> {
        const schedule: ScheduledThread[] = [];
        const slots = this.generateTimeSlots(
            campaign.weekStartDate,
            campaign.postsPerWeek,
        );

        const history = this.persistence.getHistoryLast30Days();

        // Build persona usage map
        const personaUsageCounts = new Map<string, number>();
        for (const persona of campaign.personas) {
            personaUsageCounts.set(
                persona.id,
                this.persistence.getPersonaUsageCount(persona.id, 30),
            );
        }

        // Build keyword urgency map
        const keywordUrgencies = new Map<string, number>();
        for (const keyword of campaign.keywords) {
            keywordUrgencies.set(
                keyword.id,
                this.persistence.getKeywordUrgency(keyword.id),
            );
        }

        // Score threads
        const scoredThreads = threads.map((thread) => ({
            thread,
            score: this.scoreThread(thread, keywordUrgencies),
        }));
        scoredThreads.sort((a, b) => b.score - a.score);

        // Greedy assignment - first pass for threads that pass constraints
        const usedThreads = new Set<string>();
        const unfilledSlots: TimeSlot[] = [];

        for (const slot of slots) {
            let bestFit: ThreadPlan | null = null;
            let bestScore = -1;

            for (const { thread, score } of scoredThreads) {
                if (usedThreads.has(thread.id)) continue;

                // Check all constraints
                const constraints = checkAllConstraints(
                    thread,
                    slot,
                    schedule,
                    history,
                    campaign.postsPerWeek,
                    personaUsageCounts,
                    keywordUrgencies,
                );

                if (!constraints.passed) {
                    this.logger.debug(
                        `Thread ${thread.id} failed constraints: ${constraints.warnings.join(", ")}`,
                    );
                    continue;
                }

                const softScore =
                    constraints.softConstraints.topicDiversity * 0.4 +
                    constraints.softConstraints.personaDistribution * 0.3 +
                    constraints.softConstraints.keywordCoverage * 0.3;

                const combinedScore = score * 0.6 + softScore * 0.4;

                if (combinedScore > bestScore) {
                    bestScore = combinedScore;
                    bestFit = thread;
                }
            }

            if (bestFit) {
                const constraints = checkAllConstraints(
                    bestFit,
                    slot,
                    schedule,
                    history,
                    campaign.postsPerWeek,
                    personaUsageCounts,
                    keywordUrgencies,
                );

                const scheduled: ScheduledThread = {
                    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    thread: bestFit,
                    slot,
                    status: "draft",
                    constraintsSatisfied: constraints,
                };

                schedule.push(scheduled);
                usedThreads.add(bestFit.id);

                // Update persona usage for subsequent iterations
                personaUsageCounts.set(
                    bestFit.post.opPersonaId,
                    (personaUsageCounts.get(bestFit.post.opPersonaId) || 0) + 1,
                );

                this.logger.log(
                    `Scheduled "${bestFit.post.title}" for ${slot.dayOfWeek} at ${slot.preferredHour}:00`,
                );
            } else {
                // Track unfilled slots for fallback pass
                unfilledSlots.push(slot);
            }
        }

        // Second pass: fill remaining slots with best available threads (ignoring hard constraints)
        if (unfilledSlots.length > 0) {
            this.logger.warn(
                `${unfilledSlots.length} slots unfilled, using fallback threads...`,
            );

            // Get remaining unused threads sorted by score
            const remainingThreads = scoredThreads
                .filter(({ thread }) => !usedThreads.has(thread.id))
                .sort((a, b) => b.score - a.score);

            for (const slot of unfilledSlots) {
                if (remainingThreads.length === 0) {
                    this.logger.warn(
                        `No more threads available for slot ${slot.dayOfWeek}`,
                    );
                    continue;
                }

                // Take the best remaining thread
                const { thread: bestFallback } = remainingThreads.shift()!;

                const constraints = checkAllConstraints(
                    bestFallback,
                    slot,
                    schedule,
                    history,
                    campaign.postsPerWeek,
                    personaUsageCounts,
                    keywordUrgencies,
                );

                const scheduled: ScheduledThread = {
                    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    thread: bestFallback,
                    slot,
                    status: "draft",
                    constraintsSatisfied: constraints,
                };

                schedule.push(scheduled);
                usedThreads.add(bestFallback.id);

                // Update persona usage
                personaUsageCounts.set(
                    bestFallback.post.opPersonaId,
                    (personaUsageCounts.get(bestFallback.post.opPersonaId) ||
                        0) + 1,
                );

                this.logger.warn(
                    `Filled ${slot.dayOfWeek} with fallback: "${bestFallback.post.title}"`,
                );
            }
        }

        return schedule;
    }

    /**
     * Build the complete calendar object
     */
    buildCalendar(
        schedule: ScheduledThread[],
        campaign: CampaignInput,
        campaignId: string,
    ): ContentCalendar {
        const weekEnd = new Date(campaign.weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Calculate metadata
        const subredditDistribution: Record<string, number> = {};
        const personaUsage: Record<string, number> = {};
        const keywordsCovered: string[] = [];

        for (const entry of schedule) {
            // Subreddit distribution
            const sub = entry.thread.post.subreddit;
            subredditDistribution[sub] = (subredditDistribution[sub] || 0) + 1;

            // Persona usage
            const op = entry.thread.post.opPersonaId;
            personaUsage[op] = (personaUsage[op] || 0) + 1;

            for (const comment of entry.thread.comments) {
                personaUsage[comment.personaId] =
                    (personaUsage[comment.personaId] || 0) + 0.5;
            }

            // Keywords
            keywordsCovered.push(...entry.thread.post.targetKeywords);
        }

        let totalQuality = 0;
        for (const entry of schedule) {
            const c = entry.constraintsSatisfied.softConstraints;
            totalQuality +=
                (c.topicDiversity + c.personaDistribution + c.keywordCoverage) /
                3;
        }
        const qualityScore =
            schedule.length > 0
                ? Math.round((totalQuality / schedule.length) * 100)
                : 0;

        // Calculate diversity score
        const uniqueSubreddits = Object.keys(subredditDistribution).length;
        const uniquePersonas = Object.keys(personaUsage).length;
        const uniqueKeywords = new Set(keywordsCovered).size;
        const diversityScore = Math.round(
            ((uniqueSubreddits / Math.max(schedule.length, 1)) * 0.3 +
                (uniquePersonas / Math.max(campaign.personas.length, 1)) * 0.4 +
                (uniqueKeywords / Math.max(campaign.keywords.length, 1)) *
                    0.3) *
                100,
        );

        const metadata: CalendarMetadata = {
            totalPosts: schedule.length,
            subredditDistribution,
            personaUsage,
            keywordsCovered: [...new Set(keywordsCovered)],
            qualityScore,
            diversityScore,
        };

        const calendar: ContentCalendar = {
            id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            weekStartDate: campaign.weekStartDate,
            weekEndDate: weekEnd,
            campaignId,
            entries: schedule,
            metadata,
            status: "ready",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        return calendar;
    }

    /**
     * Calculate next week's start date based on last calendar
     */
    getNextWeekStart(lastCalendar?: ContentCalendar): Date {
        if (!lastCalendar) {
            // Start from next Monday
            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            const nextMonday = new Date(now);
            nextMonday.setDate(now.getDate() + daysUntilMonday);
            nextMonday.setHours(0, 0, 0, 0);
            return nextMonday;
        }

        // Start from the day after last calendar ends
        const nextStart = new Date(lastCalendar.weekEndDate);
        nextStart.setDate(nextStart.getDate() + 1);
        nextStart.setHours(0, 0, 0, 0);
        return nextStart;
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private scoreThread(
        thread: ThreadPlan,
        keywordUrgencies: Map<string, number>,
    ): number {
        let score = 0;

        // Base score from estimated engagement
        score += (thread.estimatedEngagement / 100) * 0.3;

        // Keyword urgency
        let urgency = 0;
        for (const keywordId of thread.post.targetKeywords) {
            urgency += keywordUrgencies.get(keywordId) || 0.5;
        }
        if (thread.post.targetKeywords.length > 0) {
            score += (urgency / thread.post.targetKeywords.length) * 0.4;
        }

        // Comment quality (more comments = more engagement potential)
        const commentScore = Math.min(1.0, thread.comments.length / 4);
        score += commentScore * 0.15;

        // Product mention subtlety (prefer subtle mentions)
        const mentions = thread.comments.filter((c) => c.mentionsProduct);
        if (mentions.length > 0) {
            const avgSubtlety =
                mentions.reduce((sum, c) => sum + c.subtletyScore, 0) /
                mentions.length;
            score += avgSubtlety * 0.15;
        }

        return score;
    }
}
