import { Injectable } from "@nestjs/common";

/// @dev As outlined in your document, I'm assuming this part of the logic is already implemented/available in some capacity.
@Injectable()
export class ExecutionService {
    createRedditPost(): void {
        console.log("Created Reddit post");
    }

    createRedditComment(): void {
        console.log("Created Reddit comment");
    }
}
