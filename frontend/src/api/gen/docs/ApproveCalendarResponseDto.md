
# ApproveCalendarResponseDto


## Properties

Name | Type
------------ | -------------
`success` | boolean
`message` | string
`entriesApproved` | number

## Example

```typescript
import type { ApproveCalendarResponseDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "success": true,
  "message": Calendar approved successfully,
  "entriesApproved": 3,
} satisfies ApproveCalendarResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ApproveCalendarResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


