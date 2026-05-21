"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useResultStore, type ParsedImage } from "@/lib/stores/result-store";

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

type ImageStatus = "loading" | "ok" | "broken";

function ImageRow({ image, index }: { image: ParsedImage; index: number }) {
  const [status, setStatus] = useState<ImageStatus>("loading");
  const linkHref = image.link ?? image.src;
  const linkLabel = image.link ?? image.src;

  return (
    <TableRow>
      <TableCell className="w-20 align-top">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt || `Image ${index + 1}`}
            onLoad={() => setStatus("ok")}
            onError={() => setStatus("broken")}
            className="h-full w-full object-cover"
          />
        </div>
      </TableCell>
      <TableCell className="max-w-0 align-top">
        <a
          href={linkHref}
          target="_blank"
          rel="noreferrer"
          title={linkLabel}
          className="block truncate text-primary underline-offset-4 hover:underline"
        >
          {truncate(linkLabel)}
        </a>
      </TableCell>
      <TableCell className="max-w-0 align-top">
        {image.alt ? (
          <span className="block truncate" title={image.alt}>
            {image.alt}
          </span>
        ) : (
          <span className="italic text-muted-foreground">(no alt)</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        {status === "loading" ? (
          <span className="text-muted-foreground">Checking…</span>
        ) : status === "ok" ? (
          <span className="font-medium text-primary">Working</span>
        ) : (
          <span className="font-medium text-destructive">Broken</span>
        )}
      </TableCell>
    </TableRow>
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
    html,
    heading,
    metaTitle,
    metaDescription,
  } = result;

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
              <div key={field.label} className="contents sm:contents">
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="doc-html">Document HTML</Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>HTML preview</DialogTitle>
                    <DialogDescription>
                      Rendered in a sandboxed iframe.
                    </DialogDescription>
                  </DialogHeader>
                  <iframe
                    title="Document preview"
                    sandbox=""
                    srcDoc={html}
                    className="h-[70vh] w-full rounded-md border bg-white"
                  />
                </DialogContent>
              </Dialog>
            </div>
            <Textarea
              id="doc-html"
              readOnly
              value={html}
              spellCheck={false}
              className="h-96 resize-y font-mono text-xs whitespace-pre"
              placeholder="The document has no content."
            />
          </div>

          <Tabs defaultValue="errors" className="w-full">
            <TabsList>
              <TabsTrigger value="errors">
                Errors ({errors.length})
              </TabsTrigger>
              <TabsTrigger value="images">
                Images ({images.length})
              </TabsTrigger>
              <TabsTrigger value="links">Links ({links.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="errors" className="pt-4">
              {errors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No issues found.
                </p>
              ) : (
                <ul className="space-y-2">
                  {errors.map((error, index) => (
                    <li
                      key={`${index}-${error}`}
                      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                    >
                      {error}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="images" className="pt-4">
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No images were extracted from the document.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Preview</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Alt tag</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {images.map((image, index) => (
                      <ImageRow
                        key={`${image.src}-${index}`}
                        image={image}
                        index={index}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="links" className="pt-4">
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No links were extracted from the document.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link, index) => (
                      <TableRow key={`${link}-${index}`}>
                        <TableCell className="max-w-0">
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            title={link}
                            className="block truncate text-primary underline-offset-4 hover:underline"
                          >
                            {link}
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

          </Tabs>

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
