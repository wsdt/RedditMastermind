/**
 * Calendar Service - Orchestrates the Content Supply Chain
 *
 * This is the main orchestration layer that coordinates:
 * 1. Generation (creative content creation)
 * 2. Optimization (constraint-based scheduling)
 * 3. Quality (adversarial review)
 *
 * It provides the high-level operations: Generate, Approve, Regenerate
 */

import { Injectable, Logger } from "@nestjs/common";
import {
    CampaignInput,
    GenerateCalendarResponse,
    QualityReport,
    ThreadPlan,
} from "../domain/types";
import { GenerationService } from "../generation/generation.service";
import { SchedulerService } from "../optimisation/scheduler.service";
import { PersistenceService } from "../persistence/persistence.service";
import { QualityService } from "../quality/quality.service";

@Injectable()
export class CalendarService {
    private readonly logger = new Logger(CalendarService.name);

    constructor(
        private readonly generation: GenerationService,
        private readonly scheduler: SchedulerService,
        private readonly quality: QualityService,
        private readonly persistence: PersistenceService,
    ) {}

    /**
     * Generate a new content calendar for the given campaign
     * This is the main entry point for calendar creation
     */
    async generateCalendar(
        campaign: CampaignInput,
        campaignId: string = `campaign_${Date.now()}`,
    ): Promise<GenerateCalendarResponse> {
        const startTime = Date.now();
        const warnings: string[] = [];

        try {
            this.logger.log(
                `Starting calendar generation for ${campaign.companyInfo.name}`,
            );

            this.persistence.saveCampaign(campaignId, campaign);

            // Phase 1: Generation - Create candidate posts (over-generate by 3x)
            this.logger.log("Phase 1: Generating candidate posts...");
            const candidates = await this.generation.generateCandidates(
                campaign,
                2,
            );

            if (candidates.length === 0) {
                return {
                    success: false,
                    errors: ["Failed to generate any candidate posts"],
                    warnings,
                    generationTimeMs: Date.now() - startTime,
                };
            }

            this.logger.log(`Generated ${candidates.length} candidates`);

            // Phase 1.5: Rank candidates by quality/urgency before thread generation
            this.logger.log("Phase 1.5: Ranking candidates...");
            const rankedCandidates = this.scheduler.rankCandidates(
                candidates,
                campaign,
            );
            this.logger.log(
                `Top candidate score: ${rankedCandidates[0]?.score.toFixed(2) ?? "N/A"}`,
            );

            // Phase 2 & 3: Generate threads and run quality checks iteratively
            // We generate threads in batches and quality-check them until we have enough passing threads
            this.logger.log(
                "Phase 2 & 3: Generating threads and running quality checks...",
            );
            const threads: ThreadPlan[] = [];
            const qualityResults: Map<string, QualityReport> = new Map();
            const qualifiedThreads: ThreadPlan[] = [];
            const conversationStyles: ThreadPlan["conversationStyle"][] = [
                "question-answer",
                "experience-sharing",
                "debate",
                "agreement",
            ];

            // Target: at least postsPerWeek threads passing quality checks
            const targetPassingThreads = campaign.postsPerWeek;
            // Process candidates in batches until we have enough passing threads
            const batchSize = Math.max(2, campaign.postsPerWeek);
            let candidateIndex = 0;

            while (
                qualifiedThreads.length < targetPassingThreads &&
                candidateIndex < rankedCandidates.length
            ) {
                const batchEnd = Math.min(
                    candidateIndex + batchSize,
                    rankedCandidates.length,
                );
                const batchCandidates = rankedCandidates
                    .slice(candidateIndex, batchEnd)
                    .map((sc) => sc.candidate);

                this.logger.log(
                    `Processing candidates ${candidateIndex + 1}-${batchEnd} of ${rankedCandidates.length}...`,
                );

                for (let i = 0; i < batchCandidates.length; i++) {
                    const candidate = batchCandidates[i];
                    const styleIndex = candidateIndex + i;
                    const style =
                        conversationStyles[
                            styleIndex % conversationStyles.length
                        ];

                    try {
                        const thread = await this.generation.generateThread(
                            candidate,
                            campaign,
                            style,
                        );
                        threads.push(thread);

                        // Run quality check immediately
                        const report = await this.quality.evaluateThread(
                            thread,
                            campaign.companyInfo.name,
                            campaign.personas,
                        );

                        qualityResults.set(thread.id, report);

                        if (report.passed) {
                            qualifiedThreads.push(thread);
                            this.logger.log(
                                `Thread "${thread.post.title}" passed quality check (${qualifiedThreads.length}/${targetPassingThreads} needed)`,
                            );
                        } else {
                            this.logger.warn(
                                `Thread "${thread.post.title}" failed quality check: ${report.recommendations.join("; ")}`,
                            );
                            warnings.push(
                                `Quality check failed for "${thread.post.title}": score ${report.overallScore}/100`,
                            );
                        }

                        // Early exit if we have enough passing threads
                        if (qualifiedThreads.length >= targetPassingThreads) {
                            this.logger.log(
                                `Reached target of ${targetPassingThreads} passing threads, stopping generation`,
                            );
                            break;
                        }
                    } catch (error) {
                        this.logger.warn(
                            `Failed to generate thread for candidate ${candidate.id}: ${error}`,
                        );
                        warnings.push(`Skipped candidate: ${candidate.title}`);
                    }
                }

                candidateIndex = batchEnd;
            }

            if (threads.length === 0) {
                return {
                    success: false,
                    errors: ["Failed to generate any complete threads"],
                    warnings,
                    generationTimeMs: Date.now() - startTime,
                };
            }

            this.logger.log(
                `Generated ${threads.length} complete threads, ${qualifiedThreads.length} passed quality checks`,
            );

            // If not enough threads passed, use best failing ones
            if (qualifiedThreads.length < campaign.postsPerWeek) {
                this.logger.warn(
                    `Only ${qualifiedThreads.length}/${campaign.postsPerWeek} threads passed quality checks, using best failing ones`,
                );
                const failedThreads = threads.filter(
                    (t) => !qualifiedThreads.includes(t),
                );
                const sortedFailed = failedThreads.sort((a, b) => {
                    const scoreA = qualityResults.get(a.id)?.overallScore || 0;
                    const scoreB = qualityResults.get(b.id)?.overallScore || 0;
                    return scoreB - scoreA;
                });

                const needed = campaign.postsPerWeek - qualifiedThreads.length;
                for (
                    let i = 0;
                    i < Math.min(needed, sortedFailed.length);
                    i++
                ) {
                    qualifiedThreads.push(sortedFailed[i]);
                    warnings.push(
                        `Using below-threshold thread: "${sortedFailed[i].post.title}"`,
                    );
                }
            }

            // Phase 4: Optimization - Schedule the best threads
            this.logger.log("Phase 4: Scheduling threads...");
            const schedule = await this.scheduler.scheduleThreads(
                qualifiedThreads,
                campaign,
            );

            if (schedule.length === 0) {
                return {
                    success: false,
                    errors: ["Scheduler could not create any valid schedule"],
                    warnings,
                    generationTimeMs: Date.now() - startTime,
                };
            }

            // Phase 5: Build and save calendar
            this.logger.log("Phase 5: Building calendar...");
            const calendar = this.scheduler.buildCalendar(
                schedule,
                campaign,
                campaignId,
            );

            // Attach quality reports to entries
            for (const entry of calendar.entries) {
                const report = qualityResults.get(entry.thread.id);
                if (report) {
                    (entry as any).qualityReport = report;
                }
            }

            this.persistence.saveCalendar(calendar);

            this.logger.log(
                `Calendar generated successfully with ${calendar.entries.length} posts`,
            );

            return {
                success: true,
                calendar,
                warnings: warnings.length > 0 ? warnings : undefined,
                generationTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            this.logger.error(`Calendar generation failed: ${error}`);
            return {
                success: false,
                errors: [
                    error instanceof Error ? error.message : "Unknown error",
                ],
                warnings,
                generationTimeMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Generate calendar for the next week (continues from last calendar)
     */
    async generateNextWeek(
        campaign: CampaignInput,
        campaignId?: string,
    ): Promise<GenerateCalendarResponse> {
        const lastCalendar = this.persistence.getLatestCalendar();
        const nextWeekStart = this.scheduler.getNextWeekStart(lastCalendar);

        const updatedCampaign: CampaignInput = {
            ...campaign,
            weekStartDate: nextWeekStart,
        };

        this.logger.log(
            `Generating calendar for week starting ${nextWeekStart.toISOString().split("T")[0]}`,
        );

        return this.generateCalendar(
            updatedCampaign,
            campaignId || `campaign_${Date.now()}`,
        );
    }
}
