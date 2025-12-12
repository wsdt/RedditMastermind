/**
 * Calendar DTOs with Swagger decorators for OpenAPI generation
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ============================================================================
// INPUT DTOs
// ============================================================================

export class CompanyInfoDto {
    @ApiProperty({ description: "Company name", example: "SlideForge" })
    name!: string;

    @ApiProperty({
        description: "Company website",
        example: "https://slideforge.ai",
    })
    website!: string;

    @ApiProperty({
        description: "Company description",
        example: "AI-powered presentation tool",
    })
    description!: string;

    @ApiProperty({
        description: "Key value propositions",
        type: [String],
        example: ["10x faster presentations", "AI-powered design"],
    })
    valuePropositions!: string[];
}

export class PersonaWritingStyleDto {
    @ApiProperty({
        enum: ["short", "medium", "long"],
        example: "medium",
    })
    sentenceLength!: "short" | "medium" | "long";

    @ApiProperty({ example: false })
    usesEmojis!: boolean;

    @ApiProperty({
        enum: ["informal", "neutral", "formal"],
        example: "informal",
    })
    formality!: "informal" | "neutral" | "formal";

    @ApiProperty({
        type: [String],
        example: ["honestly", "in my experience"],
    })
    typicalPhrases!: string[];
}

export class PersonaDto {
    @ApiProperty({ example: "riley_ops" })
    id!: string;

    @ApiProperty({ example: "riley_techops" })
    username!: string;

    @ApiProperty({ example: "Operations manager at a mid-size tech company" })
    bio!: string;

    @ApiProperty({ type: PersonaWritingStyleDto })
    writingStyle!: PersonaWritingStyleDto;

    @ApiProperty({ type: [String], example: ["operations", "productivity"] })
    expertise!: string[];

    @ApiProperty({
        enum: [
            "casual",
            "professional",
            "enthusiastic",
            "skeptical",
            "academic",
        ],
        example: "casual",
    })
    tone!:
        | "casual"
        | "professional"
        | "enthusiastic"
        | "skeptical"
        | "academic";
}

export class KeywordDto {
    @ApiProperty({ example: "K1" })
    id!: string;

    @ApiProperty({ example: "AI presentation maker" })
    term!: string;

    @ApiPropertyOptional({ example: 1200 })
    searchVolume?: number;

    @ApiProperty({ example: 8, minimum: 1, maximum: 10 })
    priorityScore!: number;
}

export class SubredditDto {
    @ApiProperty({ example: "r/PowerPoint" })
    name!: string;

    @ApiPropertyOptional({ type: [String] })
    rules?: string[];

    @ApiProperty({ type: [String], example: ["presentations", "templates"] })
    typicalTopics!: string[];

    @ApiProperty({ example: "Business professionals" })
    audienceType!: string;
}

export class GenerateCalendarDto {
    @ApiProperty({ type: CompanyInfoDto })
    companyInfo!: CompanyInfoDto;

    @ApiProperty({ type: [PersonaDto] })
    personas!: PersonaDto[];

    @ApiProperty({ type: [SubredditDto] })
    subreddits!: SubredditDto[];

    @ApiProperty({ type: [KeywordDto] })
    keywords!: KeywordDto[];

    @ApiProperty({ example: 3, minimum: 1, maximum: 10 })
    postsPerWeek!: number;

    @ApiPropertyOptional({
        description: "ISO date string",
        example: "2024-01-15",
    })
    weekStartDate?: string;
}

export class GenerateDemoCalendarDto {
    @ApiPropertyOptional({
        description:
            "ISO date string for week start (defaults to current date)",
        example: "2024-01-15",
    })
    weekStartDate?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class TimeSlotDto {
    @ApiProperty({ example: "2024-01-15T00:00:00.000Z" })
    date!: string;

    @ApiProperty({ example: "Monday" })
    dayOfWeek!: string;

    @ApiProperty({ example: 14, minimum: 0, maximum: 23 })
    preferredHour!: number;
}

export class PostCandidateDto {
    @ApiProperty({ example: "post_abc123" })
    id!: string;

    @ApiProperty({ example: "Best AI Presentation Tools in 2024?" })
    title!: string;

    @ApiProperty({ example: "Looking for recommendations..." })
    body!: string;

    @ApiProperty({ example: "r/PowerPoint" })
    subreddit!: string;

    @ApiProperty({ type: [String], example: ["K1", "K3"] })
    targetKeywords!: string[];

    @ApiProperty({ example: "riley_ops" })
    opPersonaId!: string;

    @ApiProperty({ example: 75 })
    potentialImpact!: number;

    @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
    generatedAt!: string;
}

export class CommentPlanDto {
    @ApiProperty({ example: "comment_xyz789" })
    id!: string;

    @ApiProperty({ example: "jordan_consults" })
    personaId!: string;

    @ApiProperty({ example: "I've tried a bunch of these..." })
    text!: string;

    @ApiProperty({ example: "root", description: "root or comment ID" })
    replyTo!: string;

    @ApiProperty({ example: 21 })
    delayMinutes!: number;

    @ApiProperty({ example: true })
    mentionsProduct!: boolean;

    @ApiProperty({ example: 0.7, minimum: 0, maximum: 1 })
    subtletyScore!: number;
}

export class ThreadPlanDto {
    @ApiProperty({ example: "thread_def456" })
    id!: string;

    @ApiProperty({ type: PostCandidateDto })
    post!: PostCandidateDto;

    @ApiProperty({ type: [CommentPlanDto] })
    comments!: CommentPlanDto[];

    @ApiProperty({
        enum: ["debate", "agreement", "question-answer", "experience-sharing"],
        example: "question-answer",
    })
    conversationStyle!:
        | "debate"
        | "agreement"
        | "question-answer"
        | "experience-sharing";

    @ApiProperty({ example: 25 })
    estimatedEngagement!: number;
}

export class HardConstraintsDto {
    @ApiProperty({ example: true })
    subredditFrequency!: boolean;

    @ApiProperty({ example: true })
    personaNoSelfReply!: boolean;

    @ApiProperty({ example: true })
    weeklyLimit!: boolean;
}

export class SoftConstraintsDto {
    @ApiProperty({ example: 0.85, minimum: 0, maximum: 1 })
    topicDiversity!: number;

    @ApiProperty({ example: 0.9, minimum: 0, maximum: 1 })
    personaDistribution!: number;

    @ApiProperty({ example: 0.75, minimum: 0, maximum: 1 })
    keywordCoverage!: number;
}

export class ConstraintCheckResultDto {
    @ApiProperty({ example: true })
    passed!: boolean;

    @ApiProperty({ type: HardConstraintsDto })
    hardConstraints!: HardConstraintsDto;

    @ApiProperty({ type: SoftConstraintsDto })
    softConstraints!: SoftConstraintsDto;

    @ApiProperty({ type: [String], example: [] })
    warnings!: string[];
}

export class QualityCheckDto {
    @ApiProperty({ example: "ad_detection" })
    name!: string;

    @ApiProperty({ example: true })
    passed!: boolean;

    @ApiProperty({ example: 0.85 })
    score!: number;

    @ApiProperty({ example: "Content appears natural and not promotional" })
    details!: string;
}

export class QualityReportDto {
    @ApiProperty({ example: "thread_abc123" })
    threadId!: string;

    @ApiProperty({ example: 82 })
    overallScore!: number;

    @ApiProperty({ type: [QualityCheckDto] })
    checks!: QualityCheckDto[];

    @ApiProperty({ example: true })
    passed!: boolean;

    @ApiProperty({
        type: [String],
        example: ["Consider varying sentence length"],
    })
    recommendations!: string[];
}

export class ScheduledThreadDto {
    @ApiProperty({ example: "entry_ghi012" })
    id!: string;

    @ApiProperty({ type: ThreadPlanDto })
    thread!: ThreadPlanDto;

    @ApiProperty({ type: TimeSlotDto })
    slot!: TimeSlotDto;

    @ApiProperty({
        enum: [
            "draft",
            "pending_review",
            "approved",
            "scheduled",
            "posted",
            "failed",
            "rejected",
        ],
        example: "draft",
    })
    status!: string;

    @ApiProperty({ type: ConstraintCheckResultDto })
    constraintsSatisfied!: ConstraintCheckResultDto;

    @ApiPropertyOptional({ type: QualityReportDto })
    qualityReport?: QualityReportDto;
}

export class CalendarMetadataDto {
    @ApiProperty({ example: 3 })
    totalPosts!: number;

    @ApiProperty({
        example: { "r/PowerPoint": 1, "r/SaaS": 2 },
        description: "Posts per subreddit",
    })
    subredditDistribution!: Record<string, number>;

    @ApiProperty({
        example: { riley_ops: 2, jordan_consults: 3 },
        description: "Comment count per persona",
    })
    personaUsage!: Record<string, number>;

    @ApiProperty({ type: [String], example: ["K1", "K3", "K7"] })
    keywordsCovered!: string[];

    @ApiProperty({ example: 82 })
    qualityScore!: number;

    @ApiProperty({ example: 78 })
    diversityScore!: number;
}

export class ContentCalendarDto {
    @ApiProperty({ example: "cal_jkl345" })
    id!: string;

    @ApiProperty({ example: "2024-01-15T00:00:00.000Z" })
    weekStartDate!: string;

    @ApiProperty({ example: "2024-01-21T23:59:59.999Z" })
    weekEndDate!: string;

    @ApiProperty({ example: "slideforge_demo" })
    campaignId!: string;

    @ApiProperty({ type: [ScheduledThreadDto] })
    entries!: ScheduledThreadDto[];

    @ApiProperty({ type: CalendarMetadataDto })
    metadata!: CalendarMetadataDto;

    @ApiProperty({
        enum: [
            "generating",
            "ready",
            "approved",
            "partially_posted",
            "completed",
        ],
        example: "ready",
    })
    status!: string;

    @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
    createdAt!: string;

    @ApiProperty({ example: "2024-01-15T10:35:00.000Z" })
    updatedAt!: string;
}

export class GenerateCalendarResponseDto {
    @ApiProperty({ example: true })
    success!: boolean;

    @ApiPropertyOptional({ type: ContentCalendarDto })
    calendar?: ContentCalendarDto;

    @ApiPropertyOptional({ type: [String], example: [] })
    errors?: string[];

    @ApiPropertyOptional({ type: [String], example: [] })
    warnings?: string[];

    @ApiProperty({ example: 4523 })
    generationTimeMs!: number;
}
