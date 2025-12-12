import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionService } from "./execution.service";

describe("ExecutionService", () => {
    let service: ExecutionService;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ExecutionService],
        }).compile();

        service = module.get<ExecutionService>(ExecutionService);
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe("createRedditPost", () => {
        it("should log when creating a Reddit post", () => {
            service.createRedditPost();

            expect(consoleLogSpy).toHaveBeenCalledWith("Created Reddit post");
        });
    });

    describe("createRedditComment", () => {
        it("should log when creating a Reddit comment", () => {
            service.createRedditComment();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Created Reddit comment",
            );
        });
    });
});
