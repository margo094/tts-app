import { NextRequest } from "next/server";

export const dynamic = "force-dynamic"; // не кэшировать
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!process.env.ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY is not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!text || !voice) {
      return new Response(
        JSON.stringify({ error: "text and voice are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "audio/mpeg", // важно!
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    // Если ошибка от ElevenLabs — пробросим текст ошибки
    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error:
            errText ||
            `Upstream error: ${upstream.status} ${upstream.statusText}`,
        }),
        { status: upstream.status || 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Стримим mp3 напрямую клиенту
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="voice.mp3"',
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
