
# GenerateCalendarDto


## Properties

Name | Type
------------ | -------------
`companyInfo` | [CompanyInfoDto](CompanyInfoDto.md)
`personas` | [Array&lt;PersonaDto&gt;](PersonaDto.md)
`subreddits` | [Array&lt;SubredditDto&gt;](SubredditDto.md)
`keywords` | [Array&lt;KeywordDto&gt;](KeywordDto.md)
`postsPerWeek` | number
`weekStartDate` | string

## Example

```typescript
import type { GenerateCalendarDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "companyInfo": null,
  "personas": null,
  "subreddits": null,
  "keywords": null,
  "postsPerWeek": 3,
  "weekStartDate": 2024-01-15,
} satisfies GenerateCalendarDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GenerateCalendarDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


