import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { createSlideForgeCampaign } from "../domain/sample-data";
import { CampaignInput } from "../domain/types";
import { CalendarService } from "./calendar.service";
import {
    ContentCalendarDto,
    GenerateCalendarDto,
    GenerateCalendarResponseDto,
    GenerateDemoCalendarDto,
} from "./dto";

@ApiTags("calendar")
@Controller("calendar")
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) {}

    // ============================================================================
    // GENERATION ENDPOINTS
    // ============================================================================

    @Post("generate")
    @ApiOperation({
        summary: "Generate a new content calendar",
        description:
            "Creates a complete content calendar with posts and comments based on the provided campaign configuration.",
    })
    @ApiBody({ type: GenerateCalendarDto })
    @ApiResponse({
        status: 201,
        description: "Calendar generated successfully",
        type: GenerateCalendarResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: "Invalid campaign configuration",
    })
    async generateCalendar(
        @Body() dto: GenerateCalendarDto,
    ): Promise<GenerateCalendarResponseDto> {
        // Validate required fields
        if (!dto.companyInfo?.name) {
            throw new HttpException(
                "Company info with name is required",
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!dto.personas || dto.personas.length < 2) {
            throw new HttpException(
                "At least 2 personas are required",
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!dto.subreddits || dto.subreddits.length === 0) {
            throw new HttpException(
                "At least 1 subreddit is required",
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!dto.keywords || dto.keywords.length === 0) {
            throw new HttpException(
                "At least 1 keyword is required",
                HttpStatus.BAD_REQUEST,
            );
        }

        if (
            !dto.postsPerWeek ||
            dto.postsPerWeek < 1 ||
            dto.postsPerWeek > 10
        ) {
            throw new HttpException(
                "Posts per week must be between 1 and 10",
                HttpStatus.BAD_REQUEST,
            );
        }

        const campaign: CampaignInput = {
            companyInfo: dto.companyInfo,
            personas: dto.personas,
            subreddits: dto.subreddits,
            keywords: dto.keywords,
            postsPerWeek: dto.postsPerWeek,
            weekStartDate: dto.weekStartDate
                ? new Date(dto.weekStartDate)
                : new Date(),
        };

        const result = await this.calendarService.generateCalendar(campaign);
        return this.toGenerateResponseDto(result);
    }

    @Post("generate-demo")
    @ApiOperation({
        summary: "Generate a demo calendar using SlideForge sample data",
        description:
            "Quick way to test the system using pre-configured SlideForge campaign data.",
    })
    @ApiBody({ type: GenerateDemoCalendarDto, required: false })
    @ApiResponse({
        status: 201,
        description: "Demo calendar generated successfully",
        type: GenerateCalendarResponseDto,
    })
    async generateDemoCalendar(
        @Body() dto?: GenerateDemoCalendarDto,
    ): Promise<GenerateCalendarResponseDto> {
        const weekStartDate = dto?.weekStartDate
            ? new Date(dto.weekStartDate)
            : new Date();
        const campaign = createSlideForgeCampaign(weekStartDate);
        const result = await this.calendarService.generateCalendar(
            campaign,
            "slideforge_demo",
        );
        return this.toGenerateResponseDto(result);
    }

    @Post("generate-next")
    @ApiOperation({
        summary: "Generate calendar for the next week",
        description:
            "Continues from the last generated calendar, automatically calculating the next week start date.",
    })
    @ApiBody({ type: GenerateCalendarDto })
    @ApiResponse({
        status: 201,
        description: "Next week calendar generated successfully",
        type: GenerateCalendarResponseDto,
    })
    async generateNextWeek(
        @Body() dto: GenerateCalendarDto,
    ): Promise<GenerateCalendarResponseDto> {
        const campaign: CampaignInput = {
            companyInfo: dto.companyInfo,
            personas: dto.personas,
            subreddits: dto.subreddits,
            keywords: dto.keywords,
            postsPerWeek: dto.postsPerWeek,
            weekStartDate: new Date(), // Will be overridden
        };

        const result = await this.calendarService.generateNextWeek(campaign);
        return this.toGenerateResponseDto(result);
    }

    @Post("generate-next-demo")
    @ApiOperation({
        summary: "Generate next week demo calendar",
        description:
            "Generates the next week calendar using SlideForge sample data, continuing from the last calendar.",
    })
    @ApiResponse({
        status: 201,
        description: "Next week demo calendar generated successfully",
        type: GenerateCalendarResponseDto,
    })
    async generateNextWeekDemo(): Promise<GenerateCalendarResponseDto> {
        const campaign = createSlideForgeCampaign(new Date());
        const result = await this.calendarService.generateNextWeek(
            campaign,
            "slideforge_demo",
        );
        return this.toGenerateResponseDto(result);
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    private toGenerateResponseDto(result: any): GenerateCalendarResponseDto {
        return {
            success: result.success,
            calendar: result.calendar
                ? this.toCalendarDto(result.calendar)
                : undefined,
            errors: result.errors,
            warnings: result.warnings,
            generationTimeMs: result.generationTimeMs,
        };
    }

    private toCalendarDto(calendar: any): ContentCalendarDto {
        return {
            id: calendar.id,
            weekStartDate:
                calendar.weekStartDate instanceof Date
                    ? calendar.weekStartDate.toISOString()
                    : calendar.weekStartDate,
            weekEndDate:
                calendar.weekEndDate instanceof Date
                    ? calendar.weekEndDate.toISOString()
                    : calendar.weekEndDate,
            campaignId: calendar.campaignId,
            entries: calendar.entries.map((entry: any) => ({
                id: entry.id,
                thread: {
                    id: entry.thread.id,
                    post: {
                        id: entry.thread.post.id,
                        title: entry.thread.post.title,
                        body: entry.thread.post.body,
                        subreddit: entry.thread.post.subreddit,
                        targetKeywords: entry.thread.post.targetKeywords,
                        opPersonaId: entry.thread.post.opPersonaId,
                        potentialImpact: entry.thread.post.potentialImpact,
                        generatedAt:
                            entry.thread.post.generatedAt instanceof Date
                                ? entry.thread.post.generatedAt.toISOString()
                                : entry.thread.post.generatedAt,
                    },
                    comments: entry.thread.comments.map((c: any) => ({
                        id: c.id,
                        personaId: c.personaId,
                        text: c.text,
                        replyTo: c.replyTo,
                        delayMinutes: c.delayMinutes,
                        mentionsProduct: c.mentionsProduct,
                        subtletyScore: c.subtletyScore,
                    })),
                    conversationStyle: entry.thread.conversationStyle,
                    estimatedEngagement: entry.thread.estimatedEngagement,
                },
                slot: {
                    date:
                        entry.slot.date instanceof Date
                            ? entry.slot.date.toISOString()
                            : entry.slot.date,
                    dayOfWeek: entry.slot.dayOfWeek,
                    preferredHour: entry.slot.preferredHour,
                },
                status: entry.status,
                constraintsSatisfied: entry.constraintsSatisfied,
            })),
            metadata: calendar.metadata,
            status: calendar.status,
            createdAt:
                calendar.createdAt instanceof Date
                    ? calendar.createdAt.toISOString()
                    : calendar.createdAt,
            updatedAt:
                calendar.updatedAt instanceof Date
                    ? calendar.updatedAt.toISOString()
                    : calendar.updatedAt,
        };
    }
}
