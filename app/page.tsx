"use client";

import { useEffect, useRef, useState } from "react";

type Voice = { id: string; name: string };

export default function Home() {
  const [text, setText] = useState(
    "В давние-преддавние времена, когда земля ещё помнила шёпот древних деревьев…"
  );
  const [voice, setVoice] = useState<string>("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Подгружаем голоса
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/voices", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          if (Array.isArray(data)) {
            setVoices(data);
            if (data.length > 0) setVoice(data[0].id);
          } else if (data?.error) {
            setError(`Ошибка загрузки голосов: ${data.error}`);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(`Ошибка сети при загрузке голосов: ${e.message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Освобождаем старые objectURL
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleGenerate = async () => {
    setError(null);

    if (!text.trim()) {
      setError("Введите текст");
      return;
    }
    if (!voice) {
      setError("Выберите голос");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });

      // Если сервер вернул ошибку — покажем её
      const contentType = response.headers.get("Content-Type") || "";
      if (!response.ok || !contentType.startsWith("audio/")) {
        const payload = await response.text();
        let msg = "Не удалось сгенерировать аудио.";
        try {
          const js = JSON.parse(payload);
          if (js?.error) msg = `${msg} ${js.error}`;
        } catch {
          if (payload) msg = `${msg} ${payload}`;
        }
        throw new Error(msg);
      }

      const blob = await response.blob(); // это уже mp3
      const url = URL.createObjectURL(blob);

      // Обновим плеер и сразу попробуем воспроизвести
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);

      // Воспроизведение через уже существующий <audio> — надёжнее для Safari/Chrome
      setTimeout(() => {
        const el = audioRef.current;
        if (el) {
          el.src = url;
          el.play().catch((e) => {
            // если браузер не дал авто-play — пользователь нажмёт сам
            console.warn("Autoplay blocked:", e);
          });
        }
      }, 0);
    } catch (e: any) {
      setError(e?.message || "Неизвестная ошибка при генерации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Генерация речи</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Введите текст…"
        className="w-full p-4 text-base border rounded-md outline-none focus:ring-2 focus:ring-black/20"
      />

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-gray-700">Выберите голос:</label>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !text.trim() || !voice}
        className={`mt-5 px-5 py-3 rounded-md text-white ${
          loading ? "bg-gray-500" : "bg-black hover:bg-gray-800"
        }`}
      >
        {loading ? "Обработка…" : "🎧 Слушать голос"}
      </button>

      {error && (
        <div className="mt-4 text-sm text-red-600 border border-red-200 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <div className="mt-5">
        <audio ref={audioRef} controls className="w-full" src={audioUrl ?? undefined} />
        {audioUrl && (
          <div className="mt-2">
            <a
              href={audioUrl}
              download="voice.mp3"
              className="text-sm underline text-blue-700"
            >
              ⬇️ Скачать MP3
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
