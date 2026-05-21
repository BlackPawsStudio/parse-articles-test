import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { CheckFormValues } from "@/lib/schemas/check-form";

export type ImageProblem = "no-access" | "not-found" | "broken";

export type ParsedImage = {
  src: string;
  alt: string;
  link?: string;
  problem?: ImageProblem;
};

export type ParsedLink = {
  text: string;
  href: string;
  isBrand: boolean;
};

export type CheckResult = {
  docUrl: string;
  heading: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  text: string;
  html: string;
  images: ParsedImage[];
  links: ParsedLink[];
  errors: string[];
  checkedAt: number;
};

type ResultState = {
  result: CheckResult | null;
  formValues: CheckFormValues | null;
  setResult: (result: CheckResult, formValues: CheckFormValues) => void;
  clear: () => void;
};

export const useResultStore = create<ResultState>()(
  persist(
    (set) => ({
      result: null,
      formValues: null,
      setResult: (result, formValues) => set({ result, formValues }),
      clear: () => set({ result: null, formValues: null }),
    }),
    {
      name: "parse-articles-result",
      storage: createJSONStorage(() => localStorage),
      version: 11,
      migrate: () => ({ result: null, formValues: null }),
    },
  ),
);
