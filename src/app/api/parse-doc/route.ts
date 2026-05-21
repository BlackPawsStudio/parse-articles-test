import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { html as beautifyHtml } from "js-beautify";
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

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unwrapGoogleRedirect(href: string, base: string): string {
  try {
    const url = new URL(href, base);
    if (url.hostname === "www.google.com" && url.pathname === "/url") {
      return url.searchParams.get("q") ?? href;
    }
    return url.toString();
  } catch {
    return href;
  }
}

const DRIVE_ID_PATTERNS: RegExp[] = [/\/file\/d\/([\w-]+)/, /[?&]id=([\w-]+)/];

function extractDriveId(href: string): string | null {
  for (const re of DRIVE_ID_PATTERNS) {
    const match = href.match(re);
    if (match) return match[1];
  }
  return null;
}

type DriveFetchResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

async function fetchDriveImage(id: string): Promise<DriveFetchResult> {
  const url = `https://drive.google.com/uc?export=download&id=${id}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return { ok: false, error: `Drive responded with ${res.status}` };
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return {
        ok: false,
        error: `Drive file is not publicly accessible or not an image (received ${
          contentType || "unknown content type"
        })`,
      };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString("base64");
    return { ok: true, dataUrl: `data:${contentType};base64,${base64}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const PLACEHOLDER_LABEL_PATTERN = /^IMAGE\s+\d+\.?$/i;
const ALT_TAG_PATTERN =
  /Alt(?:\s*tag)?\s*:\s*(?:["'\u201C\u201D])?(.+?)(?:["'\u201C\u201D]|$)/i;

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

  const { docUrl, minImages, maxImages, minProductLinks, maxProductLinks } =
    parsed.data;

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

  const googleStyles = $("style")
    .map((_, el) => $(el).html() ?? "")
    .get()
    .join("\n");
  const headTitle = $("title").text().trim();

  $("script").remove();
  $("head").empty();

  $("a[href]").each((_, el) => {
    const $el = $(el);
    const resolved = unwrapGoogleRedirect($el.attr("href") ?? "", exportUrl);
    $el.attr("href", resolved);
  });

  const driveImageMap = new Map<
    string,
    { driveUrl: string; alt: string; dataUrl: string }
  >();
  const driveErrors: string[] = [];
  const driveCache = new Map<string, DriveFetchResult>();

  const placeholderEls = $("a")
    .toArray()
    .filter((el) => {
      const href = $(el).attr("href") ?? "";
      const text = $(el).text().trim();
      return (
        href.includes("drive.google.com") &&
        PLACEHOLDER_LABEL_PATTERN.test(text)
      );
    });

  for (const el of placeholderEls) {
    const $a = $(el);
    const linkText = $a.text().trim();
    const href = $a.attr("href") ?? "";
    const driveId = extractDriveId(href);

    if (!driveId) {
      driveErrors.push(`${linkText}: could not extract Drive id from ${href}`);
      continue;
    }

    const $block = $a.closest("p, h1, h2, h3, h4, h5, h6, li, blockquote");
    const $target = $block.length > 0 ? $block : $a;
    const altMatch = $target.text().match(ALT_TAG_PATTERN);
    const alt = altMatch ? altMatch[1].trim() : "";

    let fetched = driveCache.get(driveId);
    if (!fetched) {
      fetched = await fetchDriveImage(driveId);
      driveCache.set(driveId, fetched);
    }

    if (!fetched.ok) {
      driveErrors.push(`${linkText}: ${fetched.error}`);
      continue;
    }

    driveImageMap.set(fetched.dataUrl, {
      driveUrl: href,
      alt,
      dataUrl: fetched.dataUrl,
    });

    const $img = $("<img>")
      .attr("src", fetched.dataUrl)
      .attr("alt", alt)
      .attr(
        "style",
        "max-width: 100%; height: auto; display: block; margin: 1em auto;",
      );

    if ($block.length > 0) {
      $block.empty().append($img);
    } else {
      $a.replaceWith($img);
    }
  }

  const images: Array<{ src: string; alt: string; link?: string }> = $("img")
    .map((_, el) => {
      const src = $(el).attr("src") ?? "";
      const alt = ($(el).attr("alt") ?? "").trim();
      const mapped = driveImageMap.get(src);
      if (mapped) {
        return { src: mapped.dataUrl, alt: mapped.alt, link: mapped.driveUrl };
      }
      return { src, alt };
    })
    .get()
    .filter((image) => image.src.length > 0);

  const linksRaw = $("a")
    .map((_, el) => $(el).attr("href") ?? "")
    .get()
    .filter(Boolean)
    .filter(isExternalHttpUrl);

  const links = Array.from(new Set(linksRaw));

  const text = $("body")
    .find("p, h1, h2, h3, h4, h5, h6, li, blockquote")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .join("\n");

  const heading =
    $("body").find("h1, h2, h3").first().text().trim() ||
    headTitle ||
    null;

  const findAfterLabel = (label: string): string | null => {
    const pattern = new RegExp(
      `^\\s*${label}\\s*[:\\-\u2013\u2014]?\\s*(.+)$`,
      "i",
    );
    for (const line of text.split("\n")) {
      const match = line.match(pattern);
      if (match) {
        const value = match[1].trim();
        if (value) return value;
      }
    }
    return null;
  };

  const metaTitle = findAfterLabel("Meta\\s*Title");
  const metaDescription = findAfterLabel("Meta\\s*description");

  const $head = $("head");
  $head.append(`<meta charset="UTF-8">`);
  $head.append(`<title>${escapeHtmlAttr(heading ?? "")}</title>`);
  if (metaTitle) {
    $head.append(
      `<meta name="title" content="${escapeHtmlAttr(metaTitle)}">`,
    );
  }
  if (metaDescription) {
    $head.append(
      `<meta name="description" content="${escapeHtmlAttr(metaDescription)}">`,
    );
  }
  if (googleStyles.trim().length > 0) {
    $head.append(`<style>${googleStyles}</style>`);
  }

  const rawHtmlDoc = $.html();

  const formattedHtml = beautifyHtml(rawHtmlDoc, {
    indent_size: 2,
    wrap_line_length: 0,
    preserve_newlines: false,
    end_with_newline: true,
    indent_inner_html: true,
    extra_liners: ["head", "body"],
    content_unformatted: ["style", "script"],
  });

  const errors: string[] = [...driveErrors];
  if (images.length < minImages) {
    errors.push(
      `Expected at least ${minImages} working image(s), found ${images.length}.`,
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
    heading,
    metaTitle,
    metaDescription,
    text,
    html: formattedHtml,
    images,
    links,
    errors,
    checkedAt: Date.now(),
  });
}
