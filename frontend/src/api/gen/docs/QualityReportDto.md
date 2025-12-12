
# QualityReportDto


## Properties

Name | Type
------------ | -------------
`threadId` | string
`overallScore` | number
`checks` | [Array&lt;QualityCheckDto&gt;](QualityCheckDto.md)
`passed` | boolean
`recommendations` | Array&lt;string&gt;

## Example

```typescript
import type { QualityReportDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "threadId": thread_abc123,
  "overallScore": 82,
  "checks": null,
  "passed": true,
  "recommendations": ["Consider varying sentence length"],
} satisfies QualityReportDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as QualityReportDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


