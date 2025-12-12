/**
 * Calendar Cron Service - Weekly Content Calendar Scheduling
 *
 * This service runs a cron job every Sunday at midnight (00:00)
 * to automatically generate the content calendar for the upcoming week.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createSlideForgeCampaign } from "../domain/sample-data";
import { CalendarService } from "./calendar.service";

@Injectable()
export class CalendarCronService {
    private readonly logger = new Logger(CalendarCronService.name);

    constructor(private readonly calendarService: CalendarService) {}

    /**
     * Cron job that runs every Sunday at midnight (00:00).
     * Generates the content calendar for the upcoming week using demo data.
     */
    @Cron(CronExpression.EVERY_WEEK)
    async scheduleWeeklyCalendar(): Promise<void> {
        this.logger.log("Starting weekly calendar generation cron job...");

        try {
            const nextMonday = this.getNextMonday();
            this.logger.log(
                `Generating calendar for week starting ${nextMonday.toISOString().split("T")[0]}`,
            );

            const campaign = createSlideForgeCampaign(nextMonday);

            const result = await this.calendarService.generateCalendar(
                campaign,
                `slideforge_demo_${nextMonday.toISOString().split("T")[0]}`,
            );

            if (result.success) {
                this.logger.log(
                    `Weekly calendar generated successfully with ${result.calendar?.entries.length ?? 0} entries`,
                );
            } else {
                this.logger.error(
                    `Weekly calendar generation failed: ${result.errors?.join(", ")}`,
                );
            }

            if (result.warnings && result.warnings.length > 0) {
                this.logger.warn(`Warnings: ${result.warnings.join(", ")}`);
            }
        } catch (error) {
            this.logger.error(
                `Weekly calendar cron job failed: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * Get the date of the next Monday.
     * If today is Sunday, returns tomorrow (Monday).
     */
    private getNextMonday(): Date {
        const today = new Date();
        const dayOfWeek = today.getDay();
        // Days until Monday: Sunday=1, Monday=0, Tuesday=6, etc.
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;

        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);

        return nextMonday;
    }
}
