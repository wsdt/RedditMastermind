
# RejectEntriesDto


## Properties

Name | Type
------------ | -------------
`entryIds` | Array&lt;string&gt;
`feedback` | string

## Example

```typescript
import type { RejectEntriesDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "entryIds": ["entry_1"],
  "feedback": The tone feels too promotional,
} satisfies RejectEntriesDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RejectEntriesDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


