// app/api/voices/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return json({ error: "ELEVENLABS_API_KEY is not set" }, 500);
    }

    const resp = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "xi-api-key": apiKey,
      },
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("ElevenLabs voices error:", resp.status, text);
      return json(
        { error: text || `Upstream error ${resp.status} ${resp.statusText}` },
        resp.status
      );
    }

    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await resp.text().catch(() => "");
      console.error("Unexpected content-type from ElevenLabs:", ct, text?.slice(0, 200));
      return json({ error: `Unexpected content-type: ${ct}` }, 502);
    }

    const data = await resp.json();
    const voices = Array.isArray(data?.voices)
      ? data.voices.map((v: any) => ({ id: v.voice_id, name: v.name }))
      : [];

    return json(voices, 200);
  } catch (e: any) {
    console.error("Voices route fatal error:", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
}

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
