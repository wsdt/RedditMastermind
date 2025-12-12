/**
 * Quality Service - The Adversarial Review Phase
 *
 * Implements multiple quality checks to ensure content:
 * 1. Doesn't sound like advertising
 * 2. Maintains persona consistency
 * 3. Has natural conversation flow
 * 4. Avoids topic overlap with recent posts
 * 5. Passes format validation
 */

import { Injectable, Logger } from "@nestjs/common";
import {
    Persona,
    QualityCheck,
    QualityCheckType,
    QualityReport,
    ThreadPlan,
} from "../domain/types";
import { LLMService } from "../generation/llm.service";
import { buildCriticPrompt } from "../generation/prompts";
import { PersistenceService } from "../persistence/persistence.service";

interface CriticResponse {
    adScore: number;
    naturalScore: number;
    consistencyScore: number;
    subtletyScore: number;
    balanceScore: number;
    overallScore: number;
    passed: boolean;
    issues: string[];
    suggestions: string[];
}

@Injectable()
export class QualityService {
    private readonly logger = new Logger(QualityService.name);

    // Thresholds for quality checks
    private readonly AD_SCORE_THRESHOLD = 0.7;
    private readonly MIN_NATURAL_SCORE = 0.4;
    private readonly MIN_CONSISTENCY_SCORE = 0.5;
    private readonly SIMILARITY_THRESHOLD = 0.75;
    private readonly MIN_OVERALL_SCORE = 50;

    constructor(
        private readonly llm: LLMService,
        private readonly persistence: PersistenceService,
    ) {}

    /**
     * Run all quality checks on a thread
     */
    async evaluateThread(
        thread: ThreadPlan,
        productName: string,
        personas: Persona[],
    ): Promise<QualityReport> {
        const checks: QualityCheck[] = [];

        // 1. Ad Detection (LLM-based)
        const adCheck = await this.checkAdDetection(thread, productName);
        checks.push(adCheck);

        // 2. Tone Consistency
        const toneCheck = this.checkToneConsistency(thread, personas);
        checks.push(toneCheck);

        // 3. Overlap Detection
        const overlapCheck = await this.checkOverlap(thread);
        checks.push(overlapCheck);

        // 4. Format Validation
        const formatCheck = this.checkFormat(thread);
        checks.push(formatCheck);

        // 5. Conversation Flow
        const flowCheck = this.checkConversationFlow(thread);
        checks.push(flowCheck);

        // 6. Keyword Stuffing
        const keywordCheck = this.checkKeywordStuffing(thread);
        checks.push(keywordCheck);

        // Calculate overall score
        const overallScore = this.calculateOverallScore(checks);
        // Pass if overall score is good enough - don't require ALL checks to pass
        // Critical checks (ad_detection, format_validation) must pass, others are soft
        const criticalChecks = checks.filter(
            (c) => c.name === "ad_detection" || c.name === "format_validation",
        );
        const criticalsPassed = criticalChecks.every((c) => c.passed);
        const passed =
            criticalsPassed && overallScore >= this.MIN_OVERALL_SCORE;

        // Generate recommendations
        const recommendations = this.generateRecommendations(checks, thread);

        return {
            threadId: thread.id,
            overallScore,
            checks,
            passed,
            recommendations,
        };
    }

    /**
     * Quick validation without LLM calls (for batch processing)
     */
    quickValidate(
        thread: ThreadPlan,
        personas: Persona[],
    ): {
        valid: boolean;
        issues: string[];
    } {
        const issues: string[] = [];

        // Check format
        const formatCheck = this.checkFormat(thread);
        if (!formatCheck.passed) {
            issues.push(formatCheck.details);
        }

        // Check tone consistency
        const toneCheck = this.checkToneConsistency(thread, personas);
        if (!toneCheck.passed) {
            issues.push(toneCheck.details);
        }

        // Check conversation flow
        const flowCheck = this.checkConversationFlow(thread);
        if (!flowCheck.passed) {
            issues.push(flowCheck.details);
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }

    // ============================================================================
    // INDIVIDUAL CHECKS
    // ============================================================================

    /**
     * Use LLM to detect if content sounds like advertising
     */
    private async checkAdDetection(
        thread: ThreadPlan,
        productName: string,
    ): Promise<QualityCheck> {
        const prompt = buildCriticPrompt({
            thread: {
                subreddit: thread.post.subreddit,
                title: thread.post.title,
                body: thread.post.body,
                comments: thread.comments.map((c) => ({
                    username: c.personaId,
                    text: c.text,
                })),
            },
            productName,
        });

        const result = await this.llm.generateJSON<CriticResponse>(prompt);

        if (!result.success || !result.data) {
            // Fallback to heuristic check
            return this.heuristicAdCheck(thread, productName);
        }

        const critic = result.data;

        return {
            name: "ad_detection",
            passed: critic.adScore <= this.AD_SCORE_THRESHOLD,
            score: 1 - critic.adScore, // Invert so higher = better
            details:
                critic.adScore > this.AD_SCORE_THRESHOLD
                    ? `Content sounds too much like an ad (score: ${critic.adScore.toFixed(2)}). Issues: ${critic.issues.join("; ")}`
                    : `Content passes ad detection (score: ${critic.adScore.toFixed(2)})`,
        };
    }

    /**
     * Fallback heuristic ad detection
     */
    private heuristicAdCheck(
        thread: ThreadPlan,
        productName: string,
    ): QualityCheck {
        const allText = [
            thread.post.title,
            thread.post.body,
            ...thread.comments.map((c) => c.text),
        ]
            .join(" ")
            .toLowerCase();

        let adScore = 0;
        const issues: string[] = [];

        // Marketing buzzwords
        const buzzwords = [
            "revolutionary",
            "game-changer",
            "best-in-class",
            "industry-leading",
            "cutting-edge",
            "seamless",
            "robust",
            "scalable",
            "synergy",
            "leverage",
            "optimize",
            "streamline",
        ];

        for (const word of buzzwords) {
            if (allText.includes(word)) {
                adScore += 0.1;
                issues.push(`Contains buzzword: "${word}"`);
            }
        }

        // Excessive product mentions
        const productMentions = (
            allText.match(new RegExp(productName.toLowerCase(), "g")) || []
        ).length;
        if (productMentions > 3) {
            adScore += 0.2;
            issues.push(`Product mentioned ${productMentions} times`);
        }

        // Superlatives
        const superlatives = [
            "best",
            "amazing",
            "incredible",
            "perfect",
            "must-have",
        ];
        for (const word of superlatives) {
            const regex = new RegExp(`\\b${word}\\b`, "gi");
            const matches = allText.match(regex) || [];
            if (matches.length > 1) {
                adScore += 0.1;
                issues.push(`Overuses superlative: "${word}"`);
            }
        }

        // No criticism or alternatives mentioned
        const criticalWords = [
            "but",
            "however",
            "although",
            "downside",
            "issue",
            "problem",
            "alternative",
            "competitor",
            "instead",
        ];
        const hasCriticism = criticalWords.some((w) => allText.includes(w));
        if (!hasCriticism && productMentions > 0) {
            adScore += 0.15;
            issues.push("No criticism or alternatives mentioned");
        }

        adScore = Math.min(1, adScore);

        return {
            name: "ad_detection",
            passed: adScore <= this.AD_SCORE_THRESHOLD,
            score: 1 - adScore,
            details:
                issues.length > 0
                    ? `Heuristic ad check issues: ${issues.join("; ")}`
                    : "Content passes heuristic ad detection",
        };
    }

    /**
     * Check if personas maintain consistent tone/style
     */
    private checkToneConsistency(
        thread: ThreadPlan,
        personas: Persona[],
    ): QualityCheck {
        const issues: string[] = [];
        let consistencyScore = 1.0;

        // Build persona lookup
        const personaMap = new Map(personas.map((p) => [p.id, p]));

        // Check each comment against persona style
        for (const comment of thread.comments) {
            const persona = personaMap.get(comment.personaId);
            if (!persona) continue;

            const text = comment.text.toLowerCase();

            // Check emoji usage
            const hasEmoji =
                /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u.test(
                    comment.text,
                );
            if (hasEmoji && !persona.writingStyle.usesEmojis) {
                issues.push(`${persona.username} used emojis but shouldn't`);
                consistencyScore -= 0.1;
            }

            // Check formality
            const formalIndicators = [
                "therefore",
                "furthermore",
                "consequently",
                "regarding",
                "pursuant",
            ];
            const informalIndicators = [
                "lol",
                "haha",
                "tbh",
                "ngl",
                "gonna",
                "wanna",
                "kinda",
            ];

            const hasFormal = formalIndicators.some((w) => text.includes(w));
            const hasInformal = informalIndicators.some((w) =>
                text.includes(w),
            );

            if (persona.writingStyle.formality === "formal" && hasInformal) {
                issues.push(`${persona.username} used informal language`);
                consistencyScore -= 0.15;
            }

            if (persona.writingStyle.formality === "informal" && hasFormal) {
                issues.push(`${persona.username} used overly formal language`);
                consistencyScore -= 0.1;
            }

            // Check sentence length (rough heuristic)
            const sentences = comment.text
                .split(/[.!?]+/)
                .filter((s) => s.trim());
            const avgWords =
                sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) /
                Math.max(sentences.length, 1);

            if (
                persona.writingStyle.sentenceLength === "short" &&
                avgWords > 15
            ) {
                issues.push(
                    `${persona.username} used long sentences (avg ${avgWords.toFixed(1)} words)`,
                );
                consistencyScore -= 0.1;
            }

            if (
                persona.writingStyle.sentenceLength === "long" &&
                avgWords < 8
            ) {
                issues.push(`${persona.username} used very short sentences`);
                consistencyScore -= 0.05;
            }
        }

        consistencyScore = Math.max(0, consistencyScore);

        return {
            name: "tone_consistency",
            passed: consistencyScore >= this.MIN_CONSISTENCY_SCORE,
            score: consistencyScore,
            details:
                issues.length > 0
                    ? `Tone inconsistencies: ${issues.join("; ")}`
                    : "All personas maintain consistent tone",
        };
    }

    /**
     * Check for topic overlap with recent posts
     */
    private async checkOverlap(thread: ThreadPlan): Promise<QualityCheck> {
        const recentEmbeddings = this.persistence.getRecentTopicEmbeddings(30);

        if (recentEmbeddings.length === 0 || !thread.post.topicEmbedding) {
            return {
                name: "overlap_detection",
                passed: true,
                score: 1.0,
                details: "No recent posts to compare against",
            };
        }

        let maxSimilarity = 0;
        let mostSimilarId = "";

        for (const { id, embedding } of recentEmbeddings) {
            const similarity = this.llm.cosineSimilarity(
                thread.post.topicEmbedding,
                embedding,
            );

            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                mostSimilarId = id;
            }
        }

        const passed = maxSimilarity < this.SIMILARITY_THRESHOLD;

        return {
            name: "overlap_detection",
            passed,
            score: 1 - maxSimilarity,
            details: passed
                ? `Topic is sufficiently unique (max similarity: ${(maxSimilarity * 100).toFixed(1)}%)`
                : `Topic too similar to recent post ${mostSimilarId} (${(maxSimilarity * 100).toFixed(1)}% similar)`,
        };
    }

    /**
     * Validate format - no placeholders, proper structure
     */
    private checkFormat(thread: ThreadPlan): QualityCheck {
        const issues: string[] = [];
        let score = 1.0;

        // Check for placeholders
        const placeholderPatterns = [
            /\[.*?\]/g, // [Insert X here]
            /\{.*?\}/g, // {placeholder}
            /<.*?>/g, // <PLACEHOLDER>
            /TODO/gi,
            /FIXME/gi,
            /XXX/gi,
        ];

        const allText = [
            thread.post.title,
            thread.post.body,
            ...thread.comments.map((c) => c.text),
        ].join(" ");

        for (const pattern of placeholderPatterns) {
            const matches = allText.match(pattern);
            if (matches && matches.length > 0) {
                // Filter out legitimate uses like [deleted] or common markdown
                const suspicious = matches.filter(
                    (m) =>
                        ![
                            "[deleted]",
                            "[removed]",
                            "[link]",
                            "[here]",
                        ].includes(m.toLowerCase()) && m.length > 2,
                );

                if (suspicious.length > 0) {
                    issues.push(`Contains placeholder: ${suspicious[0]}`);
                    score -= 0.3;
                }
            }
        }

        // Check post title length
        if (thread.post.title.length < 10) {
            issues.push("Title too short");
            score -= 0.2;
        }

        if (thread.post.title.length > 200) {
            issues.push("Title too long");
            score -= 0.1;
        }

        // Check post body exists
        if (thread.post.body.trim().length < 20) {
            issues.push("Post body too short");
            score -= 0.2;
        }

        // Check comments have content
        for (const comment of thread.comments) {
            if (comment.text.trim().length < 5) {
                issues.push(`Comment by ${comment.personaId} is too short`);
                score -= 0.15;
            }
        }

        score = Math.max(0, score);

        return {
            name: "format_validation",
            passed: issues.length === 0,
            score,
            details:
                issues.length > 0
                    ? `Format issues: ${issues.join("; ")}`
                    : "Format validation passed",
        };
    }

    /**
     * Check conversation flow - does it feel natural?
     */
    private checkConversationFlow(thread: ThreadPlan): QualityCheck {
        const issues: string[] = [];
        let score = 1.0;

        // Check for consecutive comments by same persona
        for (let i = 1; i < thread.comments.length; i++) {
            if (
                thread.comments[i].personaId ===
                thread.comments[i - 1].personaId
            ) {
                issues.push("Consecutive comments by same persona");
                score -= 0.3;
            }
        }

        // Check timing - comments should have reasonable delays
        for (const comment of thread.comments) {
            if (comment.delayMinutes < 1) {
                issues.push("Comment delay too short (< 1 min)");
                score -= 0.1;
            }

            if (comment.delayMinutes > 1440) {
                // > 24 hours
                issues.push("Comment delay too long (> 24 hours)");
                score -= 0.1;
            }
        }

        // Check reply structure makes sense
        const commentIds = new Set(
            thread.comments.map((_, i) => `comment_${i}`),
        );
        commentIds.add("root");

        for (const comment of thread.comments) {
            if (
                comment.replyTo !== "root" &&
                !comment.replyTo.startsWith("comment_")
            ) {
                issues.push(`Invalid reply target: ${comment.replyTo}`);
                score -= 0.2;
            }
        }

        // OP shouldn't be first commenter
        if (
            thread.comments.length > 0 &&
            thread.comments[0].personaId === thread.post.opPersonaId
        ) {
            issues.push("OP is first commenter on their own post");
            score -= 0.3;
        }

        score = Math.max(0, score);

        return {
            name: "conversation_flow",
            passed: score >= 0.6,
            score,
            details:
                issues.length > 0
                    ? `Flow issues: ${issues.join("; ")}`
                    : "Conversation flow is natural",
        };
    }

    /**
     * Check for keyword stuffing and repetitive patterns
     *
     * Since targetKeywords contains IDs (like 'K1'), not actual terms,
     * we check for general repetition patterns that indicate stuffing.
     */
    private checkKeywordStuffing(thread: ThreadPlan): QualityCheck {
        const allText = [
            thread.post.title,
            thread.post.body,
            ...thread.comments.map((c) => c.text),
        ]
            .join(" ")
            .toLowerCase();

        const words = allText.split(/\s+/).filter((w) => w.length > 3); // Only words > 3 chars
        const wordCount = words.length;

        if (wordCount === 0) {
            return {
                name: "keyword_stuffing",
                passed: true,
                score: 1.0,
                details: "Content too short to analyze",
            };
        }

        let stuffingScore = 0;
        const issues: string[] = [];

        // Count word frequencies
        const wordFreq = new Map<string, number>();
        for (const word of words) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }

        // Check for any word appearing too frequently (>15% of content)
        // Relaxed thresholds - topic-related words naturally repeat
        for (const [word, count] of wordFreq) {
            const density = count / wordCount;

            // Skip common words and short words
            const commonWords = new Set([
                "the",
                "and",
                "for",
                "that",
                "this",
                "with",
                "have",
                "from",
                "they",
                "been",
                "would",
                "could",
                "should",
                "about",
                "which",
                "their",
                "there",
                "what",
                "when",
                "your",
                "just",
                "like",
                "really",
                "pretty",
                "think",
                "know",
                "want",
                "need",
                "make",
                "some",
                "more",
                "very",
                "much",
                "also",
                "even",
                "well",
                "good",
                "time",
                "work",
                "using",
                "used",
                "thing",
                "things",
                "something",
                "anything",
            ]);

            if (commonWords.has(word)) continue;

            if (density > 0.15) {
                // More than 15% of content is this single word (relaxed from 10%)
                stuffingScore += 0.3;
                issues.push(
                    `Word "${word}" appears ${count} times (${(density * 100).toFixed(1)}% of content)`,
                );
            } else if (density > 0.12 && count >= 5) {
                // 12-15% with at least 5 occurrences (relaxed from 7% and 3)
                stuffingScore += 0.15;
                issues.push(
                    `Word "${word}" appears frequently (${(density * 100).toFixed(1)}%)`,
                );
            }
        }

        // Check for repetitive phrases (2-3 word sequences)
        // Only flag if truly excessive - 5+ repetitions
        const phrases = new Map<string, number>();
        for (let i = 0; i < words.length - 1; i++) {
            const twoWord = `${words[i]} ${words[i + 1]}`;
            phrases.set(twoWord, (phrases.get(twoWord) || 0) + 1);
        }

        for (const [phrase, count] of phrases) {
            if (count >= 5) {
                // Relaxed from 3
                stuffingScore += 0.2;
                issues.push(`Phrase "${phrase}" repeated ${count} times`);
            }
        }

        stuffingScore = Math.min(1, stuffingScore);
        const score = 1 - stuffingScore;

        return {
            name: "keyword_stuffing",
            passed: score >= 0.5, // Relaxed from 0.6
            score,
            details:
                issues.length > 0
                    ? `Keyword issues: ${issues.join("; ")}`
                    : "Keyword usage is natural",
        };
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    private calculateOverallScore(checks: QualityCheck[]): number {
        if (checks.length === 0) return 0;

        // Weighted average - ad detection and tone consistency are most important
        const weights: Record<string, number> = {
            ad_detection: 2.0,
            tone_consistency: 1.5,
            overlap_detection: 1.0,
            format_validation: 1.0,
            conversation_flow: 1.2,
            keyword_stuffing: 0.8,
        };

        let weightedSum = 0;
        let totalWeight = 0;

        for (const check of checks) {
            const weight = weights[check.name] || 1.0;
            weightedSum += check.score * weight;
            totalWeight += weight;
        }

        return Math.round((weightedSum / totalWeight) * 100);
    }

    private generateRecommendations(
        checks: QualityCheck[],
        thread: ThreadPlan,
    ): string[] {
        const recommendations: string[] = [];

        for (const check of checks) {
            if (check.passed) continue;

            switch (check.name as QualityCheckType) {
                case "ad_detection":
                    recommendations.push(
                        "Add a minor criticism or limitation of the product",
                        "Mention an alternative tool for balance",
                        "Remove marketing buzzwords",
                    );
                    break;

                case "tone_consistency":
                    recommendations.push(
                        "Review persona writing styles and adjust comments accordingly",
                        "Check emoji usage matches persona preferences",
                    );
                    break;

                case "overlap_detection":
                    recommendations.push(
                        "Choose a different angle or topic",
                        "Target different keywords",
                    );
                    break;

                case "format_validation":
                    recommendations.push(
                        "Remove any placeholder text",
                        "Ensure post title and body meet minimum length",
                    );
                    break;

                case "conversation_flow":
                    recommendations.push(
                        "Ensure different personas respond in sequence",
                        "Add reasonable time delays between comments",
                        "Don't have OP respond first to their own post",
                    );
                    break;

                case "keyword_stuffing":
                    recommendations.push(
                        "Reduce keyword frequency",
                        "Use synonyms and natural variations",
                    );
                    break;
            }
        }

        return [...new Set(recommendations)]; // Remove duplicates
    }
}
