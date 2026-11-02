// supabase/functions/haqiba-ai/index.ts
// Copyright 2026 نعيمة سعيد الرشيدي
// @author نعيمة سعيد الرشيدي
// المؤلفة: نعيمة سعيد الرشيدي، وكُتبت الشفرة بمساعدة الذكاء الاصطناعي (AI) بتوجيهها ومراجعتها
// «اسألي الحقيبة»: مساعد منسق الجودة (Supabase Edge Function)
// النشر: supabase functions deploy haqiba-ai
// الإعدادات (Secrets): AI_URL, AI_KEY, AI_MODEL, AI_HEADERS, STAFF_DOMAIN  (القيم في ملف اقرئيني)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const DOMAIN = (Deno.env.get("STAFF_DOMAIN") ?? "your-university.edu.sa").trim().toLowerCase().replace(/^@/, "");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const SYSTEM = `أنت «اسألي الحقيبة»، مساعد منسق الجودة في برنامج أكاديمي بجامعة سعودية يستعد للاعتماد البرامجي من المركز الوطني للتقويم والاعتماد الأكاديمي (هيئة تقويم التعليم والتدريب).
- أجب بالعربية الفصحى المبسطة، باختصار ووضوح، وبخطوات عملية حين يلزم.
- اعتمد أولاً على المقتطفات المرفقة من معايير المركز ووثائقه، وعلى بيانات البرنامج المرفقة (أرقام بلا أسماء). اذكر رقم المحك أو المؤشر أو النموذج حين تستشهد به.
- إن لم تجد الجواب في المقتطفات أو بيانات البرنامج أو معرفتك الموثوقة بأدلة المركز، أو كان السؤال خارج الجودة والاعتماد الأكاديمي، فأجب بهذه الجملة فقط: آسف، ليس لدي جواب لسؤالك.
- لا تختلق أرقام محكات أو مددا أو نسبا، ولا تذكر أسماء الطلاب أو أعضاء هيئة التدريس.`;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email?.toLowerCase().endsWith("@" + DOMAIN)) return j({ error: "غير مصرح" }, 401);
    const { q, kb = [], ctx = {}, hist = [] } = await req.json();
    if (!q || String(q).length > 2000) return j({ error: "سؤال غير صالح" }, 400);
    const msg = `سؤال المنسق: ${q}\n\nمقتطفات من معايير المركز ووثائقه:\n${(Array.isArray(kb) ? kb : []).slice(0, 10).map((k, i) => (i + 1) + ") " + k).join("\n")}\n\nبيانات البرنامج الآن (JSON):\n${JSON.stringify(ctx).slice(0, 6000)}`;
    let extra: Record<string, string> = {};
    try { extra = JSON.parse(Deno.env.get("AI_HEADERS") || "{}"); } catch { return j({ error: "AI_HEADERS ليست JSON صحيحة" }, 500); }
    if (!Deno.env.get("AI_URL") || !Deno.env.get("AI_KEY")) return j({ error: "لم تُضبط AI_URL و AI_KEY في Secrets" }, 500);
    // سجل المحادثة: رسائل صحيحة فقط، تبدأ بسؤال وتتناوب، وإلا رفضها المزوّد
    const H = (Array.isArray(hist) ? hist : []).filter((m: { role?: string; content?: unknown }) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim()).slice(-6).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    while (H.length && H[0].role !== "user") H.shift();
    const clean: { role: string; content: string }[] = [];
    for (const m of H) { if (clean.length && clean[clean.length - 1].role === m.role) clean[clean.length - 1] = m; else clean.push(m); }
    if (clean.length && clean[clean.length - 1].role === "user") clean.pop();
    const r = await fetch(Deno.env.get("AI_URL")!, {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("AI_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json", ...extra },
      body: JSON.stringify({ model: Deno.env.get("AI_MODEL"), max_tokens: 1200, system: SYSTEM, messages: [...clean, { role: "user", content: msg }] }),
    });
    // deno-lint-ignore no-explicit-any
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok) return j({ error: d?.error?.message ?? "AI error" }, 502);
    return j({ answer: (d.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n") });
  } catch (e) { return j({ error: String(e) }, 500); }
});
