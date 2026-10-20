"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Check,
  ChevronLeft,
  Clock3,
  Copy,
  Download,
  Headphones,
  KeyRound,
  LoaderCircle,
  Play,
  Search,
  Sparkles,
  TextQuote,
  WandSparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Episode = {
  id: string;
  number: string;
  title: string;
  guest: string;
  topic: string;
  publishedAt: string;
  duration: string;
  audioUrl: string;
  description: string;
};

type Utterance = {
  speaker: string;
  text: string;
  start: number;
  end: number;
};

type Analysis = {
  status: "idle" | "queued" | "processing" | "completed" | "error";
  stage?: "uploading" | "transcribing" | "analyzing";
  progress?: { completed: number; total: number };
  text?: string;
  summary?: string;
  analysis?: string;
  model?: string;
  utterances?: Utterance[];
  wordCount?: number;
  coverage?: number;
  error?: string;
};

type FileRef = { name: string; uri: string; mimeType: string };
type TranscriptSegment = {
  start_timestamp?: string;
  end_timestamp?: string;
  speaker?: string;
  text?: string;
};
type TranscriptResult = { segments?: TranscriptSegment[] };
type PodcastAnalysis = {
  executive_summary?: string;
  key_points?: string[];
  deep_analysis?: string;
  practical_takeaways?: string[];
  open_questions?: string[];
  chapters?: Array<{ timestamp?: string; title?: string }>;
};
type TranscriptQuality = {
  passed: boolean;
  wordCount: number;
  expectedMinWords: number;
  coveredFrom: number;
  coveredUntil: number;
};
type ApiResult = {
  status: string;
  error?: string;
  file?: FileRef;
  utterances?: Utterance[];
  quality?: TranscriptQuality;
  summary?: string;
  analysis?: string;
  model?: string;
};

const fallbackEpisodes: Episode[] = [
  {
    id: "ep-206",
    number: "۲۰۶",
    title: "رشد مداوم یه دروغ فرهنگیه",
    guest: "دکتر ژولیت رودینی",
    topic: "سلامت روان و علم باز",
    publishedAt: "۳۰ مرداد ۱۴۰۵",
    duration: "۱:۵۸:۳۱",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/6a863a725c9c346c63a03d3e/media.mp3",
    description:
      "گفت‌وگویی درباره سلامت روان، علم باز و این پرسش که چطور می‌شود علم را از پشت دیوارهای دانشگاه بیرون آورد و وارد زندگی روزمره مردم کرد.",
  },
  {
    id: "ep-205",
    number: "۲۰۵",
    title: "تجربه کار در متا، آمازون و تیک‌تاک",
    guest: "هومن محمدی",
    topic: "هوش مصنوعی و مسیر شغلی",
    publishedAt: "۲۳ مرداد ۱۴۰۵",
    duration: "۱:۳۱:۰۲",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/6a7df80e049c692a6bf96d0e/media.mp3",
    description:
      "از زیرساخت هوش مصنوعی چندوجهی و سیستم‌های ایجنتی در متا تا تجربه رهبری فنی در پرداخت و تشخیص تقلب آمازون و کار در مقیاس میلیارد کاربر تیک‌تاک.",
  },
  {
    id: "ep-204",
    number: "۲۰۴",
    title: "فرق تراپی واقعی با تصور غلط ازش",
    guest: "دکتر تینا پارسامند",
    topic: "روان‌شناسی و رابطه",
    publishedAt: "۱۷ مرداد ۱۴۰۵",
    duration: "۱:۳۷:۱۳",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/6a74fab7aa557e62dc3a6065/media.mp3",
    description:
      "نگاهی دقیق به استانداردهای تراپی، ریشه‌های کودکی، الگوهای خانوادگی و این‌که چرا درمانگر بیشتر سؤال می‌پرسد تا دستور بدهد.",
  },
  {
    id: "ep-203",
    number: "۲۰۳",
    title: "Inside Shopify’s Product DNA",
    guest: "Brandon Chu",
    topic: "Product management",
    publishedAt: "۹ مرداد ۱۴۰۵",
    duration: "۱:۳۸:۳۳",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/6a6b1f092a5f0f30725584cc/media.mp3",
    description:
      "گفت‌وگویی انگلیسی درباره تفکر محصول، رشد تیم‌های Shopify و ساخت یک سیستم‌عامل AI-native برای کسب‌وکارها.",
  },
  {
    id: "ep-202",
    number: "۲۰۲",
    title: "مدل ساخت و توسعه کسب‌وکار در اسنپ",
    guest: "نوید خدیوی",
    topic: "ونچر بیلدینگ و کسب‌وکار",
    publishedAt: "۲ مرداد ۱۴۰۵",
    duration: "۲:۰۳:۲۳",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/6a60d1737d20badb289d7d06/media.mp3",
    description:
      "مرور مسیر ساخت هیت، اسنپ‌کیو، اسنپ ساپلای و اسنپ استور؛ از آزمایش ایده‌ها تا تصمیم‌گیری برای توقف پروژه‌های ناموفق.",
  },
  {
    id: "ep-201",
    number: "۲۰۱",
    title: "از پزشکی تا ساخت بزرگ‌ترین پلتفرم آموزشی",
    guest: "آرمان موسوی",
    topic: "فناوری آموزشی",
    publishedAt: "۲۶ تیر ۱۴۰۵",
    duration: "۱:۳۸:۲۳",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/695539b15f9b0b61aab201dd/media.mp3",
    description:
      "روایت شکل‌گیری گروه آموزشی ماز، گذار از پزشکی به کارآفرینی و توسعه یک کسب‌وکار آموزش آنلاین بدون سرمایه اولیه.",
  },
  {
    id: "ep-200",
    number: "۲۰۰",
    title: "خالق و بنیان‌گذار گروه دیجی‌کالا",
    guest: "سعید محمدی",
    topic: "اقتصاد دیجیتال و استراتژی",
    publishedAt: "۱۹ تیر ۱۴۰۵",
    duration: "۲:۵۷:۰۱",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/6a4f8a030be8a6771705139a/media.mp3",
    description:
      "نگاهی به بیست سال ساخت دیجی‌کالا، تحول ساختار هلدینگ، مدیریت بحران و آینده فرصت‌های منطقه‌ای استارتاپ‌های ایرانی.",
  },
  {
    id: "ep-199",
    number: "۱۹۹",
    title: "مدیریت دیجی‌کالا و آینده تجارت الکترونیک",
    guest: "مسعود طباطبایی",
    topic: "رهبری و تجارت الکترونیک",
    publishedAt: "۱۳ تیر ۱۴۰۵",
    duration: "۱:۵۰:۰۳",
    audioUrl:
      "https://sphinx.acast.com/p/open/s/625bd31dc030a00012e0dba7/e/6a4701cf5ef16cb804c2fdfd/media.mp3",
    description:
      "از تجربه شکست و ساخت استارتاپ تا رهبری اجرایی علی‌بابا، اسنپ اکسپرس و دیجی‌کالا؛ همراه با بحثی درباره هوش مصنوعی و مدیریت محصول.",
  },
];

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const arDigits = "٠١٢٣٤٥٦٧٨٩";

function toFa(value: string | number) {
  return String(value).replace(/\d/g, (digit) => faDigits[Number(digit)]);
}

function latinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(faDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arDigits.indexOf(digit)));
}

function durationToSeconds(value: string) {
  const parts = latinDigits(value).split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

function timeLabel(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return toFa(
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
      : `${minutes}:${String(rest).padStart(2, "0")}`,
  );
}

function downloadText(filename: string, content: string) {
  const blob = new Blob(["\uFEFF", content], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function postAction(
  key: string,
  payload: Record<string, unknown>,
  mayRetry = true,
): Promise<ApiResult> {
  const response = await fetch("/api/transcripts", {
    method: "POST",
    headers: { "content-type": "application/json", "x-gemini-key": key },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let result: ApiResult;
  try {
    result = JSON.parse(raw) as ApiResult;
  } catch {
    throw new Error(
      response.ok
        ? "پاسخ سامانه قابل خواندن نبود. لطفاً دوباره تلاش کنید."
        : `سامانه پاسخ معتبری برنگرداند (کد ${toFa(response.status)}).`,
    );
  }
  if (!response.ok || result.status === "error") {
    const message = result.error || "پردازش این مرحله ناموفق بود.";
    if (
      mayRetry &&
      ([429, 502, 503, 504].includes(response.status) ||
        /سهمیه|تعداد درخواست|high demand|temporar|try again later|overloaded|quota|rate/i.test(message))
    ) {
      await wait(12000);
      return postAction(key, payload, false);
    }
    throw new Error(message);
  }
  return result;
}

function cleanGeneratedJson(raw: string) {
  return raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
}

async function postStreamAction<T>(
  key: string,
  payload: Record<string, unknown>,
  mayRetry = true,
): Promise<{ result: T; model: string }> {
  let response: Response;
  let raw: string;
  try {
    response = await fetch("/api/transcripts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-gemini-key": key },
      body: JSON.stringify(payload),
    });
    raw = await response.text();
  } catch {
    if (mayRetry) {
      await wait(8000);
      return postStreamAction<T>(key, { ...payload, preferFallback: true }, false);
    }
    throw new Error("ارتباط جریانی هنگام پردازش قطع شد؛ دوباره تلاش کنید.");
  }

  if (!response.ok) {
    let message = `پردازش جریانی ناموفق بود (کد ${toFa(response.status)}).`;
    try {
      message = (JSON.parse(raw) as ApiResult).error || message;
    } catch {
      // A gateway error may return HTML instead of JSON.
    }
    if (
      mayRetry &&
      ([429, 502, 503, 504].includes(response.status) ||
        /سهمیه|تعداد درخواست|high demand|temporar|try again later|overloaded|quota|rate/i.test(message))
    ) {
      await wait(15000);
      return postStreamAction<T>(key, { ...payload, preferFallback: true }, false);
    }
    throw new Error(message);
  }

  let generatedText = "";
  let model = response.headers.get("x-gemini-model") || "Gemini";
  let finishReason = "";
  let streamError = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const event = JSON.parse(data) as {
        modelVersion?: string;
        error?: { message?: string };
        candidates?: Array<{
          finishReason?: string;
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      if (event.error?.message) {
        streamError = event.error.message;
        continue;
      }
      model = event.modelVersion || model;
      const candidate = event.candidates?.[0];
      finishReason = candidate?.finishReason || finishReason;
      generatedText += candidate?.content?.parts?.map((part) => part.text ?? "").join("") || "";
    } catch {
      // Ignore keep-alive or non-JSON SSE lines.
    }
  }

  if (streamError) {
    if (
      mayRetry &&
      /high demand|temporar|try again later|overloaded|quota|rate/i.test(streamError)
    ) {
      await wait(15000);
      return postStreamAction<T>(key, { ...payload, preferFallback: true }, false);
    }
    throw new Error(streamError);
  }
  if (finishReason === "MAX_TOKENS") {
    throw new Error("این بخش از سقف خروجی عبور کرد و باید به بازه‌های کوچک‌تر تقسیم شود.");
  }
  if (!generatedText.trim()) throw new Error("Gemini خروجی قابل استفاده‌ای برنگرداند.");
  try {
    return { result: JSON.parse(cleanGeneratedJson(generatedText)) as T, model };
  } catch {
    throw new Error("خروجی Gemini ساخته شد اما ساختار آن قابل خواندن نبود؛ دوباره تلاش کنید.");
  }
}

function timestampToSeconds(value: string) {
  if (!value.includes(":")) return -1;
  return durationToSeconds(value);
}

function normalizeUtterances(result: TranscriptResult, rangeStart: number, rangeEnd: number) {
  return (result.segments ?? [])
    .map((segment) => {
      const start = timestampToSeconds(segment.start_timestamp?.trim() || "");
      const parsedEnd = timestampToSeconds(segment.end_timestamp?.trim() || "");
      return {
        speaker: segment.speaker?.trim() || "گوینده نامشخص",
        text: segment.text?.replace(/\s+/g, " ").trim() || "",
        start,
        end: Math.max(start, parsedEnd),
      };
    })
    .filter((item) =>
      item.text &&
      item.start >= Math.max(0, rangeStart - 10) &&
      item.start < rangeEnd + 15 &&
      item.end <= rangeEnd + 45,
    )
    .sort((first, second) => first.start - second.start);
}

function transcriptQuality(utterances: Utterance[], rangeStart: number, rangeEnd: number) {
  const duration = Math.max(1, rangeEnd - rangeStart);
  const wordCount = utterances.reduce(
    (total, item) => total + item.text.split(/\s+/).filter(Boolean).length,
    0,
  );
  const expectedMinWords = Math.max(16, Math.floor((duration / 60) * 28));
  const coveredFrom = utterances.length ? utterances[0].start : rangeEnd;
  const coveredUntil = utterances.reduce((latest, item) => Math.max(latest, item.end), rangeStart);
  const edgeTolerance = Math.min(90, Math.max(25, Math.floor(duration * 0.2)));
  const passed =
    wordCount >= expectedMinWords &&
    coveredFrom <= rangeStart + edgeTolerance &&
    coveredUntil >= rangeEnd - edgeTolerance;
  return { passed, wordCount, expectedMinWords, coveredFrom, coveredUntil };
}

function section(title: string, body: string | string[] | undefined) {
  if (!body || (Array.isArray(body) && !body.length)) return "";
  return `## ${title}\n${Array.isArray(body) ? body.map((item) => `- ${item}`).join("\n") : body}`;
}

function mergeUtterances(groups: Utterance[][]) {
  const ordered = groups.flat().filter((item) => item.text.trim()).sort((a, b) => a.start - b.start);
  return ordered.filter((item, index) => {
    const previous = ordered[index - 1];
    if (!previous) return true;
    return !(
      Math.abs(previous.start - item.start) <= 2 &&
      previous.text.replace(/\s+/g, " ") === item.text.replace(/\s+/g, " ")
    );
  });
}

function speakerLabel(value: string) {
  return /^\d+$/.test(value) ? `گوینده ${toFa(value)}` : value;
}

const ANALYSIS_DB_NAME = "tabaghe16-notes-v2";
const ANALYSIS_STORE = "analyses";

function openAnalysisDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(ANALYSIS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ANALYSIS_STORE)) {
        request.result.createObjectStore(ANALYSIS_STORE, { keyPath: "episodeId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadSavedAnalyses() {
  const database = await openAnalysisDb();
  return new Promise<Record<string, Analysis>>((resolve, reject) => {
    const transaction = database.transaction(ANALYSIS_STORE, "readonly");
    const request = transaction.objectStore(ANALYSIS_STORE).getAll();
    request.onsuccess = () => {
      const records = request.result as Array<{ episodeId: string; analysis: Analysis }>;
      resolve(Object.fromEntries(records.map((record) => [record.episodeId, record.analysis])));
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function saveCompletedAnalysis(episodeId: string, analysis: Analysis) {
  if (analysis.status !== "completed") return;
  const database = await openAnalysisDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ANALYSIS_STORE, "readwrite");
    transaction.objectStore(ANALYSIS_STORE).put({ episodeId, analysis });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

function StructuredNote({ content }: { content: string }) {
  return (
    <div className="summary-prose">
      {content.split(/\n\n+/).filter(Boolean).map((block, index) => {
        const lines = block.split("\n").filter(Boolean);
        const heading = lines[0]?.startsWith("## ") ? lines.shift()?.slice(3) : "";
        const bullets = lines.filter((line) => line.startsWith("- "));
        const prose = lines.filter((line) => !line.startsWith("- ")).join(" ");
        return (
          <section className="note-section" key={`${heading}-${index}`}>
            {heading && <h4>{heading}</h4>}
            {prose && <p>{prose}</p>}
            {bullets.length > 0 && (
              <ul>{bullets.map((line, itemIndex) => <li key={itemIndex}>{line.slice(2)}</li>)}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [episodes, setEpisodes] = useState(fallbackEpisodes);
  const [selectedId, setSelectedId] = useState(fallbackEpisodes[0].id);
  const [query, setQuery] = useState("");
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [apiKey, setApiKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [copied, setCopied] = useState<"summary" | "analysis" | "transcript" | null>(null);

  const selected = episodes.find((episode) => episode.id === selectedId) ?? episodes[0];
  const analysis = analyses[selected?.id] ?? { status: "idle" };

  const filteredEpisodes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa");
    if (!normalized) return episodes;
    return episodes.filter((episode) =>
      [episode.title, episode.guest, episode.topic, episode.number]
        .join(" ")
        .toLocaleLowerCase("fa")
        .includes(normalized),
    );
  }, [episodes, query]);

  useEffect(() => {
    const savedKey = sessionStorage.getItem("tabaghe16-gemini-key") ?? "";
    queueMicrotask(() => {
      setApiKey(savedKey);
      setDraftKey(savedKey);
    });

    loadSavedAnalyses().then(setAnalyses).catch(() => undefined);

    fetch("/api/episodes")
      .then(async (response) => {
        if (!response.ok) throw new Error("feed unavailable");
        return response.json() as Promise<{ episodes: Episode[] }>;
      })
      .then((data) => {
        if (data.episodes?.length) {
          setEpisodes(data.episodes);
          setSelectedId(data.episodes[0].id);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsLoadingEpisodes(false));
  }, []);

  function updateAnalysis(episodeId: string, next: Partial<Analysis>) {
    setAnalyses((current) => ({
      ...current,
      [episodeId]: (() => {
        const value = { ...(current[episodeId] ?? { status: "idle" as const }), ...next };
        void saveCompletedAnalysis(episodeId, value).catch(() => undefined);
        return value;
      })(),
    }));
  }

  function saveKey() {
    const value = draftKey.trim();
    sessionStorage.setItem("tabaghe16-gemini-key", value);
    setApiKey(value);
    setKeyDialogOpen(false);
  }

  async function startAnalysis() {
    if (!selected) return;
    if (!apiKey) {
      setKeyDialogOpen(true);
      return;
    }

    const episode = selected;
    const durationSeconds = durationToSeconds(episode.duration);
    if (durationSeconds < 60) {
      updateAnalysis(episode.id, {
        status: "error",
        error: "مدت این اپیزود در فید مشخص نیست و امکان کنترل کامل بودن متن وجود ندارد.",
      });
      return;
    }

    const chunkSeconds = 10 * 60;
    const ranges = Array.from(
      { length: Math.ceil(durationSeconds / chunkSeconds) },
      (_, index) => ({
        start: index * chunkSeconds,
        end: Math.min(durationSeconds, (index + 1) * chunkSeconds),
      }),
    );
    let totalSteps = ranges.length + 2;
    let completedSteps = 0;
    let uploadedFile: FileRef | undefined;

    const setProgress = (
      stage: "uploading" | "transcribing" | "analyzing",
      extra: Partial<Analysis> = {},
    ) => updateAnalysis(episode.id, {
      status: "processing",
      stage,
      progress: { completed: completedSteps, total: totalSteps },
      ...extra,
    });

    setProgress("uploading", {
      status: "processing",
      error: undefined,
      summary: undefined,
      analysis: undefined,
      text: undefined,
      utterances: undefined,
      wordCount: undefined,
      coverage: undefined,
    });

    try {
      const uploaded = await postAction(apiKey, {
        action: "upload",
        audioUrl: episode.audioUrl,
        title: episode.title,
        guest: episode.guest,
      });
      if (!uploaded.file) throw new Error("بارگذاری فایل صوتی کامل نشد.");
      uploadedFile = uploaded.file;
      completedSteps += 1;
      setProgress("transcribing");

      const transcribeInterval = async (
        rangeStart: number,
        rangeEnd: number,
        depth = 0,
      ): Promise<Utterance[]> => {
        const splitRange = async () => {
          if (rangeEnd - rangeStart <= 5 * 60 || depth >= 2) {
            throw new Error(
              `کنترل کیفیت بازه ${timeLabel(rangeStart)} تا ${timeLabel(rangeEnd)} رد شد؛ متن ناقص ذخیره نشد. دوباره تلاش کنید.`,
            );
          }
          const middle = Math.floor((rangeStart + rangeEnd) / 2);
          totalSteps += 2;
          setProgress("transcribing");
          const first = await transcribeInterval(rangeStart, middle, depth + 1);
          const second = await transcribeInterval(middle, rangeEnd, depth + 1);
          return [...first, ...second];
        };

        try {
          const generated = await postStreamAction<TranscriptResult>(apiKey, {
            action: "transcribe",
            file: uploadedFile,
            title: episode.title,
            guest: episode.guest,
            rangeStart,
            rangeEnd,
          });
          completedSteps += 1;
          setProgress("transcribing");

          const utterances = normalizeUtterances(generated.result, rangeStart, rangeEnd);
          const quality = transcriptQuality(utterances, rangeStart, rangeEnd);
          if (quality.passed && utterances.length) return utterances;
          return splitRange();
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (/سقف خروجی|ساختار آن قابل خواندن/i.test(message)) {
            completedSteps += 1;
            setProgress("transcribing");
            return splitRange();
          }
          throw error;
        }
      };

      const groups: Utterance[][] = new Array(ranges.length);
      let nextRange = 0;
      const worker = async () => {
        while (nextRange < ranges.length) {
          const index = nextRange;
          nextRange += 1;
          groups[index] = await transcribeInterval(ranges[index].start, ranges[index].end);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(2, ranges.length) }, () => worker()),
      );

      const utterances = mergeUtterances(groups);
      const wordCount = utterances.reduce(
        (total, item) => total + item.text.split(/\s+/).filter(Boolean).length,
        0,
      );
      const minimumWords = Math.max(60, Math.floor((durationSeconds / 60) * 28));
      const coveredUntil = utterances.reduce((latest, item) => Math.max(latest, item.end), 0);
      const coverage = Math.min(100, Math.round((coveredUntil / durationSeconds) * 100));
      if (wordCount < minimumWords || coveredUntil < durationSeconds - 90) {
        throw new Error(
          `متن از کنترل پوشش کامل عبور نکرد (${toFa(wordCount)} واژه، پوشش ${toFa(coverage)}٪) و ذخیره نشد.`,
        );
      }

      setProgress("analyzing", { utterances, wordCount, coverage });
      const generated = await postStreamAction<PodcastAnalysis>(apiKey, {
        action: "analyze",
        title: episode.title,
        guest: episode.guest,
        durationSeconds,
        utterances,
      });
      const result = generated.result;
      const summary = [
        section("خلاصه مدیریتی", result.executive_summary),
        section("نکات کلیدی", result.key_points),
        section(
          "فصل‌بندی اپیزود",
          result.chapters?.map((item) => `${item.timestamp || "—"} — ${item.title || "بدون عنوان"}`),
        ),
        section("درس‌های کاربردی", result.practical_takeaways),
      ].filter(Boolean).join("\n\n");
      const deepAnalysis = [
        section("تحلیل عمیق", result.deep_analysis),
        section("پرسش‌های باز", result.open_questions),
      ].filter(Boolean).join("\n\n");
      completedSteps += 1;
      updateAnalysis(episode.id, {
        status: "completed",
        stage: "analyzing",
        progress: { completed: completedSteps, total: totalSteps },
        text: utterances.map((item) => item.text).join("\n\n"),
        summary,
        analysis: deepAnalysis,
        utterances,
        wordCount,
        coverage,
        model: generated.model,
        error: undefined,
      });
    } catch (error) {
      updateAnalysis(episode.id, {
        status: "error",
        error: error instanceof Error ? error.message : "خطای ناشناخته",
      });
    } finally {
      if (uploadedFile?.name) {
        await postAction(apiKey, { action: "cleanup", fileName: uploadedFile.name })
          .catch(() => undefined);
      }
    }
  }

  async function copyContent(kind: "summary" | "analysis" | "transcript", content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  }

  const isRunning = analysis.status === "queued" || analysis.status === "processing";
  const progressPercent = analysis.progress?.total
    ? Math.min(100, Math.round((analysis.progress.completed / analysis.progress.total) * 100))
    : 0;
  const transcriptText = analysis.utterances?.length
    ? analysis.utterances
        .map(
          (item) =>
            `[${timeLabel(item.start)}] ${speakerLabel(item.speaker)}:\n${item.text}`,
        )
        .join("\n\n")
    : analysis.text ?? "";
  const completeNote = `# پادکست طبقه ۱۶ — اپیزود ${selected?.number ?? ""}\n\n` +
    `**مهمان:** ${selected?.guest ?? ""}\n\n**عنوان:** ${selected?.title ?? ""}\n\n` +
    `${analysis.summary ?? ""}\n\n${analysis.analysis ?? ""}\n\n## متن کامل\n${transcriptText}`;

  if (!selected) return null;

  return (
    <main className="podcast-shell" dir="rtl">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">۱۶</div>
          <div>
            <p className="eyebrow">دفتر شنیداری شخصی</p>
            <h1>طبقه شانزده</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <Badge className="engine-badge" variant="outline">
            <span className={apiKey ? "status-dot is-ready" : "status-dot"} />
            {apiKey ? "Gemini متصل" : "Gemini آماده اتصال"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="settings-button"
            onClick={() => setKeyDialogOpen(true)}
          >
            <KeyRound /> تنظیم موتور
          </Button>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="episode-rail" aria-label="فهرست اپیزودها">
          <div className="rail-heading">
            <div>
              <span className="rail-label">آرشیو پادکست</span>
              <strong>{toFa(episodes.length)} اپیزود</strong>
            </div>
            {isLoadingEpisodes && <LoaderCircle className="loading-icon" aria-label="در حال دریافت" />}
          </div>

          <label className="search-box">
            <Search aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجوی مهمان یا موضوع…"
              aria-label="جست‌وجوی اپیزود"
            />
          </label>

          <div className="episode-list">
            {filteredEpisodes.map((episode) => {
              const itemAnalysis = analyses[episode.id];
              const active = episode.id === selected.id;
              return (
                <button
                  type="button"
                  key={episode.id}
                  className={`episode-row${active ? " is-active" : ""}`}
                  onClick={() => setSelectedId(episode.id)}
                >
                  <span className="episode-number">{episode.number}</span>
                  <span className="episode-copy">
                    <strong>{episode.guest}</strong>
                    <span>{episode.title}</span>
                    <small><Clock3 /> {episode.duration}</small>
                  </span>
                  <span className="episode-state" aria-label="وضعیت اپیزود">
                    {itemAnalysis?.status === "completed" ? (
                      <Check />
                    ) : itemAnalysis?.status === "queued" || itemAnalysis?.status === "processing" ? (
                      <LoaderCircle className="loading-icon" />
                    ) : (
                      <ChevronLeft />
                    )}
                  </span>
                </button>
              );
            })}
            {!filteredEpisodes.length && <div className="empty-list">اپیزودی با این عبارت پیدا نشد.</div>}
          </div>
        </aside>

        <section className="analysis-desk">
          <div className="episode-hero">
            <div className="episode-meta">
              <span>اپیزود {selected.number}</span><i aria-hidden="true" />
              <span>{selected.publishedAt}</span><i aria-hidden="true" />
              <span>{selected.topic}</span>
            </div>
            <h2>{selected.guest}</h2>
            <p className="episode-title">{selected.title}</p>
            <p className="episode-description">{selected.description}</p>

            <div className="audio-console">
              <div className="play-emblem" aria-hidden="true"><Play fill="currentColor" /></div>
              <div className="audio-main">
                <div className="waveform" aria-hidden="true">
                  {Array.from({ length: 32 }, (_, index) => (
                    <span
                      key={index}
                      style={{ "--bar": `${18 + ((index * 13) % 37)}px` } as React.CSSProperties}
                    />
                  ))}
                </div>
                <audio key={selected.id} controls preload="none" src={selected.audioUrl}>
                  مرورگر شما از پخش‌کننده صوت پشتیبانی نمی‌کند.
                </audio>
              </div>
              <span className="duration-chip">{selected.duration}</span>
            </div>
          </div>

          {analysis.status !== "completed" ? (
            <section className="start-panel" aria-live="polite">
              <div className="start-icon">
                {isRunning ? <LoaderCircle className="loading-icon" /> : <WandSparkles />}
              </div>
              <div className="start-copy">
                <h3>
                  {isRunning
                    ? analysis.stage === "uploading"
                      ? "در حال انتقال امن فایل صوتی…"
                      : analysis.stage === "transcribing"
                        ? "در حال ساخت متن کامل اپیزود…"
                        : "در حال خلاصه‌سازی و تحلیل متن…"
                    : analysis.status === "error"
                      ? "پردازش کامل نشد"
                      : "متن و خلاصه این اپیزود را بساز"}
                </h3>
                <p>
                  {isRunning
                    ? analysis.stage === "uploading"
                      ? "فایل فقط یک‌بار به Gemini منتقل می‌شود و پس از پایان حذف خواهد شد."
                      : analysis.stage === "transcribing"
                        ? `${toFa(analysis.progress?.completed ?? 0)} از ${toFa(analysis.progress?.total ?? 0)} مرحله · هر بازه ناقص خودکار دوباره پردازش می‌شود.`
                        : "خلاصه و تحلیل اکنون فقط از روی متن کنترل‌شده ساخته می‌شوند."
                    : analysis.status === "error"
                      ? analysis.error
                      : "ابتدا رونویسی کامل و کنترل پوشش؛ سپس خلاصه و تحلیل مستند با تایم‌کد."}
                </p>
                {isRunning && (
                  <div className="processing-progress">
                    <Progress value={progressPercent} aria-label={`پیشرفت ${progressPercent} درصد`} />
                    <span>{toFa(progressPercent)}٪</span>
                  </div>
                )}
              </div>
              <Button size="lg" className="primary-action" onClick={startAnalysis} disabled={isRunning}>
                {isRunning ? <LoaderCircle className="loading-icon" /> : <Sparkles />}
                {analysis.status === "error" ? "تلاش دوباره" : isRunning ? "در حال پردازش" : "ساخت متن و خلاصه"}
              </Button>
            </section>
          ) : (
            <section className="result-area">
              <div className="result-heading">
                <div>
                  <span className="complete-kicker"><Check /> متن از کنترل کیفیت عبور کرد</span>
                  <h3>یادداشت هوشمند اپیزود</h3>
                </div>
                <div className="result-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadText(`tabaghe16-ep${selected.number}-notebook.md`, completeNote)}
                  >
                    <Download /> بسته کامل
                  </Button>
                  <Button variant="outline" size="sm" onClick={startAnalysis}>
                    <Sparkles /> پردازش دوباره
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="summary" className="content-tabs">
                <TabsList variant="line" className="tab-list">
                  <TabsTrigger value="summary"><BookOpenText /> خلاصه هوشمند</TabsTrigger>
                  <TabsTrigger value="analysis"><Sparkles /> تحلیل عمیق</TabsTrigger>
                  <TabsTrigger value="transcript"><TextQuote /> متن کامل</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="content-sheet">
                  <div className="sheet-toolbar">
                    <span>
                      خلاصه فارسی · تولیدشده فقط از متن کنترل‌شده
                    </span>
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => copyContent("summary", analysis.summary ?? "")}>
                        {copied === "summary" ? <Check /> : <Copy />}
                        {copied === "summary" ? "کپی شد" : "کپی"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          downloadText(
                            `tabaghe16-ep${selected.number}-summary.txt`,
                            `${selected.guest} — ${selected.title}\n\n${analysis.summary ?? ""}`,
                          )
                        }
                      >
                        <Download /> دریافت فایل
                      </Button>
                    </div>
                  </div>
                  <StructuredNote content={analysis.summary || "خلاصه این اپیزود آماده نشد."} />
                </TabsContent>

                <TabsContent value="analysis" className="content-sheet">
                  <div className="sheet-toolbar">
                    <span>تحلیل استدلال‌ها، الگوها و پرسش‌های باز</span>
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => copyContent("analysis", analysis.analysis ?? "")}>
                        {copied === "analysis" ? <Check /> : <Copy />}
                        {copied === "analysis" ? "کپی شد" : "کپی"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          downloadText(
                            `tabaghe16-ep${selected.number}-analysis.txt`,
                            `${selected.guest} — ${selected.title}\n\n${analysis.analysis ?? ""}`,
                          )
                        }
                      >
                        <Download /> دریافت فایل
                      </Button>
                    </div>
                  </div>
                  <StructuredNote content={analysis.analysis || "تحلیل عمیق این اپیزود آماده نشد."} />
                </TabsContent>

                <TabsContent value="transcript" className="content-sheet">
                  <div className="sheet-toolbar">
                    <span>
                      {toFa(analysis.utterances?.length ?? 0)} بخش · {toFa(analysis.wordCount ?? 0)} واژه · پوشش {toFa(analysis.coverage ?? 0)}٪
                    </span>
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => copyContent("transcript", transcriptText)}>
                        {copied === "transcript" ? <Check /> : <Copy />}
                        {copied === "transcript" ? "کپی شد" : "کپی"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          downloadText(
                            `tabaghe16-ep${selected.number}-transcript.txt`,
                            `${selected.guest} — ${selected.title}\n\n${transcriptText}`,
                          )
                        }
                      >
                        <Download /> دریافت فایل
                      </Button>
                    </div>
                  </div>
                  {analysis.utterances?.length ? (
                    <div className="transcript-stream">
                      {analysis.utterances.map((item, index) => (
                        <article key={`${item.start}-${index}`}>
                          <span className="timestamp">{timeLabel(item.start)}</span>
                          <div>
                            <strong>{speakerLabel(item.speaker)}</strong>
                            <p>{item.text}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="summary-prose"><p>{analysis.text}</p></div>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          )}

          <footer className="desk-footer">
            <span><Headphones /> منبع اپیزودها: فید عمومی پادکست طبقه ۱۶</span>
            <span>نتیجه روی همین دستگاه ذخیره می‌شود · کلید روی سرور ذخیره نمی‌شود</span>
          </footer>
        </section>
      </div>

      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent className="key-dialog" dir="rtl">
          <DialogHeader>
            <div className="dialog-icon"><KeyRound /></div>
            <DialogTitle>اتصال موتور Gemini</DialogTitle>
            <DialogDescription>
              کلید Google AI Studio را وارد کنید. کلید فقط تا پایان همین نشست در مرورگر شما می‌ماند؛ فایل صوتی برای پردازش به Gemini ارسال می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="key-field">
            <label htmlFor="api-key">کلید API</label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
              placeholder="••••••••••••••••••••"
              dir="ltr"
            />
            <p>
              ساخت کلید از <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> امکان‌پذیر است. کلید خود را در پیام یا چت برای کسی ارسال نکنید.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyDialogOpen(false)}>انصراف</Button>
            <Button onClick={saveKey} disabled={!draftKey.trim()}><Check /> ذخیره برای این نشست</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
