
# ThreadPlanDto


## Properties

Name | Type
------------ | -------------
`id` | string
`post` | [PostCandidateDto](PostCandidateDto.md)
`comments` | [Array&lt;CommentPlanDto&gt;](CommentPlanDto.md)
`conversationStyle` | string
`estimatedEngagement` | number

## Example

```typescript
import type { ThreadPlanDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "id": thread_def456,
  "post": null,
  "comments": null,
  "conversationStyle": question-answer,
  "estimatedEngagement": 25,
} satisfies ThreadPlanDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ThreadPlanDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


