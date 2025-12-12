
# HardConstraintsDto


## Properties

Name | Type
------------ | -------------
`subredditFrequency` | boolean
`personaNoSelfReply` | boolean
`weeklyLimit` | boolean

## Example

```typescript
import type { HardConstraintsDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "subredditFrequency": true,
  "personaNoSelfReply": true,
  "weeklyLimit": true,
} satisfies HardConstraintsDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as HardConstraintsDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


