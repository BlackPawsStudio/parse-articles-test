import { z } from "zod";

import { publicProcedure } from "@/server/trpc";

const articleSchema = z.object({
  docUrl: z.string(),
  title: z.string().min(1, "Title is required"),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  html: z.string().min(1, "HTML body is required"),
  images: z.array(
    z.object({
      src: z.string(),
      alt: z.string(),
      link: z.string().optional(),
    }),
  ),
  links: z.array(
    z.object({
      text: z.string(),
      href: z.string(),
    }),
  ),
});

const uploadSchema = z.object({
  target: z.enum(["wordpress", "shopify"]),
  article: articleSchema,
});

type ArticleInput = z.infer<typeof articleSchema>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type MockRequest = {
  endpoint: string;
  method: "POST";
  headers: Record<string, string>;
  body: unknown;
};

function buildWordpressRequest(article: ArticleInput): MockRequest {
  return {
    endpoint: "https://example.wpengine.com/wp-json/wp/v2/posts",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer <REPLACE_WITH_APPLICATION_PASSWORD_TOKEN>",
    },
    body: {
      title: article.title,
      slug: slugify(article.title),
      status: "draft",
      content: article.html,
      excerpt: article.metaDescription ?? "",
      meta: {
        _yoast_wpseo_title: article.metaTitle ?? article.title,
        _yoast_wpseo_metadesc: article.metaDescription ?? "",
      },
    },
  };
}

function buildShopifyRequest(article: ArticleInput): MockRequest {
  const blogId = "<REPLACE_WITH_BLOG_ID>";
  return {
    endpoint: `https://example.myshopify.com/admin/api/2024-07/blogs/${blogId}/articles.json`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": "<REPLACE_WITH_ADMIN_ACCESS_TOKEN>",
    },
    body: {
      article: {
        title: article.title,
        handle: slugify(article.title),
        author: "Article Checker",
        published: false,
        body_html: article.html,
        summary_html: article.metaDescription ?? "",
        metafields: [
          {
            namespace: "global",
            key: "title_tag",
            value: article.metaTitle ?? article.title,
            type: "single_line_text_field",
          },
          {
            namespace: "global",
            key: "description_tag",
            value: article.metaDescription ?? "",
            type: "single_line_text_field",
          },
        ],
      },
    },
  };
}

function buildMockResponse(target: "wordpress" | "shopify", title: string) {
  const id = Math.floor(100000 + Math.random() * 900000);
  if (target === "wordpress") {
    return {
      id,
      status: "draft",
      link: `https://example.wpengine.com/?p=${id}`,
      slug: slugify(title),
    };
  }
  return {
    article: {
      id,
      handle: slugify(title),
      published_at: null,
      admin_graphql_api_id: `gid://shopify/Article/${id}`,
    },
  };
}

export const uploadProcedure = publicProcedure
  .input(uploadSchema)
  .mutation(async ({ input }) => {
    const { target, article } = input;

    const mockRequest =
      target === "wordpress"
        ? buildWordpressRequest(article)
        : buildShopifyRequest(article);

    const startedAt = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      ok: true as const,
      target,
      request: mockRequest,
      response: buildMockResponse(target, article.title),
      durationMs: Date.now() - startedAt,
      note: "This is a mocked response. Replace the placeholder credentials and call the real endpoint to publish.",
    };
  });
