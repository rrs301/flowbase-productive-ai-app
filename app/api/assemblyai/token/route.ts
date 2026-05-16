import { currentUser } from "@clerk/nextjs/server";

const TOKEN_EXPIRES_IN_SECONDS = 60;
const MAX_SESSION_DURATION_SECONDS = 120;

export async function GET() {
  const user = await currentUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "AssemblyAI is not configured. Add ASSEMBLYAI_API_KEY." },
      { status: 500 }
    );
  }

  const url = new URL("https://streaming.assemblyai.com/v3/token");
  url.searchParams.set("expires_in_seconds", String(TOKEN_EXPIRES_IN_SECONDS));
  url.searchParams.set(
    "max_session_duration_seconds",
    String(MAX_SESSION_DURATION_SECONDS)
  );

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as {
      token?: string;
      error?: string;
    };

    if (!response.ok || !payload.token) {
      return Response.json(
        {
          error:
            payload.error ||
            "Could not create an AssemblyAI streaming token.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      token: payload.token,
      expiresInSeconds: TOKEN_EXPIRES_IN_SECONDS,
      maxSessionDurationSeconds: MAX_SESSION_DURATION_SECONDS,
    });
  } catch {
    return Response.json(
      { error: "Could not reach AssemblyAI." },
      { status: 502 }
    );
  }
}
