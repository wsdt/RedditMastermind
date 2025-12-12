
# CompanyInfoDto


## Properties

Name | Type
------------ | -------------
`name` | string
`website` | string
`description` | string
`valuePropositions` | Array&lt;string&gt;

## Example

```typescript
import type { CompanyInfoDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "name": SlideForge,
  "website": https://slideforge.ai,
  "description": AI-powered presentation tool,
  "valuePropositions": ["10x faster presentations","AI-powered design"],
} satisfies CompanyInfoDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CompanyInfoDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


