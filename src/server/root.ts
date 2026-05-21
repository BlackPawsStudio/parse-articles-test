import { router } from "@/server/trpc";
import { parseDocProcedure } from "@/server/routers/parse-doc";
import { uploadProcedure } from "@/server/routers/upload";

export const appRouter = router({
  parseDoc: parseDocProcedure,
  upload: uploadProcedure,
});

export type AppRouter = typeof appRouter;
