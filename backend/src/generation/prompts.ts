/**
 * LLM Prompts for the Generation Module
 *
 * These prompts implement the Director-Actor pattern:
 * - Director: Sets the scene and conversation dynamics
 * - Actors: Generate dialogue based on persona files
 * - Critic: Reviews for authenticity and ad-detection
 */

import { CompanyInfo, Keyword, Persona, Subreddit } from "../domain/types";

// ============================================================================
// DIRECTOR PROMPTS - Scene Setting
// ============================================================================

export function buildDirectorPrompt(params: {
    companyInfo: CompanyInfo;
    subreddit: Subreddit;
    targetKeywords: Keyword[];
    availablePersonas: Persona[];
    conversationStyle:
        | "debate"
        | "agreement"
        | "question-answer"
        | "experience-sharing";
}): string {
    const {
        companyInfo,
        subreddit,
        targetKeywords,
        availablePersonas,
        conversationStyle,
    } = params;

    const personaList = availablePersonas
        .map((p) => `- ${p.username}: ${p.bio.slice(0, 100)}...`)
        .join("\n");

    const keywordList = targetKeywords.map((k) => k.term).join(", ");

    return `You are a creative director planning an organic Reddit conversation thread.

## CONTEXT
- Subreddit: ${subreddit.name}
- Audience: ${subreddit.audienceType}
- Typical topics: ${subreddit.typicalTopics.join(", ")}

## PRODUCT TO SUBTLY FEATURE (DO NOT MAKE THIS OBVIOUS)
- Name: ${companyInfo.name}
- Description: ${companyInfo.description}
- Key benefits: ${companyInfo.valuePropositions.join("; ")}

## TARGET KEYWORDS (weave naturally, don't force)
${keywordList}

## AVAILABLE PERSONAS
${personaList}

## CONVERSATION STYLE: ${conversationStyle}
${getConversationStyleGuidance(conversationStyle)}

## YOUR TASK
Create a conversation outline that:
1. Starts with a genuine question or discussion that fits ${subreddit.name}
2. Naturally leads to ${companyInfo.name} being mentioned as ONE option among others
3. Feels like real people having a real conversation
4. Uses 2-4 of the available personas appropriately
5. Has natural timing gaps between responses (5-60 minutes)

## CRITICAL RULES
- The product should NOT be the focus - it should emerge naturally
- Include mentions of alternatives/competitors to seem balanced
- Personas should stay in character (students don't talk like executives)
- Some disagreement or nuance makes it more believable
- Never use marketing language or superlatives
- IMPORTANT: Only 1-2 comments should mention the product (mentionsProduct: true). Most comments should NOT mention the product at all.
- IMPORTANT: Each persona can only appear ONCE in the comments. No persona should have consecutive or multiple comments unless they are replying to each other.

## REDDIT AUTHENTICITY
- Many Reddit comments are SHORT (1-2 sentences, sometimes just a few words)
- Not every comment needs to be helpful or add value - some are just reactions
- Plan for varied comment lengths: some long and detailed, some very brief
- Include casual elements: lowercase starts, missing periods, "lol", "tbh", "imo" but do not overuse and only use if it truly fits the persona and moment.
- Real threads have tangents and off-topic replies
- Some comments should be slightly skeptical or ask follow-up questions

Output a JSON object with this structure:
{
  "postTitle": "...",
  "postBody": "...",
  "opPersonaId": "username of the poster",
  "comments": [
    {
      "personaId": "username of commenter",
      "replyTo": "root" | "comment_index",
      "keyPoints": ["what this comment should convey"],
      "mentionsProduct": true/false,
      "suggestedDelayMinutes": number,
      "commentLength": "short" | "medium" | "long" // short = 1-2 sentences, medium = 3-4, long = 5+
    }
  ],
  "conversationArc": "brief description of how the conversation flows"
}`;
}

function getConversationStyleGuidance(style: string): string {
    const guidance: Record<string, string> = {
        debate: `Create a friendly debate where personas have different opinions. 
One persona might be skeptical, another enthusiastic. 
The product should be mentioned as evidence in the debate, not as the conclusion.
Include some short dismissive or agreeing comments ("nah thats not true", "this ^", "hard disagree").`,

        agreement: `Create a thread where personas build on each other's points.
Start with a question, get helpful answers, and appreciation.
The product mention should feel like a helpful tip, not a pitch.
Include brief reactions like "+1", "seconding this", "yep same experience here".`,

        "question-answer": `Create a genuine help-seeking thread.
The OP has a real problem, others share their experiences and solutions.
The product is ONE of several solutions mentioned.
Some replies should be short ("have you tried X?", "what about Y?") not all detailed.`,

        "experience-sharing": `Create a thread where people share their workflows/experiences.
Multiple tools and approaches are discussed.
The product comes up as part of someone's personal workflow.
Mix of detailed comments and short reactions ("saving this thread", "wait this is genius").`,
    };

    return guidance[style] || guidance["question-answer"];
}

// ============================================================================
// ACTOR PROMPTS - Persona-Specific Dialogue
// ============================================================================

export function buildActorPrompt(params: {
    persona: Persona;
    scene: {
        subreddit: string;
        postTitle: string;
        postBody: string;
        previousComments: string[];
        replyingTo: string;
    };
    direction: {
        keyPoints: string[];
        mentionsProduct: boolean;
        productName?: string;
    };
}): string {
    const { persona, scene, direction } = params;

    const styleDescription = describeWritingStyle(persona);
    const previousContext =
        scene.previousComments.length > 0
            ? `Previous comments in thread:\n${scene.previousComments.join("\n---\n")}`
            : "You are writing the first response.";

    return `You are ${persona.username}. Write a Reddit comment in character.

## YOUR IDENTITY
${persona.bio}

## YOUR WRITING STYLE
${styleDescription}

## THE THREAD
Subreddit: ${scene.subreddit}
Title: "${scene.postTitle}"
Post: "${scene.postBody}"

${previousContext}

## YOU ARE REPLYING TO
${scene.replyingTo}

## WHAT TO CONVEY
${direction.keyPoints.map((p) => `- ${p}`).join("\n")}

${
    direction.mentionsProduct
        ? `
## PRODUCT MENTION
You may naturally mention ${direction.productName}, but:
- Don't sound like an ad
- Share it as personal experience, not a recommendation
- Be specific about what you liked (or didn't)
- It's okay to mention limitations or alternatives
`
        : "## Do NOT mention any specific products in this comment."
}

## RULES
- Stay 100% in character as ${persona.username}
- Match your typical sentence length (${persona.writingStyle.sentenceLength})
- ${persona.writingStyle.usesEmojis ? "You can use emojis sparingly" : "Do NOT use emojis"}
- Formality level: ${persona.writingStyle.formality}
- You might use phrases like: ${persona.writingStyle.typicalPhrases.join(", ")}

## REDDIT AUTHENTICITY (IMPORTANT)
- Keep it SHORT - most Reddit comments are 1-3 sentences max. Longer comments are rare.
- Don't always start sentences with capital letters - lowercase is common on reddit
- Skip periods at end of comments sometimes. commas instead of periods, run-on sentences
- Use Reddit slang naturally: "tbh", "imo", "ngl", "lol", "lmao", "idk", "afaik", "iirc" but do not overuse and only use if it truly fits the persona and moment.
- Occasional typos are fine (teh, dont, its/it's confusion, your/you're, etc.) but keep subtle
- Starting with "I mean," "Honestly," "Yeah," is common on reddit
- Sometimes just react briefly ("this", "same", "wait really?") with no extra text in the comment.
- Don't over-explain or be too thorough - real people are lazy typists
- Avoid perfect grammar and punctuation - it reads as corporate/fake
- NEVER sound like you're writing an email or formal document

Write ONLY the comment text, nothing else.`;
}

function describeWritingStyle(persona: Persona): string {
    const parts: string[] = [];

    parts.push(`Tone: ${persona.tone}`);
    parts.push(
        `Sentence length: typically ${persona.writingStyle.sentenceLength}`,
    );
    parts.push(`Formality: ${persona.writingStyle.formality}`);
    parts.push(
        `Emojis: ${persona.writingStyle.usesEmojis ? "yes, occasionally" : "no"}`,
    );
    parts.push(`Expertise areas: ${persona.expertise.join(", ")}`);

    if (persona.writingStyle.typicalPhrases.length > 0) {
        parts.push(
            `Signature phrases: "${persona.writingStyle.typicalPhrases.join('", "')}"`,
        );
    }

    return parts.join("\n");
}

// ============================================================================
// CRITIC PROMPTS - Quality Review
// ============================================================================

export function buildCriticPrompt(params: {
    thread: {
        subreddit: string;
        title: string;
        body: string;
        comments: Array<{ username: string; text: string }>;
    };
    productName: string;
}): string {
    const { thread, productName } = params;

    const commentsText = thread.comments
        .map((c, i) => `[${i + 1}] ${c.username}: ${c.text}`)
        .join("\n\n");

    return `You are a Reddit authenticity critic. Analyze this thread for signs of astroturfing or manufactured content.

## THE THREAD
Subreddit: ${thread.subreddit}
Title: "${thread.title}"

Post:
${thread.body}

Comments:
${commentsText}

## PRODUCT BEING PROMOTED
${productName}

## ANALYZE FOR
1. **Ad Detection**: Does any comment sound like marketing copy? (Score 0-1)
2. **Conversation Flow**: Does the back-and-forth feel natural? (Score 0-1)
3. **Persona Consistency**: Do users sound like real, distinct people? (Score 0-1)
4. **Subtlety**: Is the product mention organic or forced? (Score 0-1)
5. **Balance**: Are alternatives mentioned? Is there any nuance? (Score 0-1)
6. **Reddit Authenticity**: Do comments feel like real Reddit? Short, casual, imperfect? (Score 0-1)

## RED FLAGS TO CHECK
- Excessive praise without specifics
- Marketing buzzwords
- Unnatural enthusiasm
- Too-perfect timing of product mentions
- All commenters agreeing too readily
- Lack of personality in writing styles
- Comments that are too long, polished, or well-structured
- Perfect grammar and punctuation throughout
- Formal language that doesn't match Reddit's casual tone
- Missing typical Reddit elements (abbreviations, lowercase, short reactions)

Output JSON:
{
  "adScore": 0-1 (higher = more like an ad, BAD),
  "naturalScore": 0-1 (higher = more natural, GOOD),
  "consistencyScore": 0-1 (higher = personas are distinct, GOOD),
  "subtletyScore": 0-1 (higher = more subtle, GOOD),
  "balanceScore": 0-1 (higher = more balanced, GOOD),
  "overallScore": 0-100,
  "passed": true/false (true if overallScore >= 70),
  "issues": ["list of specific issues found"],
  "suggestions": ["list of improvements"]
}`;
}

// ============================================================================
// BRAINSTORM PROMPTS - Topic Generation
// ============================================================================

export function buildBrainstormPrompt(params: {
    companyInfo: CompanyInfo;
    keyword: Keyword;
    subreddit: Subreddit;
    recentTopics: string[]; // Topics to avoid
}): string {
    const { companyInfo, keyword, subreddit, recentTopics } = params;

    const avoidList =
        recentTopics.length > 0
            ? `\n## TOPICS TO AVOID (too similar to recent posts)\n${recentTopics.map((t) => `- ${t}`).join("\n")}`
            : "";

    return `Generate 3 unique Reddit post ideas for ${subreddit.name} that could naturally lead to discussing ${companyInfo.name}.

## CONTEXT
- Target keyword/query: "${keyword.term}"
- Subreddit: ${subreddit.name}
- Audience: ${subreddit.audienceType}
- Product: ${companyInfo.name} - ${companyInfo.description}
${avoidList}

## REQUIREMENTS
- Posts should be genuine questions or discussions that fit the subreddit
- The product should NOT be mentioned in the post itself
- Topics should allow for natural product mentions in comments
- Each idea should have a different angle/approach

## OUTPUT FORMAT
Return a JSON array:
[
  {
    "title": "Post title",
    "body": "Post body (2-4 sentences)",
    "angle": "brief description of the approach",
    "howProductFits": "how the product could naturally come up in comments",
    "potentialImpact": 1-100
  }
]`;
}

// ============================================================================
// POST GENERATION PROMPT
// ============================================================================

export function buildPostPrompt(params: {
    persona: Persona;
    subreddit: Subreddit;
    topic: {
        title: string;
        body: string;
        angle: string;
    };
}): string {
    const { persona, subreddit, topic } = params;

    return `You are ${persona.username}. Write a Reddit post for ${subreddit.name}.

## YOUR IDENTITY
${persona.bio}

## YOUR WRITING STYLE
- Tone: ${persona.tone}
- Sentence length: ${persona.writingStyle.sentenceLength}
- Formality: ${persona.writingStyle.formality}
- ${persona.writingStyle.usesEmojis ? "You use emojis occasionally" : "You do not use emojis"}

## POST CONCEPT
Title idea: "${topic.title}"
Body idea: "${topic.body}"
Angle: ${topic.angle}

## TASK
Rewrite this post in YOUR voice. Make it feel authentic to ${subreddit.name}.
- Adjust the title to sound like something you'd actually write
- Expand or modify the body to match your style
- Add personal context if it fits your background
- Keep it concise and genuine

## REDDIT AUTHENTICITY
- Titles are often lowercase or only first letter capitalized
- Body text should feel casual, not like a formal essay
- Okay to have minor typos, missing punctuation, or grammar slips (subtle!)
- Use reddit-speak where natural: "anyone else...", "is it just me or...", "help pls", etc.
- Don't over-explain - real people ramble a bit or leave things vague
- Starting with lowercase, skipping some punctuation is normal but do not overuse and only use if it truly fits the persona and moment.

Output JSON:
{
  "title": "your version of the title",
  "body": "your version of the body"
}`;
}
