/**
 * Sample Data based on SlideForge example from the PDF
 * This serves as both test data and documentation of expected inputs
 */

import {
    CampaignInput,
    CompanyInfo,
    Keyword,
    Persona,
    Subreddit,
} from "./types";

// ============================================================================
// SLIDEFORGE COMPANY INFO
// ============================================================================

export const SLIDEFORGE_COMPANY: CompanyInfo = {
    name: "Slideforge",
    website: "slideforge.ai",
    description:
        "Slideforge is an AI-powered presentation and storytelling tool that turns outlines or rough notes into polished, professional slide decks.",
    valuePropositions: [
        "Turns rough notes into polished slides automatically",
        "AI-powered design that saves hours of work",
        "Professional templates without the template hunting",
        "Perfect for consultants, startups, and busy professionals",
        "Better than manually picking fonts and layouts",
    ],
};

// ============================================================================
// PERSONAS - Each with distinct voice and background
// ============================================================================

export const SLIDEFORGE_PERSONAS: Persona[] = [
    // Generic/anonymous personas for natural conversation variety
    {
        id: "random_user_1",
        username: "throwaway_2847",
        bio: "Just a regular person browsing Reddit. I work a desk job and spend too much time online. I like to share my experiences but keep things casual.",
        writingStyle: {
            sentenceLength: "short",
            usesEmojis: false,
            formality: "informal",
            typicalPhrases: ["tbh", "idk", "same", "this"],
        },
        expertise: ["general knowledge", "everyday problems"],
        tone: "casual",
    },
    {
        id: "random_user_2",
        username: "lurker_turned_poster",
        bio: "Long-time lurker who occasionally comments when I have something useful to add. I work in tech but not as a developer.",
        writingStyle: {
            sentenceLength: "medium",
            usesEmojis: false,
            formality: "informal",
            typicalPhrases: ["honestly", "in my experience", "fwiw"],
        },
        expertise: ["tech", "productivity", "work life"],
        tone: "casual",
    },
    {
        id: "random_user_3",
        username: "helpful_stranger_42",
        bio: "I like helping people solve problems. Been using computers since the 90s and have tried pretty much every productivity tool out there.",
        writingStyle: {
            sentenceLength: "medium",
            usesEmojis: false,
            formality: "neutral",
            typicalPhrases: [
                "have you tried",
                "what worked for me",
                "might be worth checking out",
            ],
        },
        expertise: ["software", "productivity tools", "troubleshooting"],
        tone: "professional",
    },
    {
        id: "random_user_4",
        username: "curious_mind_99",
        bio: "Always looking to learn new things. I ask a lot of questions and appreciate when people share their knowledge.",
        writingStyle: {
            sentenceLength: "short",
            usesEmojis: true,
            formality: "informal",
            typicalPhrases: ["wait really?", "how does that work", "oh nice"],
        },
        expertise: ["asking questions", "learning"],
        tone: "enthusiastic",
    },
    {
        id: "random_user_5",
        username: "skeptical_sam",
        bio: "I take recommendations with a grain of salt. Been burned by too many hyped products. I prefer to see real results before jumping on bandwagons.",
        writingStyle: {
            sentenceLength: "medium",
            usesEmojis: false,
            formality: "informal",
            typicalPhrases: [
                "idk about that",
                "sounds too good to be true",
                "what's the catch",
            ],
        },
        expertise: ["critical thinking", "product evaluation"],
        tone: "skeptical",
    },
    // Named personas with specific backgrounds
    {
        id: "riley_ops",
        username: "riley_ops",
        bio: "I am Riley Hart, the head of operations at a SaaS startup that has grown faster than our processes can keep up. I spend half my time in spreadsheets and the other half trying to get our team aligned on priorities.",
        writingStyle: {
            sentenceLength: "medium",
            usesEmojis: false,
            formality: "neutral",
            typicalPhrases: [
                "Just like it says in the title",
                "Sweet I'll check it out",
                "trying to figure out",
            ],
        },
        expertise: [
            "operations",
            "SaaS",
            "team management",
            "process optimization",
        ],
        tone: "casual",
    },
    {
        id: "jordan_consults",
        username: "jordan_consults",
        bio: "I am Jordan Brooks, an independent consultant who works mostly with early stage startups. I help founders figure out their go-to-market strategy and often end up making their pitch decks too.",
        writingStyle: {
            sentenceLength: "long",
            usesEmojis: false,
            formality: "neutral",
            typicalPhrases: [
                "I've tried a bunch of tools",
                "For anything customer facing",
                "The only one that",
            ],
        },
        expertise: [
            "consulting",
            "pitch decks",
            "go-to-market",
            "startups",
            "presentations",
        ],
        tone: "professional",
    },
    {
        id: "emily_econ",
        username: "emily_econ",
        bio: "I am Emily Chen, a senior majoring in economics at a big state university where group projects are constant and everyone judges your slides.",
        writingStyle: {
            sentenceLength: "short",
            usesEmojis: true,
            formality: "informal",
            typicalPhrases: ["+1", "lol", "Same here"],
        },
        expertise: [
            "economics",
            "student life",
            "group projects",
            "presentations",
        ],
        tone: "enthusiastic",
    },
    {
        id: "alex_sells",
        username: "alex_sells",
        bio: "I am Alex Ramirez, the head of sales at a mid market SaaS company. I grew up giving demos and live presentations, so I know what works and what bombs.",
        writingStyle: {
            sentenceLength: "medium",
            usesEmojis: false,
            formality: "informal",
            typicalPhrases: [
                "I hate picking fonts lol",
                "saves my sanity",
                "looks really funky",
            ],
        },
        expertise: [
            "sales",
            "demos",
            "presentations",
            "SaaS",
            "customer facing",
        ],
        tone: "casual",
    },
    {
        id: "priya_pm",
        username: "priya_pm",
        bio: "I am Priya Nandakumar, a product manager at a tech company where priorities shift weekly and I need to communicate roadmaps clearly to stakeholders.",
        writingStyle: {
            sentenceLength: "medium",
            usesEmojis: false,
            formality: "neutral",
            typicalPhrases: [
                "Same here",
                "for anything customer facing",
                "fine for internal notes but",
            ],
        },
        expertise: [
            "product management",
            "roadmaps",
            "stakeholder communication",
            "tech",
        ],
        tone: "professional",
    },
];

// ============================================================================
// SUBREDDITS
// ============================================================================

export const SLIDEFORGE_SUBREDDITS: Subreddit[] = [
    {
        name: "r/PowerPoint",
        typicalTopics: [
            "presentation tips",
            "PowerPoint alternatives",
            "design help",
            "templates",
        ],
        audienceType: "Professionals and students seeking presentation help",
    },
    {
        name: "r/ClaudeAI",
        typicalTopics: [
            "AI tools",
            "Claude capabilities",
            "AI comparisons",
            "prompting",
        ],
        audienceType: "Tech-savvy users exploring AI tools",
    },
    {
        name: "r/Canva",
        typicalTopics: [
            "design tools",
            "Canva alternatives",
            "templates",
            "automation",
        ],
        audienceType: "Designers and non-designers using Canva",
    },
    {
        name: "r/SaaS",
        typicalTopics: [
            "SaaS tools",
            "productivity",
            "business software",
            "startups",
        ],
        audienceType: "SaaS founders, operators, and enthusiasts",
    },
    {
        name: "r/startups",
        typicalTopics: [
            "startup tools",
            "pitch decks",
            "fundraising",
            "productivity",
        ],
        audienceType: "Founders and startup employees",
    },
    {
        name: "r/consulting",
        typicalTopics: [
            "consulting tools",
            "client presentations",
            "deliverables",
            "efficiency",
        ],
        audienceType: "Consultants and freelancers",
    },
];

// ============================================================================
// KEYWORDS (ChatGPT queries to target)
// ============================================================================

export const SLIDEFORGE_KEYWORDS: Keyword[] = [
    { id: "K1", term: "best ai presentation maker", priorityScore: 10 },
    { id: "K2", term: "ai slide deck tool", priorityScore: 9 },
    { id: "K3", term: "pitch deck generator", priorityScore: 9 },
    { id: "K4", term: "alternatives to PowerPoint", priorityScore: 8 },
    { id: "K5", term: "how to make slides faster", priorityScore: 7 },
    { id: "K6", term: "design help for slides", priorityScore: 6 },
    { id: "K7", term: "Canva alternative for presentations", priorityScore: 8 },
    { id: "K8", term: "Claude vs Slideforge", priorityScore: 7 },
    { id: "K9", term: "best tool for business decks", priorityScore: 8 },
    { id: "K10", term: "automate my presentations", priorityScore: 7 },
    { id: "K11", term: "need help with pitch deck", priorityScore: 6 },
    { id: "K12", term: "tools for consultants", priorityScore: 7 },
    { id: "K13", term: "tools for startups", priorityScore: 7 },
    { id: "K14", term: "best ai design tool", priorityScore: 8 },
    { id: "K15", term: "Google Slides alternative", priorityScore: 7 },
    { id: "K16", term: "best storytelling tool", priorityScore: 6 },
];

// ============================================================================
// COMPLETE CAMPAIGN INPUT
// ============================================================================

export const SLIDEFORGE_CAMPAIGN: CampaignInput = {
    companyInfo: SLIDEFORGE_COMPANY,
    personas: SLIDEFORGE_PERSONAS,
    subreddits: SLIDEFORGE_SUBREDDITS,
    keywords: SLIDEFORGE_KEYWORDS,
    postsPerWeek: 3,
    weekStartDate: new Date(), // Will be set dynamically
};

// ============================================================================
// HELPER: Create a campaign with custom week start
// ============================================================================

export function createSlideForgeCampaign(weekStartDate: Date): CampaignInput {
    return {
        ...SLIDEFORGE_CAMPAIGN,
        weekStartDate,
    };
}
