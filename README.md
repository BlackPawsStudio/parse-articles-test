This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

When you click **Check** on the home page, the server first parses the Google Doc and then runs an OpenAI spelling & grammar review on the extracted text via the [Vercel AI SDK](https://sdk.vercel.ai). Any issues the model finds are appended to the regular errors list shown on the result page.

To enable the AI review locally:

1. Copy the template and fill in your key:

   ```bash
   cp .env.example .env.local
   ```

2. Set `OPENAI_API_KEY` to a key from [OpenAI](https://platform.openai.com/api-keys).
3. Optionally override `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
4. Restart `npm run dev`.

Without the key the rest of the app keeps working — the parser still returns its deterministic errors, and the AI step is silently skipped (a warning is logged on the server).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
