import { ClerkProvider } from '@clerk/nextjs';
import "@liveblocks/react-ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { LiveblocksAppProvider } from "@/components/liveblocks-app-provider";

export const metadata: Metadata = {
  title: "Flowbase",
  description: "A cozy productivity workspace for notes, boards, tasks, and AI workflows.",
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
