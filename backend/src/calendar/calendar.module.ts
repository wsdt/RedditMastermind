import { Module } from "@nestjs/common";
import { GenerationModule } from "../generation/generation.module";
import { OptimisationModule } from "../optimisation/optimisation.module";
import { QualityModule } from "../quality/quality.module";
import { CalendarCronService } from "./calendar-cron.service";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";

@Module({
    imports: [GenerationModule, OptimisationModule, QualityModule],
    controllers: [CalendarController],
    providers: [CalendarService, CalendarCronService],
    exports: [CalendarService],
})
export class CalendarModule {}
