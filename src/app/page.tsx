"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type AnyFieldApi } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkFormSchema,
  defaultCheckFormValues,
} from "@/lib/schemas/check-form";
import { useResultStore, type CheckResult } from "@/lib/stores/result-store";

function FieldError({ field }: { field: AnyFieldApi }) {
  if (!field.state.meta.isTouched) return null;

  const messages = field.state.meta.errors
    .map((error) =>
      typeof error === "string" ? error : (error?.message ?? null),
    )
    .filter((message): message is string => Boolean(message));

  if (messages.length === 0) return null;

  return (
    <p role="alert" className="text-xs text-destructive">
      {messages[0]}
    </p>
  );
}

export default function Home() {
  const router = useRouter();
  const setResult = useResultStore((state) => state.setResult);
  const [requestError, setRequestError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: defaultCheckFormValues,
    validators: {
      onChange: checkFormSchema,
      onSubmit: checkFormSchema,
    },
    onSubmit: async ({ value }) => {
      setRequestError(null);
      try {
        const response = await fetch("/api/parse-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });

        const payload = (await response.json()) as
          | CheckResult
          | { error: string };

        if (!response.ok || "error" in payload) {
          const message =
            "error" in payload ? payload.error : "Failed to parse the document";
          setRequestError(message);
          return;
        }

        setResult(payload);
        router.push("/result");
      } catch (err) {
        setRequestError(
          err instanceof Error ? err.message : "Unexpected error",
        );
      }
    },
  });

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">Check article</CardTitle>
          <CardDescription>
            Paste a Google Doc link and set the expected ranges for images and
            product links.
          </CardDescription>
        </CardHeader>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-6"
        >
          <CardContent className="space-y-6">
            <form.Field name="docUrl">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Google Doc link</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="url"
                    inputMode="url"
                    placeholder="https://docs.google.com/document/d/..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0
                    }
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="brandName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Brand name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    placeholder="e.g. Nike"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0
                    }
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Images</legend>
              <div className="grid grid-cols-2 gap-4">
                <form.Field name="minImages">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Min</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.valueAsNumber)
                        }
                        aria-invalid={
                          field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0
                        }
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                </form.Field>
                <form.Field name="maxImages">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Max</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.valueAsNumber)
                        }
                        aria-invalid={
                          field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0
                        }
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                </form.Field>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Product links</legend>
              <div className="grid grid-cols-2 gap-4">
                <form.Field name="minProductLinks">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Min</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.valueAsNumber)
                        }
                        aria-invalid={
                          field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0
                        }
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                </form.Field>
                <form.Field name="maxProductLinks">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Max</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.valueAsNumber)
                        }
                        aria-invalid={
                          field.state.meta.isTouched &&
                          field.state.meta.errors.length > 0
                        }
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                </form.Field>
              </div>
            </fieldset>

            {requestError ? (
              <p role="alert" className="text-sm text-destructive">
                {requestError}
              </p>
            ) : null}

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) =>
                isSubmitting ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Fetching and parsing the document…
                  </div>
                ) : null
              }
            </form.Subscribe>
          </CardContent>

          <CardFooter className="justify-end">
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    "Check"
                  )}
                </Button>
              )}
            </form.Subscribe>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
