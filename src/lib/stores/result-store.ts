import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  setResult: (result: CheckResult) => void;
  clear: () => void;
};

export const useResultStore = create<ResultState>()(
  persist(
    (set) => ({
      result: null,
      setResult: (result) => set({ result }),
      clear: () => set({ result: null }),
    }),
    {
      name: "parse-articles-result",
      storage: createJSONStorage(() => localStorage),
      version: 7,
      migrate: () => ({ result: null }),
    },
  ),
);
