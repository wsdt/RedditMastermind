import { Module } from "@nestjs/common";
import { GenerationModule } from "../generation/generation.module";
import { QualityService } from "./quality.service";

@Module({
    imports: [GenerationModule], // For LLMService
    providers: [QualityService],
    exports: [QualityService],
})
export class QualityModule {}
