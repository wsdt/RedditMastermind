import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CalendarModule } from "./calendar/calendar.module";
import { ExecutionModule } from "./execution/execution.module";
import { PersistenceModule } from "./persistence/persistence.module";

@Module({
    imports: [
        ScheduleModule.forRoot(),
        PersistenceModule,
        ExecutionModule,
        CalendarModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
