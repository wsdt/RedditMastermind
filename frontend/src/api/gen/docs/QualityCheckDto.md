
# QualityCheckDto


## Properties

Name | Type
------------ | -------------
`name` | string
`passed` | boolean
`score` | number
`details` | string

## Example

```typescript
import type { QualityCheckDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "name": ad_detection,
  "passed": true,
  "score": 0.85,
  "details": Content appears natural and not promotional,
} satisfies QualityCheckDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as QualityCheckDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


