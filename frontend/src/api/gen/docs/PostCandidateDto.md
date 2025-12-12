
# PostCandidateDto


## Properties

Name | Type
------------ | -------------
`id` | string
`title` | string
`body` | string
`subreddit` | string
`targetKeywords` | Array&lt;string&gt;
`opPersonaId` | string
`potentialImpact` | number
`generatedAt` | string

## Example

```typescript
import type { PostCandidateDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "id": post_abc123,
  "title": Best AI Presentation Tools in 2024?,
  "body": Looking for recommendations...,
  "subreddit": r/PowerPoint,
  "targetKeywords": ["K1","K3"],
  "opPersonaId": riley_ops,
  "potentialImpact": 75,
  "generatedAt": 2024-01-15T10:30:00.000Z,
} satisfies PostCandidateDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PostCandidateDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


