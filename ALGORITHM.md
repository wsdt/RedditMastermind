# 🧠 Reddit Mastermind: Algorithm Deep Dive

> A sophisticated Content Supply Chain for generating authentic, constraint-optimized Reddit content calendars.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Five-Phase Pipeline](#the-five-phase-pipeline)
3. [Phase 1: Generation (Creative Phase)](#phase-1-generation-creative-phase)
4. [Phase 2: Thread Assembly](#phase-2-thread-assembly)
5. [Phase 3: Quality Assurance (Adversarial Review)](#phase-3-quality-assurance-adversarial-review)
6. [Phase 4: Optimization (Constraint Satisfaction)](#phase-4-optimization-constraint-satisfaction)
7. [Phase 5: Calendar Construction](#phase-5-calendar-construction)
8. [Key Innovations](#key-innovations)
9. [Constraint System](#constraint-system)
10. [Scoring & Ranking](#scoring--ranking)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONTENT SUPPLY CHAIN                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  GENERATION  │ -> │   QUALITY    │ -> │ OPTIMIZATION │               │
│  │  (Creative)  │    │ (Adversarial)│    │   (CSP)      │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│         │                   │                   │                        │
│         v                   v                   v                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ Director-    │    │ 6 Quality    │    │ Hard + Soft  │               │
│  │ Actor Pattern│    │ Checks       │    │ Constraints  │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

The algorithm orchestrates three core services:
- **GenerationService**: Creative content creation using LLMs
- **QualityService**: Adversarial review to ensure authenticity
- **SchedulerService**: Constraint-based optimization for scheduling

---

## The Five-Phase Pipeline

When you request a content calendar, the system executes a sophisticated five-phase pipeline:

```typescript
Phase 1: Generation    → Generate 3x candidate posts (over-generation)
Phase 2: Threading     → Create full conversation threads with comments
Phase 3: Quality       → Adversarial review (filter out low-quality)
Phase 4: Optimization  → CSP solver assigns best posts to time slots
Phase 5: Calendar      → Build final calendar with metadata
```

### Why Over-Generation?

The algorithm generates **3x more candidates** than needed. This is intentional:

- Gives the optimizer more options to satisfy constraints
- Allows quality filtering without running out of content
- Enables selection of the mathematically optimal subset

---

## Phase 1: Generation (Creative Phase)

### The Director-Actor Pattern

Inspired by film production, content generation uses a **Director-Actor** architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIRECTOR-ACTOR PATTERN                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ DIRECTOR │ --> │  ACTORS  │ --> │ ASSEMBLER│                │
│  │          │     │          │     │          │                │
│  │ Plans    │     │ Generate │     │ Combine  │                │
│  │ scenes   │     │ dialogue │     │ into     │                │
│  │ & flow   │     │ in-voice │     │ threads  │                │
│  └──────────┘     └──────────┘     └──────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 1: Brainstorming

```typescript
// For each high-priority keyword, generate post ideas
const ideas = await brainstormIdeas(campaign, keyword, subreddit, recentTopics);
```

The brainstorm prompt:
- Targets specific keywords with urgency scoring
- Avoids topics similar to recent posts
- Generates 3 unique angles per keyword
- Scores potential impact (0-100)

#### Step 2: Director Planning

The Director LLM creates the conversation blueprint:

```typescript
interface DirectorPlan {
  postTitle: string;
  postBody: string;
  opPersonaId: string;
  comments: Array<{
    personaId: string;
    replyTo: 'root' | number;      // Reply structure
    keyPoints: string[];            // What to convey
    mentionsProduct: boolean;       // Strategic placement
    suggestedDelayMinutes: number;  // Natural timing
  }>;
  conversationArc: string;          // How the thread evolves
}
```

#### Four Conversation Styles

The Director adapts to different conversation dynamics:

| Style | Description | Use Case |
|-------|-------------|----------|
| `question-answer` | OP asks, others help | Help-seeking threads |
| `experience-sharing` | People share workflows | "How do you..." threads |
| `debate` | Friendly disagreement | Opinion threads |
| `agreement` | Building on each other | Appreciation threads |

#### Step 3: Actor Generation

Each persona generates their dialogue **in character**:

```typescript
const actorPrompt = buildActorPrompt({
  persona,                    // Full persona profile
  scene: {
    subreddit,
    postTitle,
    postBody,
    previousComments,         // Context awareness
    replyingTo,               // What they're responding to
  },
  direction: {
    keyPoints,                // What to convey
    mentionsProduct,          // Whether to mention product
    productName,
  },
});
```

**Persona Fidelity Features:**
- Sentence length matching (short/medium/long)
- Emoji usage control
- Formality level (informal/neutral/formal)
- Signature phrases injection
- Expertise-appropriate language
- Random subtle typos for authenticity

### Parallel Comment Generation

For efficiency, root comments are generated **in parallel** (they don't depend on each other), while reply comments are sequential (they need context):

```typescript
// Root comments - parallel
const rootResults = await Promise.all(
  rootComments.map(async (commentPlan) => {
    // Generate independently
  })
);

// Reply comments - sequential (need previous context)
for (const replyComment of replyComments) {
  // Generate with full thread context
}
```

---

## Phase 2: Thread Assembly

### Topic Embeddings

Each thread gets a **semantic embedding** for similarity detection:

```typescript
const embeddingResult = await this.llm.generateEmbedding(
  `${finalPost.title} ${finalPost.body}`
);
```

This enables:
- Cosine similarity checks against recent posts
- Topic diversity optimization
- Overlap detection in quality phase

### Engagement Estimation

The algorithm predicts engagement potential:

```typescript
private estimateEngagement(post: PostCandidate, comments: CommentPlan[]): number {
  let score = 50; // Base score

  // Title quality heuristics
  if (post.title.includes('?')) score += 10;  // Questions engage
  if (post.title.length < 60) score += 5;      // Concise titles
  if (post.title.length > 100) score -= 10;    // Too long

  // Comment quality
  score += comments.length * 5;                // More activity
  if (comments.some(c => c.mentionsProduct)) score += 5;

  // Commenter diversity
  const uniqueCommenters = new Set(comments.map(c => c.personaId)).size;
  score += uniqueCommenters * 3;

  return Math.min(100, Math.max(0, score));
}
```

---

## Phase 3: Quality Assurance (Adversarial Review)

### The Critic System

Every thread passes through **6 quality gates**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUALITY GATES                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 1. Ad       │  │ 2. Tone     │  │ 3. Overlap  │             │
│  │ Detection   │  │ Consistency │  │ Detection   │             │
│  │ (LLM+Heur.) │  │ (Heuristic) │  │ (Embedding) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 4. Format   │  │ 5. Flow     │  │ 6. Keyword  │             │
│  │ Validation  │  │ Check       │  │ Stuffing    │             │
│  │ (Regex)     │  │ (Heuristic) │  │ (Frequency) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Ad Detection (Critical)

**LLM-Based Analysis:**
```typescript
const criticPrompt = buildCriticPrompt({
  thread: { subreddit, title, body, comments },
  productName,
});

// Critic evaluates:
// - adScore: Does it sound like marketing? (0-1)
// - naturalScore: Does conversation flow naturally? (0-1)
// - consistencyScore: Are personas distinct? (0-1)
// - subtletyScore: Is product mention organic? (0-1)
// - balanceScore: Are alternatives mentioned? (0-1)
```

**Heuristic Fallback:**
```typescript
// Marketing buzzword detection
const buzzwords = [
  'revolutionary', 'game-changer', 'best-in-class',
  'industry-leading', 'cutting-edge', 'seamless'...
];

// Excessive product mentions
if (productMentions > 3) adScore += 0.2;

// Superlative overuse
// No criticism check (balanced content has some nuance)
```

### 2. Tone Consistency

Validates each persona stays in character:

```typescript
// Emoji usage matches persona setting
if (hasEmoji && !persona.writingStyle.usesEmojis) {
  issues.push(`${persona.username} used emojis but shouldn't`);
}

// Formality level check
const formalIndicators = ['therefore', 'furthermore', 'consequently'];
const informalIndicators = ['lol', 'haha', 'tbh', 'ngl', 'gonna'];

// Sentence length analysis
const avgWords = sentences.reduce((sum, s) => 
  sum + s.split(/\s+/).length, 0) / sentences.length;

if (persona.writingStyle.sentenceLength === 'short' && avgWords > 15) {
  issues.push(`${persona.username} used long sentences`);
}
```

### 3. Overlap Detection

Uses **cosine similarity** on embeddings:

```typescript
for (const { id, embedding } of recentEmbeddings) {
  const similarity = cosineSimilarity(
    thread.post.topicEmbedding,
    embedding
  );
  
  if (similarity > SIMILARITY_THRESHOLD) {
    // Too similar to recent post!
  }
}
```

### 4. Format Validation

Catches common LLM artifacts:

```typescript
const placeholderPatterns = [
  /\[.*?\]/g,    // [Insert X here]
  /\{.*?\}/g,    // {placeholder}
  /<.*?>/g,      // <PLACEHOLDER>
  /TODO/gi,
  /FIXME/gi,
];
```

### 5. Conversation Flow

Ensures natural thread structure:

```typescript
// No consecutive comments by same persona
// Reasonable timing delays (1 min - 24 hours)
// Valid reply structure
// OP isn't first commenter on their own post
```

### 6. Keyword Stuffing

Detects unnatural repetition:

```typescript
// Word frequency analysis
for (const [word, count] of wordFreq) {
  const density = count / wordCount;
  if (density > 0.15) {
    // Single word is 15%+ of content = stuffing
  }
}

// Phrase repetition detection
for (const [phrase, count] of phrases) {
  if (count >= 5) {
    // Same phrase 5+ times = unnatural
  }
}
```

### Weighted Scoring

```typescript
const weights: Record<string, number> = {
  ad_detection: 2.0,        // Most important
  tone_consistency: 1.5,    // Very important
  conversation_flow: 1.2,   // Important
  format_validation: 1.0,   // Standard
  overlap_detection: 1.0,   // Standard
  keyword_stuffing: 0.8,    // Less critical
};
```

### Pass/Fail Logic

```typescript
// Critical checks MUST pass
const criticalChecks = ['ad_detection', 'format_validation'];
const criticalsPassed = criticalChecks.every(c => c.passed);

// Overall score must meet minimum
const passed = criticalsPassed && overallScore >= 50;
```

---

## Phase 4: Optimization (Constraint Satisfaction)

### CSP Solver Overview

The scheduler implements a **Constraint Satisfaction Problem (CSP)** solver:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CSP SOLVER                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HARD CONSTRAINTS (must satisfy)                                │
│  ├── Subreddit Frequency: Max 1 post per 48 hours per sub      │
│  ├── Persona Self-Reply: No consecutive comments by same user  │
│  └── Weekly Limit: Respect postsPerWeek setting                │
│                                                                  │
│  SOFT CONSTRAINTS (optimize)                                    │
│  ├── Topic Diversity: Minimize semantic similarity             │
│  ├── Persona Distribution: Even usage across personas          │
│  └── Keyword Coverage: Prioritize urgent/unused keywords       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Hard Constraints

#### 1. Subreddit Frequency (48-Hour Rule)

```typescript
function checkSubredditFrequency(
  thread: ThreadPlan,
  existingSchedule: ScheduledThread[],
  history: PostHistory[],
  proposedSlot: TimeSlot
): { passed: boolean; reason?: string } {
  // Check against scheduled posts
  for (const scheduled of existingSchedule) {
    if (scheduled.thread.post.subreddit !== subreddit) continue;
    
    const hoursDiff = Math.abs(
      (proposedDate.getTime() - scheduled.slot.date.getTime()) / (1000 * 60 * 60)
    );
    
    if (hoursDiff < 48) {
      return { passed: false, reason: `Already scheduled within 48 hours` };
    }
  }
  
  // Check against historical posts
  const twoDaysAgo = new Date(proposedDate.getTime() - 48 * 60 * 60 * 1000);
  const recentInSubreddit = history.filter(
    h => h.subreddit === subreddit && h.postedAt >= twoDaysAgo
  );
  
  if (recentInSubreddit.length > 0) {
    return { passed: false, reason: `Posted within last 48 hours` };
  }
  
  return { passed: true };
}
```

#### 2. Persona Self-Reply Prevention

```typescript
function checkPersonaSelfReply(thread: ThreadPlan): { passed: boolean } {
  const commenters = thread.comments.map(c => c.personaId);
  
  // No consecutive comments by same persona
  for (let i = 1; i < commenters.length; i++) {
    if (commenters[i] === commenters[i - 1]) {
      return { passed: false, reason: 'Consecutive comments by same persona' };
    }
  }
  
  // OP can't be first commenter
  if (commenters[0] === thread.post.opPersonaId) {
    return { passed: false, reason: 'OP cannot be first commenter' };
  }
  
  return { passed: true };
}
```

### Soft Constraints (Scoring Functions)

#### Topic Diversity Score

Uses **cosine similarity** on semantic embeddings:

```typescript
function scoreToDiversity(
  thread: ThreadPlan,
  existingSchedule: ScheduledThread[],
  history: PostHistory[]
): number {
  const embedding = thread.post.topicEmbedding;
  let maxSimilarity = 0;
  
  // Check against this week's schedule
  for (const scheduled of existingSchedule) {
    const similarity = cosineSimilarity(embedding, scheduled.thread.post.topicEmbedding);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  
  // Check against recent history
  for (const post of history.slice(-10)) {
    if (post.topicEmbedding) {
      const similarity = cosineSimilarity(embedding, post.topicEmbedding);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  // Convert similarity to diversity (inverse)
  return 1 - maxSimilarity;
}
```

#### Persona Distribution Score

Prefers even usage across personas:

```typescript
function scorePersonaDistribution(
  thread: ThreadPlan,
  personaUsageCounts: Map<string, number>
): number {
  const threadPersonas = new Set<string>();
  threadPersonas.add(thread.post.opPersonaId);
  thread.comments.forEach(c => threadPersonas.add(c.personaId));
  
  let totalUsage = 0;
  for (const personaId of threadPersonas) {
    totalUsage += personaUsageCounts.get(personaId) || 0;
  }
  
  // Lower usage = higher score
  const avgUsage = totalUsage / threadPersonas.size;
  return Math.max(0, 1 - avgUsage / 10);
}
```

#### Keyword Coverage Score

Prioritizes urgent (unused) keywords:

```typescript
function scoreKeywordCoverage(
  thread: ThreadPlan,
  usedKeywordsThisWeek: Set<string>,
  keywordUrgencies: Map<string, number>
): number {
  let totalUrgency = 0;
  let novelKeywords = 0;
  
  for (const keywordId of thread.post.targetKeywords) {
    totalUrgency += keywordUrgencies.get(keywordId) || 0.5;
    
    if (!usedKeywordsThisWeek.has(keywordId)) {
      novelKeywords += 1;
    }
  }
  
  const avgUrgency = totalUrgency / thread.post.targetKeywords.length;
  const noveltyRatio = novelKeywords / thread.post.targetKeywords.length;
  
  return avgUrgency * 0.6 + noveltyRatio * 0.4;
}
```

### Greedy Selection with Backtracking

```typescript
async scheduleThreads(threads: ThreadPlan[], campaign: CampaignInput) {
  const slots = generateTimeSlots(campaign.weekStartDate, campaign.postsPerWeek);
  const schedule: ScheduledThread[] = [];
  const usedThreads = new Set<string>();
  
  // Score all threads
  const scoredThreads = threads.map(thread => ({
    thread,
    score: scoreThread(thread, keywordUrgencies),
  }));
  scoredThreads.sort((a, b) => b.score - a.score);
  
  // Greedy assignment
  for (const slot of slots) {
    let bestFit: ThreadPlan | null = null;
    let bestScore = -1;
    
    for (const { thread, score } of scoredThreads) {
      if (usedThreads.has(thread.id)) continue;
      
      // Check all constraints
      const constraints = checkAllConstraints(thread, slot, schedule, history);
      
      if (!constraints.passed) continue;
      
      // Combined score with soft constraints
      const softScore = 
        constraints.softConstraints.topicDiversity * 0.4 +
        constraints.softConstraints.personaDistribution * 0.3 +
        constraints.softConstraints.keywordCoverage * 0.3;
      
      const combinedScore = score * 0.6 + softScore * 0.4;
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestFit = thread;
      }
    }
    
    if (bestFit) {
      schedule.push({ thread: bestFit, slot, ... });
      usedThreads.add(bestFit.id);
    }
  }
  
  return schedule;
}
```

---

## Phase 5: Calendar Construction

### Time Slot Generation

Distributes posts across optimal posting times:

```typescript
generateTimeSlots(weekStartDate: Date, postsPerWeek: number): TimeSlot[] {
  // Optimal posting hours (Reddit activity peaks)
  const optimalHours = [9, 12, 15, 18, 21];
  
  // Spread posts evenly across the week
  const dayInterval = Math.floor(7 / postsPerWeek);
  
  // Generate slots starting Monday
  for (let i = 0; i < postsPerWeek; i++) {
    const slotDate = new Date(weekStartDate);
    slotDate.setDate(slotDate.getDate() + currentDay);
    slotDate.setHours(optimalHours[i % optimalHours.length], 0, 0, 0);
    
    slots.push({
      date: slotDate,
      dayOfWeek: daysOfWeek[slotDate.getDay()],
      preferredHour: hour,
    });
  }
}
```

### Calendar Metadata

Rich analytics computed for each calendar:

```typescript
interface CalendarMetadata {
  totalPosts: number;
  subredditDistribution: Record<string, number>;  // Posts per subreddit
  personaUsage: Record<string, number>;           // Usage count per persona
  keywordsCovered: string[];                       // Keywords addressed
  qualityScore: number;                            // Aggregate quality (0-100)
  diversityScore: number;                          // Topic diversity (0-100)
}
```

---

## Key Innovations

### 1. 🎭 Director-Actor Pattern

Unlike simple prompt-and-generate approaches, this system separates **planning** from **execution**:

- **Director**: Strategic planning, conversation flow, persona selection
- **Actors**: Tactical execution, staying in character, generating dialogue

This produces more coherent, natural-feeling threads.

### 2. 🔍 Adversarial Quality Review

The system acts as its own critic:

- LLM-based ad detection catches subtle marketing language
- Multiple heuristic checks catch common failure modes
- Weighted scoring allows nuanced pass/fail decisions

### 3. 📊 Semantic Diversity via Embeddings

Topic diversity isn't just keyword matching—it's **semantic**:

```typescript
// Cosine similarity on embeddings catches:
// - "Best PowerPoint alternatives" vs "Top presentation tools" (same topic!)
// - "AI for slides" vs "Machine learning presentations" (similar!)
```

### 4. ⏰ Keyword Urgency Decay

Keywords become more "urgent" over time:

```typescript
getKeywordUrgency(keywordId: string): number {
  const daysSinceUsed = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
  
  // Urgency increases over time, maxes at 1.0 after 14 days
  return Math.min(1.0, daysSinceUsed / 14);
}
```

This ensures balanced keyword coverage over time.

### 5. 🎯 Multi-Objective Optimization

The scheduler optimizes multiple objectives simultaneously:

```
Final Score = 
  (Thread Quality × 0.6) + 
  (Topic Diversity × 0.16) + 
  (Persona Distribution × 0.12) + 
  (Keyword Coverage × 0.12)
```

### 6. 🔄 Graceful Degradation

If not enough threads pass quality checks, the system uses the **best failing ones**:

```typescript
if (qualifiedThreads.length < campaign.postsPerWeek) {
  const sortedFailed = failedThreads.sort((a, b) => 
    qualityResults.get(b.id)?.overallScore - qualityResults.get(a.id)?.overallScore
  );
  
  // Use best of the rest
  qualifiedThreads.push(...sortedFailed.slice(0, needed));
}
```

---

## Constraint System

### Hard vs Soft Constraints

| Type | Behavior | Examples |
|------|----------|----------|
| **Hard** | Must satisfy (violation = rejection) | 48-hour subreddit rule, no self-reply |
| **Soft** | Should optimize (violation = lower score) | Topic diversity, persona balance |

### Constraint Check Result

```typescript
interface ConstraintCheckResult {
  passed: boolean;
  hardConstraints: {
    subredditFrequency: boolean;
    personaNoSelfReply: boolean;
    weeklyLimit: boolean;
  };
  softConstraints: {
    topicDiversity: number;      // 0-1
    personaDistribution: number; // 0-1
    keywordCoverage: number;     // 0-1
  };
  warnings: string[];
}
```

---

## Scoring & Ranking

### Thread Scoring Formula

```typescript
scoreThread(thread: ThreadPlan): number {
  let score = 0;
  
  // Estimated engagement (30%)
  score += (thread.estimatedEngagement / 100) * 0.3;
  
  // Keyword urgency (40%)
  const avgUrgency = thread.post.targetKeywords
    .map(k => keywordUrgencies.get(k))
    .reduce((a, b) => a + b, 0) / thread.post.targetKeywords.length;
  score += avgUrgency * 0.4;
  
  // Comment quality (15%)
  const commentScore = Math.min(1.0, thread.comments.length / 4);
  score += commentScore * 0.15;
  
  // Product mention subtlety (15%)
  const mentions = thread.comments.filter(c => c.mentionsProduct);
  if (mentions.length > 0) {
    const avgSubtlety = mentions.reduce((sum, c) => sum + c.subtletyScore, 0) / mentions.length;
    score += avgSubtlety * 0.15;
  }
  
  return score;
}
```

### Candidate Ranking

```typescript
rankCandidates(candidates: PostCandidate[]): ScoredCandidate[] {
  return candidates.map(candidate => {
    // Impact from generation (40%)
    const impact = candidate.potentialImpact / 100;
    
    // Keyword urgency (35%)
    const urgency = avgKeywordUrgency(candidate.targetKeywords);
    
    // Subreddit diversity (25%)
    const diversity = daysSinceLastPost(candidate.subreddit) / 7;
    
    const score = impact * 0.4 + urgency * 0.35 + diversity * 0.25;
    
    return { candidate, score };
  }).sort((a, b) => b.score - a.score);
}
```

---

## Summary

Reddit Mastermind's algorithm is a sophisticated **Content Supply Chain** that:

1. **Over-generates** creative content using the Director-Actor pattern
2. **Adversarially reviews** every piece for authenticity
3. **Optimally schedules** using constraint satisfaction
4. **Balances** multiple objectives: quality, diversity, coverage, and distribution
5. **Adapts** to history, ensuring fresh content over time

The result: Authentic-feeling Reddit content that's strategically optimized while avoiding the telltale signs of manufactured engagement.

