
# CalendarMetadataDto


## Properties

Name | Type
------------ | -------------
`totalPosts` | number
`subredditDistribution` | object
`personaUsage` | object
`keywordsCovered` | Array&lt;string&gt;
`qualityScore` | number
`diversityScore` | number

## Example

```typescript
import type { CalendarMetadataDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "totalPosts": 3,
  "subredditDistribution": {"r/PowerPoint":1,"r/SaaS":2},
  "personaUsage": {"riley_ops":2,"jordan_consults":3},
  "keywordsCovered": ["K1","K3","K7"],
  "qualityScore": 82,
  "diversityScore": 78,
} satisfies CalendarMetadataDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CalendarMetadataDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


