
# GenerateCalendarResponseDto


## Properties

Name | Type
------------ | -------------
`success` | boolean
`calendar` | [ContentCalendarDto](ContentCalendarDto.md)
`errors` | Array&lt;string&gt;
`warnings` | Array&lt;string&gt;
`generationTimeMs` | number

## Example

```typescript
import type { GenerateCalendarResponseDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "success": true,
  "calendar": null,
  "errors": [],
  "warnings": [],
  "generationTimeMs": 4523,
} satisfies GenerateCalendarResponseDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GenerateCalendarResponseDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


