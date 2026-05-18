"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-lg rounded-lg border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-primary">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold">We could not load your dashboard.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The workspace data did not come through cleanly. Try again, and the dashboard will rebuild from your app records.
          </p>
          <Button className="mt-5 rounded-lg" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
