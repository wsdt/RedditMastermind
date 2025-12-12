
# PersonaDto


## Properties

Name | Type
------------ | -------------
`id` | string
`username` | string
`bio` | string
`writingStyle` | [PersonaWritingStyleDto](PersonaWritingStyleDto.md)
`expertise` | Array&lt;string&gt;
`tone` | string

## Example

```typescript
import type { PersonaDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "id": riley_ops,
  "username": riley_techops,
  "bio": Operations manager at a mid-size tech company,
  "writingStyle": null,
  "expertise": ["operations","productivity"],
  "tone": casual,
} satisfies PersonaDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PersonaDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


