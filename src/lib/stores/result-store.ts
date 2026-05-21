import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ParsedImage = {
  src: string;
  alt: string;
  link?: string;
};

export type CheckResult = {
  docUrl: string;
  heading: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  text: string;
  html: string;
  images: ParsedImage[];
  links: string[];
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
      version: 5,
      migrate: () => ({ result: null }),
    },
  ),
);
