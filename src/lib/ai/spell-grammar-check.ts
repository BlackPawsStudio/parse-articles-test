import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const issueSchema = z.object({
  type: z
    .enum(["spelling", "grammar"])
    .describe("Whether this is a spelling or a grammar issue."),
  excerpt: z
    .string()
    .min(1)
    .describe(
      "A short excerpt from the article (a few words to one sentence) showing where the issue occurs.",
    ),
  message: z
    .string()
    .min(1)
    .describe("Short description of what is wrong. Keep under 200 characters."),
  suggestion: z
    .string()
    .optional()
    .describe("Optional concrete fix to apply."),
});

const reviewSchema = z.object({
  issues: z.array(issueSchema),
});

const SYSTEM_PROMPT = `
You are a meticulous English-language proofreader.

You will receive the plain-text body of a single article exported from Google Docs.

Find ONLY:
- Spelling mistakes (typos, misspelled words).
- Grammar mistakes (subject/verb agreement, tense errors, broken sentences, punctuation that changes meaning, wrong articles, wrong prepositions).

Do NOT report:
- Stylistic preferences, tone, SEO, structure, formatting, or capitalization of brand names.
- Issues you are not confident are clearly wrong in standard English.
- The same issue more than once (deduplicate).

Rules:
- Return at most 25 issues, prioritizing the most clearly wrong ones.
- Each "excerpt" must be a verbatim snippet copied from the provided text.
- Each "message" is short (under 200 chars) and explains what is wrong.
- If the article is clean, return an empty list.
- Return ONLY the JSON object — no extra commentary.
`.trim();

const MAX_TEXT_CHARS = 16_000;

export type SpellGrammarIssue = z.infer<typeof issueSchema>;

export type SpellGrammarResult =
  | { ok: true; issues: SpellGrammarIssue[] }
  | { ok: false; error: string };

export async function runSpellGrammarCheck(
  text: string,
): Promise<SpellGrammarResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      error:
        "OPENAI_API_KEY is not set on the server — skipping AI spelling/grammar check.",
    };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: true, issues: [] };
  }

  const body =
    trimmed.length > MAX_TEXT_CHARS
      ? `${trimmed.slice(0, MAX_TEXT_CHARS)}\n…[truncated for length]`
      : trimmed;

  try {
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      prompt: `Article text:\n\n${body}`,
      temperature: 0,
      output: Output.object({
        schema: reviewSchema,
        name: "spell_grammar_review",
        description:
          "A list of spelling and grammar issues found in the article.",
      }),
    });
    return { ok: true, issues: result.output.issues };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI review failed",
    };
  }
}

export function formatSpellGrammarIssue(issue: SpellGrammarIssue): string {
  const label = issue.type === "spelling" ? "Spelling" : "Grammar";
  const base = `[${label}] ${issue.message} — “${issue.excerpt}”`;
  return issue.suggestion ? `${base} (suggest: ${issue.suggestion})` : base;
}
