import { Injectable } from "@nestjs/common";

export type Lang = "en" | "fr" | "ar";

type LibreResponse = { translatedText?: string };

@Injectable()
export class GoogleTranslateService {
  private get libreUrl() {
    const raw = (
      process.env.LIBRETRANSLATE_URL ?? "https://libretranslate.de"
    ).trim();
    return raw.replace(/\/+$/, ""); // remove trailing slash
  }

  private get libreApiKey() {
    return process.env.LIBRETRANSLATE_API_KEY?.trim();
  }

  async translateText(text: string, target: Lang): Promise<string> {
    if (!text?.trim()) return text;
    if (target === "en") return text;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${this.libreUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          q: text,
          source: "auto",
          target,
          format: "text",
          ...(this.libreApiKey ? { api_key: this.libreApiKey } : {}),
        }),
      });

      if (!res.ok) return text;

      const data = (await res.json().catch(() => null)) as LibreResponse | null;
      return data?.translatedText ? String(data.translatedText) : text;
    } catch {
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }
}
