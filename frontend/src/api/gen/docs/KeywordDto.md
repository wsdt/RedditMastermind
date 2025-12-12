
# KeywordDto


## Properties

Name | Type
------------ | -------------
`id` | string
`term` | string
`searchVolume` | number
`priorityScore` | number

## Example

```typescript
import type { KeywordDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "id": K1,
  "term": AI presentation maker,
  "searchVolume": 1200,
  "priorityScore": 8,
} satisfies KeywordDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as KeywordDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


