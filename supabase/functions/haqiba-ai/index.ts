// supabase/functions/haqiba-ai/index.ts
// «اسألي الحقيبة»: the quality coordinator's assistant (Supabase Edge Function).
// Deploy:  supabase functions deploy haqiba-ai
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const DOMAIN = Deno.env.get("STAFF_DOMAIN") ?? "bu.edu.sa";
const MODEL = Deno.env.get("AI_MODEL") ?? "claude-sonnet-5-5";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const SYSTEM = `أنت «اسألي الحقيبة»، مساعد منسق الجودة في برنامج أكاديمي بجامعة سعودية يستعد للاعتماد البرامجي من المركز الوطني للتقويم والاعتماد الأكاديمي (هيئة تقويم التعليم والتدريب).
- أجب بالعربية الفصحى المبسطة، باختصار ووضوح، وبخطوات عملية حين يلزم.
- اعتمد أولاً على المقتطفات المرفقة من معايير المركز ووثائقه، وعلى بيانات البرنامج المرفقة (أرقام بلا أسماء). اذكر رقم المحك أو المؤشر أو النموذج حين تستشهد به.
- إن لم تكفِ المقتطفات، قل ذلك صراحة وانصح بمراجعة أحدث أدلة المركز على موقع الهيئة؛ لا تختلق أرقام محكات أو مددا أو نسبا.
- لا تطلب ولا تذكر أسماء الطلاب أو أعضاء هيئة التدريس.`;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email?.toLowerCase().endsWith("@" + DOMAIN)) return j({ error: "غير مصرح" }, 401);
    const { q, kb = [], ctx = {}, hist = [] } = await req.json();
    if (!q || String(q).length > 2000) return j({ error: "سؤال غير صالح" }, 400);
    const user_msg = `سؤال المنسق: ${q}\n\nمقتطفات من معايير المركز ووثائقه:\n${(kb as string[]).slice(0, 10).map((k, i) => (i + 1) + ") " + k).join("\n")}\n\nبيانات البرنامج الآن (JSON):\n${JSON.stringify(ctx).slice(0, 6000)}`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: SYSTEM, messages: [...(hist as unknown[]).slice(-6), { role: "user", content: user_msg }] }),
    });
    const d = await r.json();
    if (!r.ok) return j({ error: d?.error?.message ?? "AI error" }, 502);
    return j({ answer: (d.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n") });
  } catch (e) { return j({ error: String(e) }, 500); }
});
