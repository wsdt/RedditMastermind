
# PersonaWritingStyleDto


## Properties

Name | Type
------------ | -------------
`sentenceLength` | string
`usesEmojis` | boolean
`formality` | string
`typicalPhrases` | Array&lt;string&gt;

## Example

```typescript
import type { PersonaWritingStyleDto } from '@redditmastermind/api'

// TODO: Update the object below with actual values
const example = {
  "sentenceLength": medium,
  "usesEmojis": false,
  "formality": informal,
  "typicalPhrases": ["honestly","in my experience"],
} satisfies PersonaWritingStyleDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PersonaWritingStyleDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


