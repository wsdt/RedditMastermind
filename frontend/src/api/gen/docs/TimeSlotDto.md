
# TimeSlotDto


## Properties

Name | Type
------------ | -------------
`date` | string
`dayOfWeek` | string
`preferredHour` | number

## Example

```typescript
import type { TimeSlotDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "date": 2024-01-15T00:00:00.000Z,
  "dayOfWeek": Monday,
  "preferredHour": 14,
} satisfies TimeSlotDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TimeSlotDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


