
# StatsResponseDto


## Properties

Name | Type
------------ | -------------
`totalCalendars` | number
`totalPosts` | number
`subredditActivity` | object
`personaDistribution` | object
`keywordCoverage` | object

## Example

```typescript
import type { StatsResponseDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "totalCalendars": 5,
  "totalPosts": 15,
  "subredditActivity": {"r/PowerPoint":5,"r/SaaS":7,"r/startups":3},
  "personaDistribution": {"riley_ops":8,"jordan_consults":12,"alex_sells":6},
  "keywordCoverage": {"K1":3,"K3":2,"K7":4},
} satisfies StatsResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StatsResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


