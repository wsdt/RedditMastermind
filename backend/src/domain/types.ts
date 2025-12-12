/**
 * Core Domain Types for the Reddit Mastermind Content Supply Chain
 *
 * This module defines the data structures that flow through the three-phase pipeline:
 * Generation (Creative) → Optimization (Logical) → Execution (Operational)
 */

// ============================================================================
// INPUT TYPES - What the user provides
// ============================================================================

export interface CompanyInfo {
    name: string;
    website: string;
    description: string;
    valuePropositions: string[]; // Key benefits to subtly highlight
}

export interface Persona {
    id: string;
    username: string;
    bio: string;
    writingStyle: PersonaWritingStyle;
    expertise: string[];
    tone: "casual" | "professional" | "enthusiastic" | "skeptical" | "academic";
}

export interface PersonaWritingStyle {
    sentenceLength: "short" | "medium" | "long";
    usesEmojis: boolean;
    formality: "informal" | "neutral" | "formal";
    typicalPhrases: string[]; // Signature phrases this persona uses
}

export interface Keyword {
    id: string;
    term: string;
    searchVolume?: number; // Optional: for prioritization
    lastUsedDate?: Date;
    priorityScore: number; // 1-10, higher = more important
}

export interface Subreddit {
    name: string; // e.g., "r/PowerPoint"
    rules?: string[];
    typicalTopics: string[];
    audienceType: string;
}

export interface CampaignInput {
    companyInfo: CompanyInfo;
    personas: Persona[];
    subreddits: Subreddit[];
    keywords: Keyword[];
    postsPerWeek: number;
    weekStartDate: Date;
}

// ============================================================================
// GENERATION TYPES - Output from the creative phase
// ============================================================================

export interface PostCandidate {
    id: string;
    title: string;
    body: string;
    subreddit: string;
    targetKeywords: string[]; // Keyword IDs this post targets
    opPersonaId: string;
    potentialImpact: number; // Calculated score 0-100
    topicEmbedding?: number[]; // For similarity checks
    generatedAt: Date;
}

export interface CommentPlan {
    id: string;
    personaId: string;
    text: string;
    replyTo: "root" | string; // 'root' = reply to post, otherwise comment ID
    delayMinutes: number; // Natural timing buffer
    mentionsProduct: boolean;
    subtletyScore: number; // 0-1, how subtle is the product mention
}

export interface ThreadPlan {
    id: string;
    post: PostCandidate;
    comments: CommentPlan[];
    conversationStyle:
        | "debate"
        | "agreement"
        | "question-answer"
        | "experience-sharing";
    estimatedEngagement: number; // Predicted upvotes/comments
}

// ============================================================================
// OPTIMIZATION TYPES - Output from the scheduling phase
// ============================================================================

export interface TimeSlot {
    date: Date;
    dayOfWeek: string;
    preferredHour: number; // 0-23, optimal posting time
}

export interface ScheduledThread {
    id: string;
    thread: ThreadPlan;
    slot: TimeSlot;
    status: CalendarEntryStatus;
    constraintsSatisfied: ConstraintCheckResult;
}

export type CalendarEntryStatus =
    | "draft" // Generated, not yet reviewed
    | "pending_review" // Awaiting human approval
    | "approved" // Ready to post
    | "scheduled" // In the queue
    | "posted" // Successfully posted
    | "failed" // Posting failed
    | "rejected"; // Human rejected

export interface ConstraintCheckResult {
    passed: boolean;
    hardConstraints: {
        subredditFrequency: boolean;
        personaNoSelfReply: boolean;
        weeklyLimit: boolean;
    };
    softConstraints: {
        topicDiversity: number; // 0-1 score
        personaDistribution: number; // 0-1 score
        keywordCoverage: number; // 0-1 score
    };
    warnings: string[];
}

// ============================================================================
// CALENDAR TYPES - The final output
// ============================================================================

export interface ContentCalendar {
    id: string;
    weekStartDate: Date;
    weekEndDate: Date;
    campaignId: string;
    entries: ScheduledThread[];
    metadata: CalendarMetadata;
    status:
        | "generating"
        | "ready"
        | "approved"
        | "partially_posted"
        | "completed";
    createdAt: Date;
    updatedAt: Date;
}

export interface CalendarMetadata {
    totalPosts: number;
    subredditDistribution: Record<string, number>;
    personaUsage: Record<string, number>;
    keywordsCovered: string[];
    qualityScore: number; // Aggregate quality score 0-100
    diversityScore: number;
}

// ============================================================================
// QUALITY ASSURANCE TYPES
// ============================================================================

export interface QualityReport {
    threadId: string;
    overallScore: number; // 0-100
    checks: QualityCheck[];
    passed: boolean;
    recommendations: string[];
}

export interface QualityCheck {
    name: string;
    passed: boolean;
    score: number;
    details: string;
}

export type QualityCheckType =
    | "ad_detection" // Does it sound like an advertisement?
    | "tone_consistency" // Does persona sound authentic?
    | "overlap_detection" // Too similar to recent posts?
    | "format_validation" // No placeholders, proper formatting?
    | "conversation_flow" // Does the thread feel natural?
    | "keyword_stuffing"; // Are keywords overused?

// ============================================================================
// HISTORY & PERSISTENCE TYPES
// ============================================================================

export interface PostHistory {
    id: string;
    threadId: string;
    subreddit: string;
    postedAt: Date;
    keywordsUsed: string[];
    personasUsed: string[];
    topicEmbedding?: number[];
    performance?: PostPerformance;
}

export interface PostPerformance {
    upvotes: number;
    comments: number;
    views?: number;
    recordedAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GenerateCalendarResponse {
    success: boolean;
    calendar?: ContentCalendar;
    errors?: string[];
    warnings?: string[];
    generationTimeMs: number;
}
