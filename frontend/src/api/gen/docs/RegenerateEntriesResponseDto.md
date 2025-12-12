
# RegenerateEntriesResponseDto


## Properties

Name | Type
------------ | -------------
`success` | boolean
`message` | string
`regeneratedCount` | number
`calendar` | [ContentCalendarDto](ContentCalendarDto.md)

## Example

```typescript
import type { RegenerateEntriesResponseDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "success": true,
  "message": Regenerated 2 entries,
  "regeneratedCount": 2,
  "calendar": null,
} satisfies RegenerateEntriesResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RegenerateEntriesResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


