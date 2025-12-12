import { Module } from "@nestjs/common";
import { ExecutionService } from "./execution.service";

@Module({
    imports: [],
    controllers: [],
    providers: [ExecutionService],
})
export class ExecutionModule {}
