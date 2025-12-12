
# CommentPlanDto


## Properties

Name | Type
------------ | -------------
`id` | string
`personaId` | string
`text` | string
`replyTo` | string
`delayMinutes` | number
`mentionsProduct` | boolean
`subtletyScore` | number

## Example

```typescript
import type { CommentPlanDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "id": comment_xyz789,
  "personaId": jordan_consults,
  "text": I've tried a bunch of these...,
  "replyTo": root,
  "delayMinutes": 21,
  "mentionsProduct": true,
  "subtletyScore": 0.7,
} satisfies CommentPlanDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CommentPlanDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


