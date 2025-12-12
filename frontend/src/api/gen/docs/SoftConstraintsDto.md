
# SoftConstraintsDto


## Properties

Name | Type
------------ | -------------
`topicDiversity` | number
`personaDistribution` | number
`keywordCoverage` | number

## Example

```typescript
import type { SoftConstraintsDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "topicDiversity": 0.85,
  "personaDistribution": 0.9,
  "keywordCoverage": 0.75,
} satisfies SoftConstraintsDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SoftConstraintsDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


