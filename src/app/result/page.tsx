"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useResultStore } from "@/lib/stores/result-store";

function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function useHasHydrated() {
  return useSyncExternalStore(
    (callback) => useResultStore.persist.onFinishHydration(callback),
    () => useResultStore.persist.hasHydrated(),
    () => false,
  );
}

export default function ResultPage() {
  const result = useResultStore((state) => state.result);
  const clear = useResultStore((state) => state.clear);
  const hydrated = useHasHydrated();

  if (!hydrated) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No result yet</CardTitle>
            <CardDescription>
              Submit the form first to see parsed results here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Back to form</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const {
    images,
    links,
    errors,
    docUrl,
    text,
    heading,
    metaTitle,
    metaDescription,
  } = result;
  const rowCount = Math.max(images.length, links.length, errors.length);

  const fields: Array<{ label: string; value: string | null }> = [
    { label: "Article title", value: heading },
    { label: "Meta Title", value: metaTitle },
    { label: "Meta description", value: metaDescription },
  ];

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle className="text-xl">Result</CardTitle>
          <CardDescription className="break-all">
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {docUrl}
            </a>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <dl className="grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
            {fields.map((field) => (
              <div
                key={field.label}
                className="contents sm:contents"
              >
                <dt className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd
                  className={
                    field.value
                      ? "text-sm"
                      : "text-sm italic text-muted-foreground"
                  }
                >
                  {field.value ?? "Not found"}
                </dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2">
            <Label htmlFor="doc-text">Document text</Label>
            <Textarea
              id="doc-text"
              readOnly
              value={text}
              className="h-56 resize-y font-mono text-xs"
              placeholder="The document has no text content."
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Images</TableHead>
                <TableHead className="w-1/3">Links</TableHead>
                <TableHead className="w-1/3">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowCount === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    Nothing was extracted from the document.
                  </TableCell>
                </TableRow>
              ) : (
                Array.from({ length: rowCount }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="max-w-0 align-top">
                      {images[index] ? (
                        <a
                          href={images[index].src}
                          target="_blank"
                          rel="noreferrer"
                          title={images[index].src}
                          className="block text-primary underline-offset-4 hover:underline"
                        >
                          {images[index].alt ? (
                            <span className="block truncate">
                              {truncate(images[index].alt)}
                            </span>
                          ) : (
                            <span className="block truncate italic text-muted-foreground">
                              (no alt) {truncate(images[index].src, 60)}
                            </span>
                          )}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-0 truncate align-top">
                      {links[index] ? (
                        <a
                          href={links[index]}
                          target="_blank"
                          rel="noreferrer"
                          title={links[index]}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {truncate(links[index])}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-0 align-top whitespace-normal">
                      {errors[index] ? (
                        <span className="text-destructive">
                          {errors[index]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>{images.length} total</TableCell>
                <TableCell>{links.length} total</TableCell>
                <TableCell>{errors.length} total</TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                clear();
              }}
            >
              Clear
            </Button>
            <Button asChild>
              <Link href="/">Check another</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
