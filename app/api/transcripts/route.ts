const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-flash-latest";

type FileRef = { name: string; uri: string; mimeType: string };
type Utterance = { speaker: string; text: string; start: number; end: number };

function apiKey(request: Request) {
  return request.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
}

function errorResponse(message: string, status: number) {
  return Response.json({ status: "error", error: message }, { status });
}

async function readableJson<T>(response: Response): Promise<T & { error?: { message?: string } }> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as T & { error?: { message?: string } };
  } catch {
    return {
      error: {
        message: response.ok
          ? "پاسخ Gemini قابل خواندن نبود."
          : `Gemini با کد ${response.status} پاسخ نامعتبر برگرداند.`,
      },
    } as T & { error?: { message?: string } };
  }
}

function validateAudioUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "sphinx.acast.com" ? url : null;
  } catch {
    return null;
  }
}

function validateFileRef(value: unknown): FileRef | null {
  if (!value || typeof value !== "object") return null;
  const file = value as Partial<FileRef>;
  if (
    !file.name ||
    !/^files\/[a-zA-Z0-9_-]+$/.test(file.name) ||
    !file.uri ||
    !file.mimeType ||
    !/^audio\/[a-zA-Z0-9.+-]+$/.test(file.mimeType)
  ) return null;

  try {
    const url = new URL(file.uri);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "generativelanguage.googleapis.com" ||
      !/^\/v1beta\/files\/[a-zA-Z0-9_-]+$/.test(url.pathname)
    ) return null;
  } catch {
    return null;
  }

  return { name: file.name, uri: file.uri, mimeType: file.mimeType };
}

async function uploadAudio(audioUrl: string, key: string, displayName: string): Promise<FileRef> {
  const source = await fetch(audioUrl, {
    headers: { "user-agent": "Tabaghe16PersonalNotes/3.0" },
  });
  if (!source.ok || !source.body) {
    throw new Error("دریافت فایل صوتی از منبع پادکست ناموفق بود.");
  }

  const size = source.headers.get("content-length");
  if (!size || !/^\d+$/.test(size)) {
    throw new Error("اندازه فایل صوتی از سمت منبع اعلام نشد؛ دوباره تلاش کنید.");
  }
  if (Number(size) > 2 * 1024 * 1024 * 1024) {
    throw new Error("حجم فایل صوتی از سقف مجاز Gemini بیشتر است.");
  }

  const mimeType = source.headers.get("content-type")?.split(";")[0] || "audio/mpeg";
  const start = await fetch(GEMINI_UPLOAD_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "x-goog-upload-protocol": "resumable",
      "x-goog-upload-command": "start",
      "x-goog-upload-header-content-length": size,
      "x-goog-upload-header-content-type": mimeType,
      "content-type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });

  if (!start.ok) {
    const details = await readableJson<Record<string, never>>(start);
    throw new Error(
      start.status === 400 || start.status === 401 || start.status === 403
        ? "کلید Gemini معتبر نیست یا دسترسی Files API برای آن فعال نشده است."
        : details.error?.message || "شروع بارگذاری فایل در Gemini ناموفق بود.",
    );
  }

  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini آدرس بارگذاری فایل را برنگرداند.");

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "content-length": size,
      "x-goog-upload-offset": "0",
      "x-goog-upload-command": "upload, finalize",
    },
    body: source.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const uploaded = await readableJson<{
    file?: { name?: string; uri?: string; mimeType?: string };
  }>(upload);
  const file = validateFileRef({
    name: uploaded.file?.name,
    uri: uploaded.file?.uri,
    mimeType: uploaded.file?.mimeType || mimeType,
  });
  if (!upload.ok || !file) {
    throw new Error(uploaded.error?.message || "بارگذاری فایل صوتی در Gemini کامل نشد.");
  }
  return file;
}

const transcriptSchema = {
  type: "object",
  properties: {
    segments: {
      type: "array",
      description: "تمام نوبت‌های گفتار در بازه خواسته‌شده، به ترتیب زمانی و بدون حذف",
      items: {
        type: "object",
        properties: {
          start_timestamp: { type: "string", description: "زمان شروع مطلق با قالب HH:MM:SS" },
          end_timestamp: { type: "string", description: "زمان پایان مطلق با قالب HH:MM:SS" },
          speaker: { type: "string", description: "نام یا نقش ثابت گوینده" },
          text: { type: "string", description: "رونویسی کامل و بدون خلاصه‌سازی همان نوبت" },
        },
        required: ["start_timestamp", "end_timestamp", "speaker", "text"],
      },
    },
  },
  required: ["segments"],
};

const analysisSchema = {
  type: "object",
  properties: {
    executive_summary: {
      type: "string",
      description: "خلاصه مدیریتی دقیق و منسجم به فارسی در ۳ تا ۵ پاراگراف همراه با تایم‌کد شواهد",
    },
    key_points: {
      type: "array",
      items: { type: "string" },
      description: "نکات کلیدی غیرتکراری؛ هر نکته باید حداقل یک تایم‌کد داشته باشد",
    },
    deep_analysis: {
      type: "string",
      description: "تحلیل عمیق استدلال‌ها، الگوها و تضادها فقط بر پایه متن، همراه با تایم‌کد",
    },
    practical_takeaways: {
      type: "array",
      items: { type: "string" },
      description: "درس‌های عملی مستند به متن و تایم‌کد",
    },
    open_questions: {
      type: "array",
      items: { type: "string" },
      description: "پرسش‌های مهمی که گفت‌وگو باز می‌گذارد",
    },
    chapters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          timestamp: { type: "string", description: "زمان شروع با قالب HH:MM:SS" },
          title: { type: "string", description: "عنوان کوتاه فصل به فارسی" },
        },
        required: ["timestamp", "title"],
      },
    },
  },
  required: [
    "executive_summary",
    "key_points",
    "deep_analysis",
    "practical_takeaways",
    "open_questions",
    "chapters",
  ],
};

async function streamStructuredResponse(options: {
  key: string;
  parts: Array<{ text: string } | { fileData: { mimeType: string; fileUri: string } }>;
  schema: Record<string, unknown>;
  system: string;
  maxOutputTokens: number;
  preferFallback?: boolean;
}) {
  const requestBody = {
    contents: [{ role: "user", parts: options.parts }],
    systemInstruction: { parts: [{ text: options.system }] },
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseJsonSchema: options.schema,
    },
  };

  let lastMessage = "پردازش در Gemini ناموفق بود.";
  let lastStatus = 502;
  const models = options.preferFallback
    ? [FALLBACK_MODEL, PRIMARY_MODEL]
    : [PRIMARY_MODEL, FALLBACK_MODEL];
  for (const model of models) {
    console.log("[transcripts] opening Gemini stream", { model });
    const response = await fetch(`${GEMINI_API_BASE}/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "x-goog-api-key": options.key, "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    lastStatus = response.status;
    if (response.ok && response.body) {
      console.log("[transcripts] Gemini stream opened", { model, status: response.status });
      return new Response(response.body, {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-store, no-transform",
          "x-accel-buffering": "no",
          "x-gemini-model": model,
        },
      });
    }

    const data = await readableJson<Record<string, never>>(response);
    lastMessage = data.error?.message || lastMessage;
    const modelUnavailable =
      response.status === 404 ||
      /model.*(?:not found|not available|no longer available|unsupported)/i.test(lastMessage);
    const transientFailure =
      [429, 500, 502, 503, 504].includes(response.status) ||
      /high demand|temporar|try again later|overloaded|unavailable/i.test(lastMessage);
    if ((!modelUnavailable && !transientFailure) || model === models[models.length - 1]) break;
  }

  if (lastStatus === 401 || lastStatus === 403) {
    return errorResponse("کلید Gemini معتبر نیست یا اجازه استفاده از مدل را ندارد.", 403);
  }
  if (lastStatus === 429) {
    return errorResponse(
      "سهمیه یا تعداد درخواست‌های Gemini موقتاً پر شده است؛ چند ثانیه بعد دوباره تلاش کنید.",
      429,
    );
  }
  return errorResponse(lastMessage, lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502);
}

function formatTimestamp(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return [hours, minutes, rest].map((part) => String(part).padStart(2, "0")).join(":");
}

function transcriptPrompt(title: string, guest: string, rangeStart: number, rangeEnd: number) {
  const start = formatTimestamp(rangeStart);
  const end = formatTimestamp(rangeEnd);
  return `
این فایل اپیزود «${title}» از پادکست طبقه ۱۶ با مهمان «${guest}» است.

فقط بازه ${start} تا ${end} را از ابتدا تا انتهای همین بازه، کامل و کلمه‌به‌کلمه رونویسی کن.

قواعد قطعی:
1. هیچ جمله، مثال، عدد، نام، پرسش، پاسخ، تبلیغ یا توضیح معناداری را حذف یا خلاصه نکن.
2. هر بار که گوینده عوض می‌شود یک segment جدید بساز؛ تکه‌های منتخب یا خلاصه تولید نکن.
3. تایم‌کدها مطلق و مربوط به کل فایل باشند، نه زمان نسبی این بازه.
4. نام یا نقش گوینده را در تمام خروجی ثابت نگه دار: «سهیل علوی»، «${guest}»، «تبلیغ» یا «گوینده دیگر».
5. گفتار فارسی را فارسی و گفتار انگلیسی را انگلیسی بنویس. فقط مکث‌ها و تکیه‌کلام‌های کاملاً بی‌معنا قابل حذف‌اند.
6. خارج از بازه ${start} تا ${end} چیزی ننویس.
7. خروجی باید پیوسته باشد و تا پایان بازه ادامه پیدا کند؛ هدف رونویسی کامل است، نه استخراج نکات مهم.
  `.trim();
}

function streamTranscript(
  file: FileRef,
  key: string,
  title: string,
  guest: string,
  rangeStart: number,
  rangeEnd: number,
  preferFallback: boolean,
) {
  return streamStructuredResponse({
    key,
    parts: [
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: transcriptPrompt(title, guest, rangeStart, rangeEnd) },
    ],
    schema: transcriptSchema,
    system:
      "You are a forensic Persian transcription engine. Transcribe every spoken turn in the requested time range. Never summarize, select highlights, paraphrase, or invent speech.",
    maxOutputTokens: 16384,
    preferFallback,
  });
}

function streamAnalysis(
  key: string,
  title: string,
  guest: string,
  durationSeconds: number,
  utterances: Utterance[],
  preferFallback: boolean,
) {
  const transcript = utterances.map((item) =>
    `[${formatTimestamp(item.start)}–${formatTimestamp(item.end)}] ${item.speaker}: ${item.text}`,
  ).join("\n\n");

  return streamStructuredResponse({
    key,
    parts: [{
      text: `
عنوان اپیزود: ${title}
مهمان: ${guest}
مدت: ${formatTimestamp(durationSeconds)}

بر اساس متن کامل زیر، خلاصه و تحلیل فارسی دقیق بساز.

قواعد:
1. فقط از همین متن استفاده کن و هیچ دانش بیرونی، حدس یا نقل‌قول ساختگی اضافه نکن.
2. هر نکته کلیدی، ادعای تحلیلی و درس عملی را با تایم‌کد شاهد مشخص کن.
3. نام‌ها، اعداد، اصطلاحات و تفاوت دیدگاه‌ها را دقیق حفظ کن.
4. فصل‌بندی کل اپیزود را پوشش دهد و از ابتدا تا انتها مرتب باشد.
5. خلاصه و تحلیل تکراری نباشند؛ تحلیل باید استدلال‌ها، روابط علّی، تضادها و محدودیت‌ها را روشن کند.

متن کامل اپیزود:
${transcript}
      `.trim(),
    }],
    schema: analysisSchema,
    system:
      "You are a rigorous Persian podcast analyst. Every claim must be grounded in the supplied transcript and cited with its timestamp. Never invent facts.",
    maxOutputTokens: 12288,
    preferFallback,
  });
}

async function deleteFile(name: string, key: string) {
  if (!/^files\/[a-zA-Z0-9_-]+$/.test(name)) return;
  await fetch(`${GEMINI_API_BASE}/${name}`, {
    method: "DELETE",
    headers: { "x-goog-api-key": key },
  }).catch(() => undefined);
}

function safeText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const key = apiKey(request);
  if (!key) return errorResponse("ابتدا کلید Gemini را در تنظیمات وارد کنید.", 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("درخواست پردازش معتبر نیست.", 400);
  }
  console.log("[transcripts] request", { action: safeText(body.action, 32) || "unknown" });

  try {
    if (body.action === "upload") {
      const parsedUrl = validateAudioUrl(safeText(body.audioUrl, 1000));
      if (!parsedUrl) {
        return errorResponse("فقط فایل‌های رسمی پادکست طبقه ۱۶ قابل پردازش هستند.", 400);
      }
      const title = safeText(body.title, 220) || "اپیزود طبقه ۱۶";
      const guest = safeText(body.guest, 160) || "مهمان اپیزود";
      const file = await uploadAudio(parsedUrl.toString(), key, `${guest} - ${title}`);
      console.log("[transcripts] upload completed", { mimeType: file.mimeType });
      return Response.json({ status: "uploaded", file });
    }

    if (body.action === "transcribe") {
      const file = validateFileRef(body.file);
      const rangeStart = Number(body.rangeStart);
      const rangeEnd = Number(body.rangeEnd);
      if (
        !file ||
        !Number.isInteger(rangeStart) ||
        !Number.isInteger(rangeEnd) ||
        rangeStart < 0 ||
        rangeEnd <= rangeStart ||
        rangeEnd - rangeStart > 610 ||
        rangeEnd > 6 * 3600
      ) return errorResponse("بازه رونویسی یا فایل معتبر نیست.", 400);

      return await streamTranscript(
        file,
        key,
        safeText(body.title, 220) || "اپیزود طبقه ۱۶",
        safeText(body.guest, 160) || "مهمان اپیزود",
        rangeStart,
        rangeEnd,
        body.preferFallback === true,
      );
    }

    if (body.action === "analyze") {
      const durationSeconds = Number(body.durationSeconds);
      const rawUtterances = Array.isArray(body.utterances) ? body.utterances : [];
      const utterances = rawUtterances.slice(0, 12000).map((item) => {
        const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          speaker: safeText(value.speaker, 120) || "گوینده نامشخص",
          text: safeText(value.text, 6000),
          start: Math.max(0, Number(value.start) || 0),
          end: Math.max(0, Number(value.end) || Number(value.start) || 0),
        };
      }).filter((item) => item.text);
      const totalCharacters = utterances.reduce((total, item) => total + item.text.length, 0);
      if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds < 60 ||
        durationSeconds > 6 * 3600 ||
        !utterances.length ||
        totalCharacters < 500 ||
        totalCharacters > 1_500_000
      ) return errorResponse("متن کامل برای تحلیل معتبر نیست.", 400);

      return await streamAnalysis(
        key,
        safeText(body.title, 220) || "اپیزود طبقه ۱۶",
        safeText(body.guest, 160) || "مهمان اپیزود",
        Math.floor(durationSeconds),
        utterances,
        body.preferFallback === true,
      );
    }

    if (body.action === "cleanup") {
      const fileName = safeText(body.fileName, 240);
      await deleteFile(fileName, key);
      return Response.json({ status: "deleted" });
    }

    return errorResponse("نوع عملیات مشخص نیست.", 400);
  } catch (error) {
    console.error("[transcripts] failed", {
      action: safeText(body.action, 32) || "unknown",
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      error instanceof Error ? error.message : "ارتباط با Gemini برقرار نشد.",
      502,
    );
  }
}
