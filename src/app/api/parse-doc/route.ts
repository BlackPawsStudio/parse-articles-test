import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { z } from "zod";

const requestSchema = z.object({
  docUrl: z.string().min(1),
  minImages: z.number().int().nonnegative(),
  maxImages: z.number().int().nonnegative(),
  minProductLinks: z.number().int().nonnegative(),
  maxProductLinks: z.number().int().nonnegative(),
});

const DOC_ID_PATTERN = /\/document\/d\/([\w-]+)/;

function extractDocId(url: string): string | null {
  const match = url.match(DOC_ID_PATTERN);
  return match?.[1] ?? null;
}

function isExternalHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    docUrl,
    minImages,
    maxImages,
    minProductLinks,
    maxProductLinks,
  } = parsed.data;

  const docId = extractDocId(docUrl);
  if (!docId) {
    return NextResponse.json(
      { error: "Could not extract document id from the provided URL" },
      { status: 400 },
    );
  }

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

  let html: string;
  try {
    const res = await fetch(exportUrl, {
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Google Docs returned ${res.status}. Make sure the document is shared as "Anyone with the link".`,
        },
        { status: 502 },
      );
    }
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch the Google Doc",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const $ = cheerio.load(html);

  const images = $("img")
    .map((_, el) => ({
      src: $(el).attr("src") ?? "",
      alt: ($(el).attr("alt") ?? "").trim(),
    }))
    .get()
    .filter((image) => image.src.length > 0);

  const linksRaw = $("a")
    .map((_, el) => $(el).attr("href") ?? "")
    .get()
    .filter(Boolean)
    .map((href) => {
      try {
        const url = new URL(href, exportUrl);
        if (url.hostname === "www.google.com" && url.pathname === "/url") {
          return url.searchParams.get("q") ?? href;
        }
        return url.toString();
      } catch {
        return href;
      }
    })
    .filter(isExternalHttpUrl);

  const links = Array.from(new Set(linksRaw));

  const text = $("body")
    .find("p, h1, h2, h3, h4, h5, h6, li, blockquote")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .join("\n");

  const errors: string[] = [];
  if (images.length < minImages) {
    errors.push(
      `Expected at least ${minImages} image(s), found ${images.length}.`,
    );
  }
  if (images.length > maxImages) {
    errors.push(
      `Expected at most ${maxImages} image(s), found ${images.length}.`,
    );
  }
  if (links.length < minProductLinks) {
    errors.push(
      `Expected at least ${minProductLinks} product link(s), found ${links.length}.`,
    );
  }
  if (links.length > maxProductLinks) {
    errors.push(
      `Expected at most ${maxProductLinks} product link(s), found ${links.length}.`,
    );
  }

  return NextResponse.json({
    docUrl,
    text,
    images,
    links,
    errors,
    checkedAt: Date.now(),
  });
}
