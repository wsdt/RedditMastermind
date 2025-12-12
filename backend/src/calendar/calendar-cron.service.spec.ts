import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CalendarCronService } from "./calendar-cron.service";
import { CalendarService } from "./calendar.service";

describe("CalendarCronService", () => {
    let service: CalendarCronService;
    let calendarService: CalendarService;
    let loggerSpy: jest.SpyInstance;

    const mockGenerateCalendarResponse = {
        success: true,
        calendar: {
            id: "test_cal",
            entries: [{ id: "entry1" }, { id: "entry2" }],
        },
        errors: [],
        warnings: [],
        generationTimeMs: 5000,
    };

    beforeEach(async () => {
        const mockCalendarService = {
            generateCalendar: jest
                .fn()
                .mockResolvedValue(mockGenerateCalendarResponse),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarCronService,
                {
                    provide: CalendarService,
                    useValue: mockCalendarService,
                },
            ],
        }).compile();

        service = module.get<CalendarCronService>(CalendarCronService);
        calendarService = module.get<CalendarService>(CalendarService);

        loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
        jest.spyOn(Logger.prototype, "error").mockImplementation();
        jest.spyOn(Logger.prototype, "warn").mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("scheduleWeeklyCalendar", () => {
        it("should successfully generate weekly calendar", async () => {
            await service.scheduleWeeklyCalendar();

            expect(calendarService.generateCalendar).toHaveBeenCalledWith(
                expect.objectContaining({
                    companyInfo: expect.objectContaining({
                        name: "Slideforge",
                    }),
                }),
                expect.stringContaining("slideforge_demo_"),
            );

            expect(loggerSpy).toHaveBeenCalledWith(
                "Starting weekly calendar generation cron job...",
            );
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Generating calendar for week starting",
                ),
            );
            expect(loggerSpy).toHaveBeenCalledWith(
                "Weekly calendar generated successfully with 2 entries",
            );
        });

        it("should handle calendar generation failure", async () => {
            const errorLogSpy = jest
                .spyOn(Logger.prototype, "error")
                .mockImplementation();

            jest.spyOn(calendarService, "generateCalendar").mockResolvedValue({
                success: false,
                errors: ["API Error", "Network timeout"],
                warnings: [],
                generationTimeMs: 1000,
            });

            await service.scheduleWeeklyCalendar();

            expect(errorLogSpy).toHaveBeenCalledWith(
                "Weekly calendar generation failed: API Error, Network timeout",
            );
        });

        it("should log warnings when present", async () => {
            const warnLogSpy = jest
                .spyOn(Logger.prototype, "warn")
                .mockImplementation();

            jest.spyOn(calendarService, "generateCalendar").mockResolvedValue({
                success: true,
                calendar: {
                    id: "test",
                    entries: [],
                } as any,
                errors: [],
                warnings: ["Low quality score", "Limited diversity"],
                generationTimeMs: 2000,
            });

            await service.scheduleWeeklyCalendar();

            expect(warnLogSpy).toHaveBeenCalledWith(
                "Warnings: Low quality score, Limited diversity",
            );
        });

        it("should handle exceptions during generation", async () => {
            const errorLogSpy = jest
                .spyOn(Logger.prototype, "error")
                .mockImplementation();

            jest.spyOn(calendarService, "generateCalendar").mockRejectedValue(
                new Error("Unexpected error"),
            );

            await service.scheduleWeeklyCalendar();

            expect(errorLogSpy).toHaveBeenCalledWith(
                "Weekly calendar cron job failed: Unexpected error",
            );
        });

        it("should handle non-Error exceptions", async () => {
            const errorLogSpy = jest
                .spyOn(Logger.prototype, "error")
                .mockImplementation();

            jest.spyOn(calendarService, "generateCalendar").mockRejectedValue(
                "String error",
            );

            await service.scheduleWeeklyCalendar();

            expect(errorLogSpy).toHaveBeenCalledWith(
                "Weekly calendar cron job failed: String error",
            );
        });
    });

    describe("getNextMonday", () => {
        it("should return next Monday when today is Sunday", () => {
            const sunday = new Date("2025-01-05T10:00:00");
            jest.useFakeTimers().setSystemTime(sunday);

            const nextMonday = (service as any).getNextMonday();

            expect(nextMonday.getDay()).toBe(1);
            expect(nextMonday.getDate()).toBe(6);
            expect(nextMonday.getHours()).toBe(0);
            expect(nextMonday.getMinutes()).toBe(0);
            expect(nextMonday.getSeconds()).toBe(0);

            jest.useRealTimers();
        });

        it("should return next Monday when today is Monday", () => {
            const monday = new Date("2025-01-06T10:00:00");
            jest.useFakeTimers().setSystemTime(monday);

            const nextMonday = (service as any).getNextMonday();

            expect(nextMonday.getDay()).toBe(1);
            expect(nextMonday.getDate()).toBe(13);

            jest.useRealTimers();
        });

        it("should return next Monday when today is Wednesday", () => {
            const wednesday = new Date("2025-01-08T10:00:00");
            jest.useFakeTimers().setSystemTime(wednesday);

            const nextMonday = (service as any).getNextMonday();

            expect(nextMonday.getDay()).toBe(1);
            expect(nextMonday.getDate()).toBe(13);

            jest.useRealTimers();
        });

        it("should return next Monday when today is Saturday", () => {
            const saturday = new Date("2025-01-11T10:00:00");
            jest.useFakeTimers().setSystemTime(saturday);

            const nextMonday = (service as any).getNextMonday();

            expect(nextMonday.getDay()).toBe(1);
            expect(nextMonday.getDate()).toBe(13);

            jest.useRealTimers();
        });

        it("should reset time to midnight", () => {
            const now = new Date("2025-01-08T15:30:45");
            jest.useFakeTimers().setSystemTime(now);

            const nextMonday = (service as any).getNextMonday();

            expect(nextMonday.getHours()).toBe(0);
            expect(nextMonday.getMinutes()).toBe(0);
            expect(nextMonday.getSeconds()).toBe(0);
            expect(nextMonday.getMilliseconds()).toBe(0);

            jest.useRealTimers();
        });
    });
});
