"use client";

import { useState } from "react";
import {
    CalendarApi,
    Configuration,
    type GenerateCalendarDto,
    type GenerateCalendarResponseDto,
    type KeywordDto,
    type PersonaDto,
    PersonaDtoToneEnum,
    type PersonaWritingStyleDto,
    PersonaWritingStyleDtoFormalityEnum,
    PersonaWritingStyleDtoSentenceLengthEnum,
    type SubredditDto,
} from "../api/gen/src";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = new CalendarApi(new Configuration({ basePath: API_BASE_URL }));

// Helper to get Monday of a given week
function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GenerateCalendarResponseDto | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"demo" | "custom">("demo");

    // Demo form state
    const [demoWeekStart, setDemoWeekStart] = useState(
        formatDate(getMonday(new Date())),
    );

    // Custom form state
    const [companyName, setCompanyName] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");
    const [companyDescription, setCompanyDescription] = useState("");
    const [valuePropositions, setValuePropositions] = useState("");
    const [postsPerWeek, setPostsPerWeek] = useState(3);
    const [weekStartDate, setWeekStartDate] = useState(
        formatDate(getMonday(new Date())),
    );

    // Personas state
    const [personas, setPersonas] = useState<PersonaDto[]>([
        createEmptyPersona(),
        createEmptyPersona(),
    ]);

    // Subreddits state
    const [subreddits, setSubreddits] = useState<SubredditDto[]>([
        createEmptySubreddit(),
    ]);

    // Keywords state
    const [keywords, setKeywords] = useState<KeywordDto[]>([
        createEmptyKeyword(),
    ]);

    function createEmptyPersona(): PersonaDto {
        return {
            id: crypto.randomUUID(),
            username: "",
            bio: "",
            writingStyle: {
                sentenceLength: PersonaWritingStyleDtoSentenceLengthEnum.medium,
                usesEmojis: false,
                formality: PersonaWritingStyleDtoFormalityEnum.neutral,
                typicalPhrases: [],
            },
            expertise: [],
            tone: PersonaDtoToneEnum.casual,
        };
    }

    function createEmptySubreddit(): SubredditDto {
        return {
            name: "",
            typicalTopics: [],
            audienceType: "",
        };
    }

    function createEmptyKeyword(): KeywordDto {
        return {
            id: crypto.randomUUID(),
            term: "",
            priorityScore: 5,
        };
    }

    async function handleGenerateDemo() {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await api.calendarControllerGenerateDemoCalendarV1({
                generateDemoCalendarDto: {
                    weekStartDate: demoWeekStart,
                },
            });
            setResult(response);
        } catch (e) {
            setError(e instanceof Error ? e.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateCustom() {
        setLoading(true);
        setError(null);
        setResult(null);

        const dto: GenerateCalendarDto = {
            companyInfo: {
                name: companyName,
                website: companyWebsite,
                description: companyDescription,
                valuePropositions: valuePropositions
                    .split("\n")
                    .filter((v) => v.trim()),
            },
            personas: personas.map((p) => ({
                ...p,
                expertise:
                    typeof p.expertise === "string"
                        ? (p.expertise as string).split(",").map((e) => e.trim())
                        : p.expertise,
                writingStyle: {
                    ...p.writingStyle,
                    typicalPhrases:
                        typeof p.writingStyle.typicalPhrases === "string"
                            ? (p.writingStyle.typicalPhrases as unknown as string)
                                  .split(",")
                                  .map((e) => e.trim())
                            : p.writingStyle.typicalPhrases,
                },
            })),
            subreddits: subreddits.map((s) => ({
                ...s,
                typicalTopics:
                    typeof s.typicalTopics === "string"
                        ? (s.typicalTopics as unknown as string)
                              .split(",")
                              .map((e) => e.trim())
                        : s.typicalTopics,
            })),
            keywords,
            postsPerWeek,
            weekStartDate,
        };

        try {
            const response = await api.calendarControllerGenerateCalendarV1({
                generateCalendarDto: dto,
            });
            setResult(response);
        } catch (e) {
            setError(e instanceof Error ? e.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }

    function updatePersona(index: number, field: string, value: unknown) {
        const updated = [...personas];
        if (field.startsWith("writingStyle.")) {
            const styleField = field.replace("writingStyle.", "");
            updated[index] = {
                ...updated[index],
                writingStyle: {
                    ...updated[index].writingStyle,
                    [styleField]: value,
                } as PersonaWritingStyleDto,
            };
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }
        setPersonas(updated);
    }

    function updateSubreddit(index: number, field: string, value: unknown) {
        const updated = [...subreddits];
        updated[index] = { ...updated[index], [field]: value };
        setSubreddits(updated);
    }

    function updateKeyword(index: number, field: string, value: unknown) {
        const updated = [...keywords];
        updated[index] = { ...updated[index], [field]: value };
        setKeywords(updated);
    }

    return (
        <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
            <main className="mx-auto max-w-4xl px-4 py-8">
                <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-white">
                    Reddit Mastermind - Calendar Generator
                </h1>

                {/* Tab Buttons */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setActiveTab("demo")}
                        className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                            activeTab === "demo"
                                ? "bg-blue-600 text-white"
                                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
                        }`}
                    >
                        Demo Calendar
                    </button>
                    <button
                        onClick={() => setActiveTab("custom")}
                        className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                            activeTab === "custom"
                                ? "bg-blue-600 text-white"
                                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
                        }`}
                    >
                        Custom Calendar
                    </button>
                </div>

                {/* Demo Tab */}
                {activeTab === "demo" && (
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
                            Generate Demo Calendar (SlideForge)
                        </h2>
                        <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                            Quick way to test the system using pre-configured
                            SlideForge campaign data.
                        </p>

                        <div className="mb-4">
                            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Week Start Date
                            </label>
                            <input
                                type="date"
                                value={demoWeekStart}
                                onChange={(e) =>
                                    setDemoWeekStart(e.target.value)
                                }
                                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                            />
                        </div>

                        <button
                            onClick={handleGenerateDemo}
                            disabled={loading}
                            className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading
                                ? "Generating..."
                                : "Generate Demo Calendar"}
                        </button>
                    </div>
                )}

                {/* Custom Tab */}
                {activeTab === "custom" && (
                    <div className="space-y-6">
                        {/* Company Info */}
                        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
                                Company Information
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) =>
                                            setCompanyName(e.target.value)
                                        }
                                        placeholder="e.g., SlideForge"
                                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Website *
                                    </label>
                                    <input
                                        type="text"
                                        value={companyWebsite}
                                        onChange={(e) =>
                                            setCompanyWebsite(e.target.value)
                                        }
                                        placeholder="e.g., https://slideforge.ai"
                                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Description *
                                </label>
                                <textarea
                                    value={companyDescription}
                                    onChange={(e) =>
                                        setCompanyDescription(e.target.value)
                                    }
                                    placeholder="Describe what your company does..."
                                    rows={3}
                                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                />
                            </div>
                            <div className="mt-4">
                                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Value Propositions * (one per line)
                                </label>
                                <textarea
                                    value={valuePropositions}
                                    onChange={(e) =>
                                        setValuePropositions(e.target.value)
                                    }
                                    placeholder="Enter value propositions, one per line..."
                                    rows={4}
                                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Personas */}
                        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                    Personas (min 2)
                                </h2>
                                <button
                                    onClick={() =>
                                        setPersonas([
                                            ...personas,
                                            createEmptyPersona(),
                                        ])
                                    }
                                    className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                                >
                                    + Add Persona
                                </button>
                            </div>
                            {personas.map((persona, idx) => (
                                <div
                                    key={persona.id}
                                    className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                            Persona {idx + 1}
                                        </span>
                                        {personas.length > 2 && (
                                            <button
                                                onClick={() =>
                                                    setPersonas(
                                                        personas.filter(
                                                            (_, i) => i !== idx,
                                                        ),
                                                    )
                                                }
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            type="text"
                                            value={persona.username}
                                            onChange={(e) =>
                                                updatePersona(
                                                    idx,
                                                    "username",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Username"
                                            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                        />
                                        <select
                                            value={persona.tone}
                                            onChange={(e) =>
                                                updatePersona(
                                                    idx,
                                                    "tone",
                                                    e.target.value,
                                                )
                                            }
                                            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                        >
                                            {Object.values(
                                                PersonaDtoToneEnum,
                                            ).map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <textarea
                                        value={persona.bio}
                                        onChange={(e) =>
                                            updatePersona(
                                                idx,
                                                "bio",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Bio"
                                        rows={2}
                                        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={
                                            Array.isArray(persona.expertise)
                                                ? persona.expertise.join(", ")
                                                : persona.expertise
                                        }
                                        onChange={(e) =>
                                            updatePersona(
                                                idx,
                                                "expertise",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Expertise (comma-separated)"
                                        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                                        <select
                                            value={
                                                persona.writingStyle
                                                    .sentenceLength
                                            }
                                            onChange={(e) =>
                                                updatePersona(
                                                    idx,
                                                    "writingStyle.sentenceLength",
                                                    e.target.value,
                                                )
                                            }
                                            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                        >
                                            {Object.values(
                                                PersonaWritingStyleDtoSentenceLengthEnum,
                                            ).map((l) => (
                                                <option key={l} value={l}>
                                                    {l} sentences
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={
                                                persona.writingStyle.formality
                                            }
                                            onChange={(e) =>
                                                updatePersona(
                                                    idx,
                                                    "writingStyle.formality",
                                                    e.target.value,
                                                )
                                            }
                                            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                        >
                                            {Object.values(
                                                PersonaWritingStyleDtoFormalityEnum,
                                            ).map((f) => (
                                                <option key={f} value={f}>
                                                    {f}
                                                </option>
                                            ))}
                                        </select>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    persona.writingStyle
                                                        .usesEmojis
                                                }
                                                onChange={(e) =>
                                                    updatePersona(
                                                        idx,
                                                        "writingStyle.usesEmojis",
                                                        e.target.checked,
                                                    )
                                                }
                                                className="rounded"
                                            />
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                Uses emojis
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Subreddits */}
                        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                    Subreddits (min 1)
                                </h2>
                                <button
                                    onClick={() =>
                                        setSubreddits([
                                            ...subreddits,
                                            createEmptySubreddit(),
                                        ])
                                    }
                                    className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                                >
                                    + Add Subreddit
                                </button>
                            </div>
                            {subreddits.map((sub, idx) => (
                                <div
                                    key={idx}
                                    className="mb-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                            Subreddit {idx + 1}
                                        </span>
                                        {subreddits.length > 1 && (
                                            <button
                                                onClick={() =>
                                                    setSubreddits(
                                                        subreddits.filter(
                                                            (_, i) => i !== idx,
                                                        ),
                                                    )
                                                }
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            type="text"
                                            value={sub.name}
                                            onChange={(e) =>
                                                updateSubreddit(
                                                    idx,
                                                    "name",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="r/subreddit"
                                            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                        />
                                        <input
                                            type="text"
                                            value={sub.audienceType}
                                            onChange={(e) =>
                                                updateSubreddit(
                                                    idx,
                                                    "audienceType",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Audience type"
                                            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={
                                            Array.isArray(sub.typicalTopics)
                                                ? sub.typicalTopics.join(", ")
                                                : sub.typicalTopics
                                        }
                                        onChange={(e) =>
                                            updateSubreddit(
                                                idx,
                                                "typicalTopics",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Typical topics (comma-separated)"
                                        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Keywords */}
                        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                    Keywords (min 1)
                                </h2>
                                <button
                                    onClick={() =>
                                        setKeywords([
                                            ...keywords,
                                            createEmptyKeyword(),
                                        ])
                                    }
                                    className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                                >
                                    + Add Keyword
                                </button>
                            </div>
                            {keywords.map((kw, idx) => (
                                <div
                                    key={kw.id}
                                    className="mb-2 flex items-center gap-3"
                                >
                                    <input
                                        type="text"
                                        value={kw.term}
                                        onChange={(e) =>
                                            updateKeyword(
                                                idx,
                                                "term",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Keyword term"
                                        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={kw.priorityScore}
                                        onChange={(e) =>
                                            updateKeyword(
                                                idx,
                                                "priorityScore",
                                                parseInt(e.target.value) || 5,
                                            )
                                        }
                                        className="w-20 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                    {keywords.length > 1 && (
                                        <button
                                            onClick={() =>
                                                setKeywords(
                                                    keywords.filter(
                                                        (_, i) => i !== idx,
                                                    ),
                                                )
                                            }
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Settings */}
                        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
                                Settings
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Posts Per Week (1-10)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={postsPerWeek}
                                        onChange={(e) =>
                                            setPostsPerWeek(
                                                parseInt(e.target.value) || 3,
                                            )
                                        }
                                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Week Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={weekStartDate}
                                        onChange={(e) =>
                                            setWeekStartDate(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleGenerateCustom}
                            disabled={loading}
                            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading
                                ? "Generating..."
                                : "Generate Custom Calendar"}
                        </button>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Result Display */}
                {result && (
                    <div className="mt-6 rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
                        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
                            Result
                        </h2>
                        {result.success ? (
                            <div>
                                <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                    Calendar generated successfully in{" "}
                                    {result.generationTimeMs}ms
                                </div>
                                {result.calendar && (
                                    <div className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-700">
                                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    Total Posts
                                                </div>
                                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                                                    {
                                                        result.calendar.metadata
                                                            .totalPosts
                                                    }
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-700">
                                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    Quality Score
                                                </div>
                                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                                                    {
                                                        result.calendar.metadata
                                                            .qualityScore
                                                    }
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-700">
                                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    Diversity Score
                                                </div>
                                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                                                    {
                                                        result.calendar.metadata
                                                            .diversityScore
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="mb-2 font-medium text-zinc-900 dark:text-white">
                                                Scheduled Entries
                                            </h3>
                                            {result.calendar.entries.map(
                                                (entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="mb-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="font-medium text-zinc-900 dark:text-white">
                                                                    {
                                                                        entry
                                                                            .thread
                                                                            .post
                                                                            .title
                                                                    }
                                                                </div>
                                                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                                                    {
                                                                        entry
                                                                            .thread
                                                                            .post
                                                                            .subreddit
                                                                    }{" "}
                                                                    •{" "}
                                                                    {
                                                                        entry
                                                                            .slot
                                                                            .dayOfWeek
                                                                    }{" "}
                                                                    at{" "}
                                                                    {
                                                                        entry
                                                                            .slot
                                                                            .preferredHour
                                                                    }
                                                                    :00
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs ${
                                                                    entry.status ===
                                                                    "approved"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-zinc-100 text-zinc-700"
                                                                }`}
                                                            >
                                                                {entry.status}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                            {
                                                                entry.thread
                                                                    .post.body
                                                            }
                                                        </p>
                                                        <div className="mt-2 text-xs text-zinc-500">
                                                            {
                                                                entry.thread
                                                                    .comments
                                                                    .length
                                                            }{" "}
                                                            planned comments •
                                                            Style:{" "}
                                                            {
                                                                entry.thread
                                                                    .conversationStyle
                                                            }
                                                        </div>

                                                        {/* Planned Comments Section */}
                                                        {entry.thread.comments
                                                            .length > 0 && (
                                                            <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                                                                <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                                    Planned
                                                                    Comments
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {entry.thread.comments.map(
                                                                        (
                                                                            comment,
                                                                            commentIdx,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    comment.id
                                                                                }
                                                                                className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-700/50"
                                                                            >
                                                                                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                                                                                    <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                                                        Comment{" "}
                                                                                        {commentIdx +
                                                                                            1}
                                                                                    </span>
                                                                                    <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                                                                                        +
                                                                                        {
                                                                                            comment.delayMinutes
                                                                                        }

                                                                                        min
                                                                                    </span>
                                                                                    <span className="text-zinc-500 dark:text-zinc-400">
                                                                                        Persona:{" "}
                                                                                        {
                                                                                            comment.personaId
                                                                                        }
                                                                                    </span>
                                                                                    {comment.replyTo !==
                                                                                        "root" && (
                                                                                        <span className="rounded bg-zinc-200 px-2 py-0.5 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300">
                                                                                            Reply
                                                                                            to:{" "}
                                                                                            {
                                                                                                comment.replyTo
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                                                                    {
                                                                                        comment.text
                                                                                    }
                                                                                </p>
                                                                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                                                    {comment.mentionsProduct && (
                                                                                        <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                                            Mentions
                                                                                            product
                                                                                        </span>
                                                                                    )}
                                                                                    <span>
                                                                                        Subtlety:{" "}
                                                                                        {Math.round(
                                                                                            comment.subtletyScore *
                                                                                                100,
                                                                                        )}
                                                                                        %
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                Generation failed:{" "}
                                {result.errors?.join(", ") || "Unknown error"}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
