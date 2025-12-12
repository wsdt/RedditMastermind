import { HttpException, HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { GenerateCalendarDto } from "./dto";

describe("CalendarController", () => {
    let controller: CalendarController;
    let service: CalendarService;

    const mockCalendarResult = {
        success: true,
        calendar: {
            id: "cal_123",
            weekStartDate: new Date("2025-01-06"),
            weekEndDate: new Date("2025-01-12"),
            campaignId: "test_campaign",
            entries: [
                {
                    id: "entry_1",
                    thread: {
                        id: "thread_1",
                        post: {
                            id: "post_1",
                            title: "Test Post",
                            body: "Test body",
                            subreddit: "r/test",
                            targetKeywords: ["k1"],
                            opPersonaId: "persona_1",
                            potentialImpact: 75,
                            generatedAt: new Date(),
                        },
                        comments: [
                            {
                                id: "c1",
                                personaId: "persona_2",
                                text: "Test comment",
                                replyTo: "root",
                                delayMinutes: 30,
                                mentionsProduct: false,
                                subtletyScore: 0.8,
                            },
                        ],
                        conversationStyle: "organic",
                        estimatedEngagement: 80,
                    },
                    slot: {
                        date: new Date("2025-01-06"),
                        dayOfWeek: "Monday",
                        preferredHour: 9,
                    },
                    status: "pending",
                    constraintsSatisfied: true,
                },
            ],
            metadata: {
                totalPosts: 1,
                qualityScore: 0.85,
                diversityScore: 0.9,
            },
            status: "approved",
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        errors: [],
        warnings: [],
        generationTimeMs: 5000,
    };

    const mockCalendarService = {
        generateCalendar: jest.fn().mockResolvedValue(mockCalendarResult),
        generateNextWeek: jest.fn().mockResolvedValue(mockCalendarResult),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CalendarController],
            providers: [
                {
                    provide: CalendarService,
                    useValue: mockCalendarService,
                },
            ],
        }).compile();

        controller = module.get<CalendarController>(CalendarController);
        service = module.get<CalendarService>(CalendarService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("generateCalendar", () => {
        const validDto: GenerateCalendarDto = {
            companyInfo: {
                name: "TestCo",
                website: "https://test.com",
                description: "Test company",
                valuePropositions: ["Value 1", "Value 2"],
            },
            personas: [
                {
                    id: "p1",
                    username: "user1",
                    bio: "Bio 1",
                    writingStyle: {
                        sentenceLength: "medium",
                        usesEmojis: false,
                        formality: "neutral",
                        typicalPhrases: [],
                    },
                    expertise: ["Topic 1"],
                    tone: "casual",
                },
                {
                    id: "p2",
                    username: "user2",
                    bio: "Bio 2",
                    writingStyle: {
                        sentenceLength: "short",
                        usesEmojis: true,
                        formality: "informal",
                        typicalPhrases: [],
                    },
                    expertise: ["Topic 2"],
                    tone: "enthusiastic",
                },
            ],
            subreddits: [
                {
                    name: "r/test",
                    typicalTopics: ["topic1"],
                    audienceType: "professionals",
                },
            ],
            keywords: [
                {
                    id: "k1",
                    term: "keyword1",
                    priorityScore: 5,
                },
            ],
            postsPerWeek: 3,
            weekStartDate: "2025-01-06",
        };

        it("should generate a calendar successfully", async () => {
            const result = await controller.generateCalendar(validDto);

            expect(result.success).toBe(true);
            expect(result.calendar).toBeDefined();
            expect(result.generationTimeMs).toBe(5000);
            expect(service.generateCalendar).toHaveBeenCalledWith(
                expect.objectContaining({
                    companyInfo: validDto.companyInfo,
                    personas: validDto.personas,
                    subreddits: validDto.subreddits,
                    keywords: validDto.keywords,
                    postsPerWeek: 3,
                }),
            );
        });

        it("should throw error if company name is missing", async () => {
            const invalidDto = { ...validDto };
            invalidDto.companyInfo = { ...validDto.companyInfo, name: "" };

            await expect(
                controller.generateCalendar(invalidDto),
            ).rejects.toThrow(
                new HttpException(
                    "Company info with name is required",
                    HttpStatus.BAD_REQUEST,
                ),
            );
        });

        it("should throw error if less than 2 personas", async () => {
            const invalidDto = {
                ...validDto,
                personas: [validDto.personas[0]],
            };

            await expect(
                controller.generateCalendar(invalidDto),
            ).rejects.toThrow(
                new HttpException(
                    "At least 2 personas are required",
                    HttpStatus.BAD_REQUEST,
                ),
            );
        });

        it("should throw error if no subreddits", async () => {
            const invalidDto = { ...validDto, subreddits: [] };

            await expect(
                controller.generateCalendar(invalidDto),
            ).rejects.toThrow(
                new HttpException(
                    "At least 1 subreddit is required",
                    HttpStatus.BAD_REQUEST,
                ),
            );
        });

        it("should throw error if no keywords", async () => {
            const invalidDto = { ...validDto, keywords: [] };

            await expect(
                controller.generateCalendar(invalidDto),
            ).rejects.toThrow(
                new HttpException(
                    "At least 1 keyword is required",
                    HttpStatus.BAD_REQUEST,
                ),
            );
        });

        it("should throw error if postsPerWeek is less than 1", async () => {
            const invalidDto = { ...validDto, postsPerWeek: 0 };

            await expect(
                controller.generateCalendar(invalidDto),
            ).rejects.toThrow(
                new HttpException(
                    "Posts per week must be between 1 and 10",
                    HttpStatus.BAD_REQUEST,
                ),
            );
        });

        it("should throw error if postsPerWeek is more than 10", async () => {
            const invalidDto = { ...validDto, postsPerWeek: 11 };

            await expect(
                controller.generateCalendar(invalidDto),
            ).rejects.toThrow(
                new HttpException(
                    "Posts per week must be between 1 and 10",
                    HttpStatus.BAD_REQUEST,
                ),
            );
        });

        it("should use current date if weekStartDate is not provided", async () => {
            const dtoWithoutDate = { ...validDto };
            delete dtoWithoutDate.weekStartDate;

            await controller.generateCalendar(dtoWithoutDate);

            expect(service.generateCalendar).toHaveBeenCalledWith(
                expect.objectContaining({
                    weekStartDate: expect.any(Date),
                }),
            );
        });
    });

    describe("generateDemoCalendar", () => {
        it("should generate demo calendar with provided date", async () => {
            const dto = { weekStartDate: "2025-01-06" };
            const result = await controller.generateDemoCalendar(dto);

            expect(result.success).toBe(true);
            expect(service.generateCalendar).toHaveBeenCalled();
        });

        it("should generate demo calendar without date", async () => {
            const result = await controller.generateDemoCalendar();

            expect(result.success).toBe(true);
            expect(service.generateCalendar).toHaveBeenCalledWith(
                expect.anything(),
                "slideforge_demo",
            );
        });
    });

    describe("generateNextWeek", () => {
        const validDto: GenerateCalendarDto = {
            companyInfo: {
                name: "TestCo",
                website: "https://test.com",
                description: "Test company",
                valuePropositions: ["Value 1"],
            },
            personas: [
                {
                    id: "p1",
                    username: "user1",
                    bio: "Bio 1",
                    writingStyle: {
                        sentenceLength: "medium",
                        usesEmojis: false,
                        formality: "neutral",
                        typicalPhrases: [],
                    },
                    expertise: ["Topic 1"],
                    tone: "casual",
                },
                {
                    id: "p2",
                    username: "user2",
                    bio: "Bio 2",
                    writingStyle: {
                        sentenceLength: "short",
                        usesEmojis: true,
                        formality: "informal",
                        typicalPhrases: [],
                    },
                    expertise: ["Topic 2"],
                    tone: "enthusiastic",
                },
            ],
            subreddits: [
                {
                    name: "r/test",
                    typicalTopics: ["topic1"],
                    audienceType: "professionals",
                },
            ],
            keywords: [
                {
                    id: "k1",
                    term: "keyword1",
                    priorityScore: 5,
                },
            ],
            postsPerWeek: 3,
        };

        it("should generate next week calendar", async () => {
            const result = await controller.generateNextWeek(validDto);

            expect(result.success).toBe(true);
            expect(service.generateNextWeek).toHaveBeenCalledWith(
                expect.objectContaining({
                    companyInfo: validDto.companyInfo,
                    personas: validDto.personas,
                }),
            );
        });
    });

    describe("generateNextWeekDemo", () => {
        it("should generate next week demo calendar", async () => {
            const result = await controller.generateNextWeekDemo();

            expect(result.success).toBe(true);
            expect(service.generateNextWeek).toHaveBeenCalledWith(
                expect.anything(),
                "slideforge_demo",
            );
        });
    });
});
