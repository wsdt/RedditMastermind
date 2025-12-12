
# ScheduledThreadDto


## Properties

Name | Type
------------ | -------------
`id` | string
`thread` | [ThreadPlanDto](ThreadPlanDto.md)
`slot` | [TimeSlotDto](TimeSlotDto.md)
`status` | string
`constraintsSatisfied` | [ConstraintCheckResultDto](ConstraintCheckResultDto.md)
`qualityReport` | [QualityReportDto](QualityReportDto.md)

## Example

```typescript
import type { ScheduledThreadDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "id": entry_ghi012,
  "thread": null,
  "slot": null,
  "status": draft,
  "constraintsSatisfied": null,
  "qualityReport": null,
} satisfies ScheduledThreadDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ScheduledThreadDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


