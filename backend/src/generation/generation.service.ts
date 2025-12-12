/**
 * Generation Service - The Creative Phase
 *
 * Implements the Director-Actor pattern for content generation:
 * 1. Brainstorm: Generate candidate post ideas (over-generate by 3x)
 * 2. Direct: Plan conversation flow and persona assignments
 * 3. Act: Generate actual content in each persona's voice
 * 4. Assemble: Create complete ThreadPlan objects
 */

import { Injectable, Logger } from "@nestjs/common";
import {
    CampaignInput,
    CommentPlan,
    Keyword,
    Persona,
    PostCandidate,
    Subreddit,
    ThreadPlan,
} from "../domain/types";
import { PersistenceService } from "../persistence/persistence.service";
import { LLMService } from "./llm.service";
import {
    buildActorPrompt,
    buildBrainstormPrompt,
    buildDirectorPrompt,
    buildPostPrompt,
} from "./prompts";

interface BrainstormIdea {
    title: string;
    body: string;
    angle: string;
    howProductFits: string;
    potentialImpact: number;
}

interface DirectorPlan {
    postTitle: string;
    postBody: string;
    opPersonaId: string;
    comments: Array<{
        personaId: string;
        replyTo: string;
        keyPoints: string[];
        mentionsProduct: boolean;
        suggestedDelayMinutes: number;
    }>;
    conversationArc: string;
}

@Injectable()
export class GenerationService {
    private readonly logger = new Logger(GenerationService.name);

    constructor(
        private readonly llm: LLMService,
        private readonly persistence: PersistenceService,
    ) {}

    /**
     * Find a persona by ID or username (LLM sometimes returns username instead of ID)
     */
    private findPersona(
        personas: Persona[],
        identifier: string,
    ): Persona | undefined {
        // First try exact ID match
        let persona = personas.find((p) => p.id === identifier);
        if (persona) return persona;

        // Then try username match (LLM sometimes uses username instead of ID)
        persona = personas.find((p) => p.username === identifier);
        if (persona) return persona;

        // Try case-insensitive matches
        const lowerIdentifier = identifier.toLowerCase();
        persona = personas.find((p) => p.id.toLowerCase() === lowerIdentifier);
        if (persona) return persona;

        persona = personas.find(
            (p) => p.username.toLowerCase() === lowerIdentifier,
        );
        return persona;
    }

    /**
     * Fix consecutive comments by the same persona by swapping with a different persona
     * This ensures the thread passes the constraint check
     */
    private fixConsecutiveComments(
        comments: Array<{ personaId: string; [key: string]: unknown }>,
        availablePersonas: Persona[],
        opPersonaId: string,
    ): void {
        if (comments.length < 2) return;

        // Get list of persona IDs we can use (excluding OP)
        const availableIds = availablePersonas
            .filter((p) => p.id !== opPersonaId)
            .map((p) => p.id);

        // Also build a map of username -> id for lookups
        const usernameToId = new Map<string, string>();
        for (const p of availablePersonas) {
            usernameToId.set(p.username.toLowerCase(), p.id);
            usernameToId.set(p.id.toLowerCase(), p.id);
        }

        // Normalize all personaIds to actual IDs first
        for (const comment of comments) {
            const normalized = usernameToId.get(
                comment.personaId.toLowerCase(),
            );
            if (normalized) {
                comment.personaId = normalized;
            }
        }

        // Fix consecutive duplicates
        for (let i = 1; i < comments.length; i++) {
            if (comments[i].personaId === comments[i - 1].personaId) {
                // Find an alternative persona not used in adjacent positions
                const avoid = new Set<string>();
                avoid.add(comments[i - 1].personaId);
                if (i + 1 < comments.length) {
                    avoid.add(comments[i + 1].personaId);
                }

                // Pick a different persona
                const alternatives = availableIds.filter(
                    (id) => !avoid.has(id),
                );
                if (alternatives.length > 0) {
                    const newPersona =
                        alternatives[
                            Math.floor(Math.random() * alternatives.length)
                        ];
                    this.logger.debug(
                        `Fixing consecutive comment: changing ${comments[i].personaId} to ${newPersona}`,
                    );
                    comments[i].personaId = newPersona;
                }
            }
        }

        // Also ensure OP is not the first commenter
        if (comments.length > 0) {
            const firstPersona = usernameToId.get(
                comments[0].personaId.toLowerCase(),
            );
            const opId =
                usernameToId.get(opPersonaId.toLowerCase()) || opPersonaId;

            if (
                firstPersona === opId ||
                comments[0].personaId === opPersonaId
            ) {
                const alternatives = availableIds.filter((id) => id !== opId);
                if (alternatives.length > 0) {
                    const newPersona =
                        alternatives[
                            Math.floor(Math.random() * alternatives.length)
                        ];
                    this.logger.debug(
                        `Fixing OP as first commenter: changing ${comments[0].personaId} to ${newPersona}`,
                    );
                    comments[0].personaId = newPersona;
                }
            }
        }
    }

    /**
     * Generate candidate posts for the given campaign
     * Over-generates by multiplier to give optimizer options
     */
    async generateCandidates(
        campaign: CampaignInput,
        multiplier: number = 3,
    ): Promise<PostCandidate[]> {
        const targetCount = campaign.postsPerWeek * multiplier;
        const candidates: PostCandidate[] = [];

        this.logger.log(
            `Generating ${targetCount} candidates for ${campaign.postsPerWeek} weekly posts`,
        );

        // Get recent topics for diversity
        const recentHistory = this.persistence.getHistoryLast30Days();
        const recentTopics = recentHistory.map(
            (h) => `${h.subreddit}: topic about ${h.keywordsUsed.join(", ")}`,
        );

        // Score and sort keywords by urgency
        const scoredKeywords = campaign.keywords.map((k) => ({
            keyword: k,
            urgency: this.persistence.getKeywordUrgency(k.id),
            combinedScore:
                k.priorityScore * this.persistence.getKeywordUrgency(k.id),
        }));
        scoredKeywords.sort((a, b) => b.combinedScore - a.combinedScore);

        // Generate ideas for top keywords across subreddits
        for (const { keyword } of scoredKeywords.slice(
            0,
            Math.ceil(targetCount / 2),
        )) {
            // Pick best-fit subreddit for this keyword
            const subreddit = this.selectSubredditForKeyword(
                keyword,
                campaign.subreddits,
            );

            const ideas = await this.brainstormIdeas(
                campaign,
                keyword,
                subreddit,
                recentTopics,
            );

            for (const idea of ideas) {
                // Select OP persona
                const opPersona = this.selectOPPersona(
                    campaign.personas,
                    subreddit,
                );

                const candidate: PostCandidate = {
                    id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    title: idea.title,
                    body: idea.body,
                    subreddit: subreddit.name,
                    targetKeywords: [keyword.id],
                    opPersonaId: opPersona.id,
                    potentialImpact: idea.potentialImpact,
                    generatedAt: new Date(),
                };

                candidates.push(candidate);

                if (candidates.length >= targetCount) break;
            }

            if (candidates.length >= targetCount) break;
        }

        this.logger.log(`Generated ${candidates.length} post candidates`);
        return candidates;
    }

    /**
     * Generate a complete thread plan with comments
     */
    async generateThread(
        candidate: PostCandidate,
        campaign: CampaignInput,
        conversationStyle: ThreadPlan["conversationStyle"] = "question-answer",
    ): Promise<ThreadPlan> {
        const threadStart = Date.now();
        this.logger.log(
            `[Thread] Starting generation for: "${candidate.title}"`,
        );

        const subreddit = campaign.subreddits.find(
            (s) => s.name === candidate.subreddit,
        );
        if (!subreddit) {
            throw new Error(
                `Subreddit ${candidate.subreddit} not found in campaign`,
            );
        }

        const targetKeywords = campaign.keywords.filter((k) =>
            candidate.targetKeywords.includes(k.id),
        );

        // Get available personas (excluding OP for comments)
        const availableForComments = campaign.personas.filter(
            (p) => p.id !== candidate.opPersonaId,
        );

        // Step 1: Director creates the conversation plan
        this.logger.log(`[Thread] Step 1/3: Director planning conversation...`);
        const directorStart = Date.now();
        const directorPrompt = buildDirectorPrompt({
            companyInfo: campaign.companyInfo,
            subreddit,
            targetKeywords,
            availablePersonas: availableForComments,
            conversationStyle,
        });

        const directorResult =
            await this.llm.generateJSON<DirectorPlan>(directorPrompt);

        if (!directorResult.success || !directorResult.data) {
            this.logger.error("Director planning failed, throwing error");
            throw new Error("Director planning failed");
        }

        const plan = directorResult.data;

        // Fix any consecutive comments by the same persona (LLM sometimes generates these)
        if (plan.comments && plan.comments.length > 0) {
            this.fixConsecutiveComments(
                plan.comments,
                campaign.personas,
                candidate.opPersonaId,
            );
        }

        this.logger.log(
            `[Thread] Step 1/3: Director planned ${plan.comments?.length || 0} comments (${Date.now() - directorStart}ms)`,
        );

        // Step 2: Refine the post in OP's voice
        this.logger.log(`[Thread] Step 2/3: Refining post in OP voice...`);
        const postStart = Date.now();
        const opPersona = campaign.personas.find(
            (p) => p.id === candidate.opPersonaId,
        )!;
        const postPrompt = buildPostPrompt({
            persona: opPersona,
            subreddit,
            topic: {
                title: plan.postTitle || candidate.title,
                body: plan.postBody || candidate.body,
                angle: "natural question",
            },
        });

        const postResult = await this.llm.generateJSON<{
            title: string;
            body: string;
        }>(postPrompt);

        const finalPost: PostCandidate = {
            ...candidate,
            title: postResult.data?.title || plan.postTitle || candidate.title,
            body: postResult.data?.body || plan.postBody || candidate.body,
        };
        this.logger.log(
            `[Thread] Step 2/3: Post refined (${Date.now() - postStart}ms)`,
        );

        // Step 3: Generate comments - batch root comments in parallel, then replies
        this.logger.log(
            `[Thread] Step 3/3: Generating ${plan.comments?.length || 0} comments...`,
        );
        const commentsStart = Date.now();
        const comments: CommentPlan[] = [];
        const previousComments: string[] = [];

        // Separate root comments from replies
        const rootComments = plan.comments.filter((c) => c.replyTo === "root");
        const replyComments = plan.comments.filter((c) => c.replyTo !== "root");

        this.logger.log(
            `[Thread]   - Generating ${rootComments.length} root comments in parallel...`,
        );
        const rootResults = await Promise.all(
            rootComments.map(async (commentPlan) => {
                const persona = this.findPersona(
                    campaign.personas,
                    commentPlan.personaId,
                );
                if (!persona) return null;

                const actorPrompt = buildActorPrompt({
                    persona,
                    scene: {
                        subreddit: subreddit.name,
                        postTitle: finalPost.title,
                        postBody: finalPost.body,
                        previousComments: [],
                        replyingTo: `Original post: "${finalPost.body}"`,
                    },
                    direction: {
                        keyPoints: commentPlan.keyPoints,
                        mentionsProduct: commentPlan.mentionsProduct,
                        productName: campaign.companyInfo.name,
                    },
                });

                const commentResult = await this.llm.generateText(actorPrompt);
                return {
                    plan: commentPlan,
                    persona,
                    text: commentResult.data || "Error generating comment",
                };
            }),
        );

        for (const result of rootResults) {
            if (!result) continue;
            const comment: CommentPlan = {
                id: `comment_${Date.now()}_${comments.length}`,
                personaId: result.persona.id,
                text: result.text,
                replyTo: "root",
                delayMinutes: result.plan.suggestedDelayMinutes,
                mentionsProduct: result.plan.mentionsProduct,
                subtletyScore: result.plan.mentionsProduct ? 0.7 : 1.0,
            };
            comments.push(comment);
            previousComments.push(result.text);
        }

        if (replyComments.length > 0) {
            this.logger.log(
                `[Thread]   - Generating ${replyComments.length} reply comments...`,
            );
        }
        for (let i = 0; i < replyComments.length; i++) {
            const commentPlan = replyComments[i];
            const persona = this.findPersona(
                campaign.personas,
                commentPlan.personaId,
            );

            if (!persona) {
                this.logger.warn(
                    `Persona ${commentPlan.personaId} not found, skipping`,
                );
                continue;
            }

            // Determine what this comment is replying to
            const replyIndex = parseInt(commentPlan.replyTo);
            const replyingTo = `Comment: "${previousComments[replyIndex] || previousComments[previousComments.length - 1]}"`;

            const actorPrompt = buildActorPrompt({
                persona,
                scene: {
                    subreddit: subreddit.name,
                    postTitle: finalPost.title,
                    postBody: finalPost.body,
                    previousComments,
                    replyingTo,
                },
                direction: {
                    keyPoints: commentPlan.keyPoints,
                    mentionsProduct: commentPlan.mentionsProduct,
                    productName: campaign.companyInfo.name,
                },
            });

            const commentResult = await this.llm.generateText(actorPrompt);
            const commentText = commentResult.data;

            const comment: CommentPlan = {
                id: `comment_${Date.now()}_${comments.length}`,
                personaId: persona.id,
                text: commentText || "Error generating comment",
                replyTo: `comment_${commentPlan.replyTo}`,
                delayMinutes: commentPlan.suggestedDelayMinutes,
                mentionsProduct: commentPlan.mentionsProduct,
                subtletyScore: commentPlan.mentionsProduct ? 0.7 : 1.0,
            };

            comments.push(comment);
            previousComments.push(commentText || "Error generating comment");
        }

        this.logger.log(
            `[Thread] Step 3/3: Generated ${comments.length} comments (${Date.now() - commentsStart}ms)`,
        );

        this.logger.log(
            `[Thread] Generating embedding for similarity checks...`,
        );
        const embeddingResult = await this.llm.generateEmbedding(
            `${finalPost.title} ${finalPost.body}`,
        );
        if (embeddingResult.success && embeddingResult.data) {
            finalPost.topicEmbedding = embeddingResult.data;
        }

        const thread: ThreadPlan = {
            id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            post: finalPost,
            comments,
            conversationStyle,
            estimatedEngagement: this.estimateEngagement(finalPost, comments),
        };

        const totalTime = Date.now() - threadStart;
        this.logger.log(
            `[Thread] ✓ Complete! ${comments.length} comments, total time: ${(totalTime / 1000).toFixed(1)}s`,
        );
        return thread;
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private async brainstormIdeas(
        campaign: CampaignInput,
        keyword: Keyword,
        subreddit: Subreddit,
        recentTopics: string[],
    ): Promise<BrainstormIdea[]> {
        const prompt = buildBrainstormPrompt({
            companyInfo: campaign.companyInfo,
            keyword,
            subreddit,
            recentTopics,
        });

        const result = await this.llm.generateJSON<
            BrainstormIdea[] | { ideas: BrainstormIdea[] }
        >(prompt);

        if (!result.success || !result.data) {
            this.logger.warn("Brainstorm failed, returning empty array");
            return [];
        }

        // Handle both array and wrapped object responses from LLM
        const data = result.data;
        if (Array.isArray(data)) {
            return data;
        }

        // LLM might wrap array in various property names
        if (data && typeof data === "object") {
            // Check common wrapper property names
            const possibleArrays = [
                "ideas",
                "posts",
                "results",
                "items",
                "data",
            ];
            for (const key of possibleArrays) {
                if (
                    key in data &&
                    Array.isArray((data as Record<string, unknown>)[key])
                ) {
                    return (data as Record<string, unknown>)[
                        key
                    ] as BrainstormIdea[];
                }
            }

            // If object has a single array property, use that
            const values = Object.values(data);
            if (values.length === 1 && Array.isArray(values[0])) {
                return values[0] as BrainstormIdea[];
            }
        }

        this.logger.warn(
            "Unexpected brainstorm response format, returning empty array: " +
                JSON.stringify(data),
        );
        return [];
    }

    private selectSubredditForKeyword(
        keyword: Keyword,
        subreddits: Subreddit[],
    ): Subreddit {
        // Simple heuristic: match keyword terms to subreddit topics
        const keywordLower = keyword.term.toLowerCase();

        for (const sub of subreddits) {
            const topicsMatch = sub.typicalTopics.some(
                (t) =>
                    keywordLower.includes(t.toLowerCase()) ||
                    t.toLowerCase().includes(keywordLower.split(" ")[0]),
            );
            if (topicsMatch) return sub;
        }

        // Check for specific keyword-subreddit matches
        if (
            keywordLower.includes("powerpoint") ||
            keywordLower.includes("slides")
        ) {
            const powerpoint = subreddits.find((s) =>
                s.name.includes("PowerPoint"),
            );
            if (powerpoint) return powerpoint;
        }

        if (keywordLower.includes("canva")) {
            const canva = subreddits.find((s) => s.name.includes("Canva"));
            if (canva) return canva;
        }

        if (keywordLower.includes("claude")) {
            const claude = subreddits.find((s) => s.name.includes("Claude"));
            if (claude) return claude;
        }

        // Default to first subreddit
        return subreddits[0];
    }

    private selectOPPersona(
        personas: Persona[],
        subreddit: Subreddit,
    ): Persona {
        // Match persona expertise to subreddit audience
        const audienceLower = subreddit.audienceType.toLowerCase();

        // Score each persona
        const scored = personas.map((p) => {
            let score = 0;

            // Check expertise match
            for (const exp of p.expertise) {
                if (audienceLower.includes(exp.toLowerCase())) {
                    score += 2;
                }
            }

            // Prefer personas who ask questions (casual/enthusiastic tones)
            if (p.tone === "casual" || p.tone === "enthusiastic") {
                score += 1;
            }

            // Factor in recent usage (prefer less-used personas)
            const usageCount = this.persistence.getPersonaUsageCount(p.id, 14);
            score -= usageCount * 0.5;

            return { persona: p, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].persona;
    }

    private estimateEngagement(
        post: PostCandidate,
        comments: CommentPlan[],
    ): number {
        let score = 50; // Base score

        // Title quality heuristics
        if (post.title.includes("?")) score += 10; // Questions get more engagement
        if (post.title.length < 60) score += 5; // Concise titles
        if (post.title.length > 100) score -= 10; // Too long

        // Comment quality
        score += comments.length * 5; // More comments = more activity
        if (comments.some((c) => c.mentionsProduct)) score += 5; // Has product mention

        // Variety in commenters
        const uniqueCommenters = new Set(comments.map((c) => c.personaId)).size;
        score += uniqueCommenters * 3;

        return Math.min(100, Math.max(0, score));
    }
}
