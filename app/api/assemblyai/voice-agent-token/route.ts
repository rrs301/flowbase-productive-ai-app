import { currentUser } from "@clerk/nextjs/server";

const TOKEN_EXPIRES_IN_SECONDS = 120;
const MAX_SESSION_DURATION_SECONDS = 600;

export async function GET() {
  const user = await currentUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "AssemblyAI Voice Agent is not configured. Add ASSEMBLYAI_API_KEY." },
      { status: 500 },
    );
  }

  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", String(TOKEN_EXPIRES_IN_SECONDS));
  url.searchParams.set("max_session_duration_seconds", String(MAX_SESSION_DURATION_SECONDS));

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as {
      token?: string;
      expires_in_seconds?: number;
      max_session_duration_seconds?: number;
      error?: string;
    };

    if (!response.ok || !payload.token) {
      return Response.json(
        { error: payload.error || "Could not create an AssemblyAI Voice Agent token." },
        { status: 502 },
      );
    }

    return Response.json({
      token: payload.token,
      expiresInSeconds: payload.expires_in_seconds ?? TOKEN_EXPIRES_IN_SECONDS,
      maxSessionDurationSeconds: payload.max_session_duration_seconds ?? MAX_SESSION_DURATION_SECONDS,
    });
  } catch {
    return Response.json({ error: "Could not reach AssemblyAI Voice Agent." }, { status: 502 });
  }
}
