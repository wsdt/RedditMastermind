/**
 * In-Memory Persistence Service
 *
 * Simulates a database for tracking:
 * - Campaign history (what was posted when)
 * - Keyword usage (for rotation/decay scoring)
 * - Persona usage (for distribution balancing)
 * - Generated calendars (for continuity)
 *
 * In production, this would be PostgreSQL/Supabase
 */

import { Injectable } from "@nestjs/common";
import {
    CampaignInput,
    ContentCalendar,
    PostHistory,
    ScheduledThread,
} from "../domain/types";

@Injectable()
export class PersistenceService {
    // In-memory stores
    private calendars: Map<string, ContentCalendar> = new Map();
    private postHistory: PostHistory[] = [];
    private campaigns: Map<string, CampaignInput> = new Map();

    // Track keyword and persona usage for optimization
    private keywordUsage: Map<string, Date[]> = new Map(); // keyword ID -> dates used
    private personaUsage: Map<string, Date[]> = new Map(); // persona ID -> dates used
    private subredditPostDates: Map<string, Date[]> = new Map(); // subreddit -> post dates

    // ============================================================================
    // CALENDAR OPERATIONS
    // ============================================================================

    saveCalendar(calendar: ContentCalendar): void {
        this.calendars.set(calendar.id, calendar);

        // Update usage tracking from calendar entries
        for (const entry of calendar.entries) {
            this.trackEntryUsage(entry, calendar.weekStartDate);
        }
    }

    getLatestCalendar(): ContentCalendar | undefined {
        const all = Array.from(this.calendars.values()).sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        return all.length > 0 ? all[0] : undefined;
    }

    // ============================================================================
    // HISTORY OPERATIONS
    // ============================================================================

    getHistoryLast30Days(): PostHistory[] {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return this.postHistory.filter((h) => h.postedAt >= thirtyDaysAgo);
    }

    // ============================================================================
    // USAGE TRACKING (for constraint optimization)
    // ============================================================================

    private trackEntryUsage(entry: ScheduledThread, weekStart: Date): void {
        for (const keywordId of entry.thread.post.targetKeywords) {
            const dates = this.keywordUsage.get(keywordId) || [];
            dates.push(weekStart);
            this.keywordUsage.set(keywordId, dates);
        }

        const personaIds = new Set<string>();
        personaIds.add(entry.thread.post.opPersonaId);
        for (const comment of entry.thread.comments) {
            personaIds.add(comment.personaId);
        }

        for (const personaId of personaIds) {
            const dates = this.personaUsage.get(personaId) || [];
            dates.push(weekStart);
            this.personaUsage.set(personaId, dates);
        }
    }

    /**
     * Calculate keyword "urgency" - how long since it was last used
     * Higher score = more urgent to use (hasn't been used recently)
     */
    getKeywordUrgency(keywordId: string): number {
        const dates = this.keywordUsage.get(keywordId);
        if (!dates || dates.length === 0) {
            return 1.0; // Never used = maximum urgency
        }

        const lastUsed = Math.max(...dates.map((d) => d.getTime()));
        const daysSinceUsed = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);

        // Decay function: urgency increases over time, maxes at 1.0 after 14 days
        return Math.min(1.0, daysSinceUsed / 14);
    }

    /**
     * Get persona usage count in the last N days
     * Used for balancing persona distribution
     */
    getPersonaUsageCount(personaId: string, days: number = 30): number {
        const dates = this.personaUsage.get(personaId);
        if (!dates) return 0;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return dates.filter((d) => d >= cutoff).length;
    }

    /**
     * Check when subreddit was last posted to
     * Returns null if never posted
     */
    getLastPostDateForSubreddit(subreddit: string): Date | null {
        const dates = this.subredditPostDates.get(subreddit);
        if (!dates || dates.length === 0) return null;

        return new Date(Math.max(...dates.map((d) => d.getTime())));
    }

    /**
     * Get all topic embeddings from recent history for similarity checking
     */
    getRecentTopicEmbeddings(
        days: number = 30,
    ): { id: string; embedding: number[] }[] {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return this.postHistory
            .filter((h) => h.postedAt >= cutoff && h.topicEmbedding)
            .map((h) => ({ id: h.id, embedding: h.topicEmbedding! }));
    }

    // ============================================================================
    // CAMPAIGN OPERATIONS
    // ============================================================================

    saveCampaign(id: string, campaign: CampaignInput): void {
        this.campaigns.set(id, campaign);
    }
}
