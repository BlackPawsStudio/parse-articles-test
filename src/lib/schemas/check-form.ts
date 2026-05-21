import { z } from "zod";

const GOOGLE_DOC_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/[\w-]+/i;

const nonNegativeInt = z
  .number({ error: "Must be a number" })
  .int("Must be a whole number")
  .min(0, "Must be 0 or greater");

export const checkFormSchema = z
  .object({
    docUrl: z
      .string()
      .trim()
      .min(1, "Google Doc link is required")
      .regex(GOOGLE_DOC_PATTERN, "Must be a valid Google Doc URL"),
    brandName: z.string().trim().min(1, "Brand name is required"),
    minImages: nonNegativeInt,
    maxImages: nonNegativeInt,
    minProductLinks: nonNegativeInt,
    maxProductLinks: nonNegativeInt,
  })
  .refine((data) => data.minImages <= data.maxImages, {
    message: "Min images cannot be greater than max images",
    path: ["maxImages"],
  })
  .refine((data) => data.minProductLinks <= data.maxProductLinks, {
    message: "Min product links cannot be greater than max product links",
    path: ["maxProductLinks"],
  });

export type CheckFormValues = z.infer<typeof checkFormSchema>;

export const defaultCheckFormValues: CheckFormValues = {
  docUrl: "",
  brandName: "",
  minImages: 1,
  maxImages: 10,
  minProductLinks: 1,
  maxProductLinks: 10,
};
