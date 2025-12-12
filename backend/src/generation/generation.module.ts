import { Module } from "@nestjs/common";
import { GenerationService } from "./generation.service";
import { LLMService } from "./llm.service";

@Module({
    providers: [GenerationService, LLMService],
    exports: [GenerationService, LLMService],
})
export class GenerationModule {}
