import { API_VERSION, BE_ENDPOINT, IS_DEV_MODE } from "./misc.utils";

describe("Misc Utils", () => {
    describe("API_VERSION", () => {
        it("should have API version defined", () => {
            expect(API_VERSION).toBeDefined();
            expect(typeof API_VERSION).toBe("string");
            expect(API_VERSION).toBe("1");
        });
    });

    describe("IS_DEV_MODE", () => {
        it("should be a boolean", () => {
            expect(typeof IS_DEV_MODE).toBe("boolean");
        });
    });

    describe("BE_ENDPOINT", () => {
        it("should have backend endpoint defined", () => {
            expect(BE_ENDPOINT).toBeDefined();
            expect(typeof BE_ENDPOINT).toBe("string");
        });

        it("should use localhost in dev mode or production URL", () => {
            if (IS_DEV_MODE) {
                expect(BE_ENDPOINT).toContain("localhost");
            } else {
                expect(BE_ENDPOINT).toContain("https://");
            }
        });
    });
});
