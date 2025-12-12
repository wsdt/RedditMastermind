
# ContentCalendarDto


## Properties

Name | Type
------------ | -------------
`id` | string
`weekStartDate` | string
`weekEndDate` | string
`campaignId` | string
`entries` | [Array&lt;ScheduledThreadDto&gt;](ScheduledThreadDto.md)
`metadata` | [CalendarMetadataDto](CalendarMetadataDto.md)
`status` | string
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { ContentCalendarDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "id": cal_jkl345,
  "weekStartDate": 2024-01-15T00:00:00.000Z,
  "weekEndDate": 2024-01-21T23:59:59.999Z,
  "campaignId": slideforge_demo,
  "entries": null,
  "metadata": null,
  "status": ready,
  "createdAt": 2024-01-15T10:30:00.000Z,
  "updatedAt": 2024-01-15T10:35:00.000Z,
} satisfies ContentCalendarDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ContentCalendarDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


