import { Global, Module } from "@nestjs/common";
import { PersistenceService } from "./persistence.service";

@Global() // Make persistence available everywhere
@Module({
    providers: [PersistenceService],
    exports: [PersistenceService],
})
export class PersistenceModule {}
