import { ClerkProvider } from '@clerk/nextjs';
import "@liveblocks/react-ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { LiveblocksAppProvider } from "@/components/liveblocks-app-provider";

export const metadata: Metadata = {
  title: "Flowbase | AI Productivity Workspace",
  description:
    "An AI-powered productivity workspace for notes, tasks, whiteboards, calendars, templates, and real-time team collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }}>
          <LiveblocksAppProvider>{children}</LiveblocksAppProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
