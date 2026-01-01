/// <reference types="@cloudflare/workers-types" />
export interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;

  AI_GATEWAY_ID: string;
  INGEST_TOKEN: string;
  DEFAULT_TENANT: string;
  TOP_K: string;
  MAX_CONTEXT_CHARS: string;
}

type IngestDoc = {
  id?: string;
  text: string;
  source?: string;
  tenant?: string;
  tags?: string[];
};

type ChatRequest = {
  question: string;
  tenant?: string;
  topK?: number;
};

const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5";
const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function cors(resp: Response) {
  const h = new Headers(resp.headers);
  h.set("access-control-allow-origin", "*");
  h.set("access-control-allow-methods", "GET,POST,OPTIONS");
  h.set("access-control-allow-headers", "content-type,authorization");
  return new Response(resp.body, { status: resp.status, headers: h });
}

function chunkText(text: string, maxChars = 1400): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  const paras = cleaned.split(/\n{2,}/g);
  const chunks: string[] = [];
  let buf = "";

  for (const p of paras) {
    const para = p.trim();
    if (!para) continue;

    if ((buf + "\n\n" + para).length <= maxChars) {
      buf = buf ? buf + "\n\n" + para : para;
    } else {
      if (buf) chunks.push(buf);
      if (para.length <= maxChars) {
        buf = para;
      } else {
        // hard split long paragraphs
        for (let i = 0; i < para.length; i += maxChars) {
          chunks.push(para.slice(i, i + maxChars));
        }
        buf = "";
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

async function embed(env: Env, texts: string[]) {
  // Workers AI embeddings input format: { text: string | string[] }
  // We'll route through AI Gateway for observability.
  const out = await env.AI.run(
    EMBED_MODEL,
    { text: texts, pooling: "cls" },
    { gateway: { id: env.AI_GATEWAY_ID } }
  ) as { data: number[][] };

  if (!out?.data?.length) throw new Error("Embedding failed: no data returned");
  return out.data;
}

function requireBearer(request: Request, expectedToken: string) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m || m[1] !== expectedToken) {
    return cors(
      json({ error: "Unauthorized" }, { status: 401 })
    );
  }
  return null;
}

function renderHome() {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>EdgeRAG Helpdesk</title>
  <style>
    :root{
      --bg:#0b1020;
      --card:#111a33;
      --muted:#9aa4bf;
      --text:#eaf0ff;
      --line:rgba(255,255,255,.10);
      --brand:#7c5cff;
      --brand2:#25d7ff;
      --good:#3ddc97;
      --warn:#ffcc66;
      --bad:#ff5c7a;
      --shadow:0 20px 60px rgba(0,0,0,.35);
      --radius:16px;
    }
    @media (prefers-color-scheme: light){
      :root{
        --bg:#f6f7fb;
        --card:#ffffff;
        --muted:#5b647a;
        --text:#0d1326;
        --line:rgba(10,18,38,.10);
        --shadow:0 20px 50px rgba(16,24,40,.12);
      }
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      background:
        radial-gradient(1200px 600px at 20% -10%, rgba(124,92,255,.25), transparent 60%),
        radial-gradient(900px 500px at 90% 0%, rgba(37,215,255,.18), transparent 55%),
        var(--bg);
      color:var(--text);
    }
    .wrap{max-width:1100px;margin:0 auto;padding:28px 18px 50px}
    .topbar{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
    .brand{display:flex;align-items:center;gap:12px}
    .logo{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,var(--brand),var(--brand2));box-shadow:var(--shadow)}
    h1{font-size:24px;margin:0}
    .sub{color:var(--muted);margin:3px 0 0;font-size:14px}
    .pill{font-size:12px;color:var(--muted);border:1px solid var(--line);padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.04)}
    .grid{display:grid;grid-template-columns:1fr;gap:14px}
    @media(min-width:960px){.grid{grid-template-columns:420px 1fr;align-items:start}}
    .card{
      background: rgba(255,255,255,.04);
      border:1px solid var(--line);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      overflow:hidden;
    }
    .card-h{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px}
    .card-b{padding:14px 16px}
    .label{font-size:12px;color:var(--muted);margin:0 0 6px}
    input,textarea{
      width:100%;
      border-radius:12px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.06);
      color:var(--text);
      padding:12px 12px;
      outline:none;
      font-size:14px;
    }
    textarea{min-height:140px;resize:vertical;line-height:1.35}
    input::placeholder,textarea::placeholder{color:rgba(154,164,191,.85)}
    .row{display:grid;grid-template-columns:1fr;gap:10px}
    @media(min-width:540px){.row{grid-template-columns:1fr 1fr}}
    .rangeRow{display:flex;align-items:center;gap:10px}
    input[type="range"]{padding:0;height:32px;background:transparent;border:none}
    .kbadge{min-width:44px;text-align:center;font-size:12px;border:1px solid var(--line);border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.06)}
    .btnRow{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    button{
      border:1px solid var(--line);
      background:rgba(255,255,255,.06);
      color:var(--text);
      border-radius:12px;
      padding:10px 12px;
      cursor:pointer;
      font-size:14px;
      transition:transform .05s ease, background .2s ease;
    }
    button:hover{background:rgba(255,255,255,.10)}
    button:active{transform:translateY(1px)}
    .primary{border:none;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#071021;font-weight:800}
    .ghost{background:transparent}
    .muted{color:var(--muted)}
    .tiny{font-size:12px}
    .examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .ex{font-size:12px;padding:8px 10px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.05)}
    .status{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px}
    .dot{width:8px;height:8px;border-radius:999px;background:var(--muted);opacity:.85}
    .dot.live{background:var(--good)}
    .dot.wait{background:var(--warn)}
    .dot.bad{background:var(--bad)}
    .answer{line-height:1.55;font-size:14px}
    .answer b{font-weight:800}
    .answer ul{margin:8px 0 12px 18px}
    .answer li{margin:5px 0}
    .answer .secTitle{margin:14px 0 8px;font-weight:900;font-size:13px;letter-spacing:.2px}
    .srcCard{border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin:10px 0;background:rgba(255,255,255,.04)}
    .srcTop{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .badge{display:inline-block;font-size:12px;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.06)}
    .srcText{white-space:pre-wrap;margin-top:8px;color:rgba(234,240,255,.90);font-size:13px}
    pre{background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:12px;padding:12px;overflow:auto}
    details{border-top:1px solid var(--line);margin-top:12px;padding-top:12px}
    summary{cursor:pointer;color:var(--muted);font-size:13px}
    .err{color:var(--bad);white-space:pre-wrap;font-size:13px;margin-top:10px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div class="brand">
        <div class="logo"></div>
        <div>
          <h1>EdgeRAG Helpdesk</h1>
          <div class="sub">Edge-deployed RAG for SRE runbooks (Cloudflare Workers AI + Vectorize + AI Gateway)</div>
        </div>
      </div>
      <div class="pill">Tip: Press <b>Ctrl + Enter</b> to ask</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-h">
          <div>
            <div style="font-weight:900;">Ask a question</div>
            <div class="tiny muted">Tune retrieval + scope with tenant and topK.</div>
          </div>
          <div class="status">
            <span class="dot" id="dot"></span>
            <span id="statusText">Idle</span>
          </div>
        </div>
        <div class="card-b">
          <div class="row">
            <div>
              <div class="label">Tenant</div>
              <input id="tenant" placeholder="public (or demo-sre)" />
              <div class="tiny muted" style="margin-top:6px;">Use <b>demo-sre</b> to query the runbook pack.</div>
            </div>

            <div>
              <div class="label">topK</div>
              <div class="rangeRow">
                <input id="topk" type="range" min="1" max="12" value="6" />
                <div class="kbadge" id="kbadge">6</div>
              </div>
              <div class="tiny muted" style="margin-top:6px;">Higher = more context, higher cost. Default 6 is good.</div>
            </div>
          </div>

          <div style="margin-top:12px;">
            <div class="label">Question</div>
            <textarea id="q" placeholder="Example: 5xx rate is above 1%. Give a step-by-step triage and safest mitigation."></textarea>
          </div>

          <div class="btnRow" style="margin-top:12px;">
            <button class="primary" id="ask">Ask</button>
            <button class="ghost" id="copy" disabled>Copy answer</button>
            <button class="ghost" id="toggleRaw">Show raw JSON</button>
            <span class="tiny muted" id="latency"></span>
          </div>

          <div class="examples">
            <button class="ex" data-ex="lat">p95 checkout latency &gt; 250ms</button>
            <button class="ex" data-ex="5xx">5xx error rate &gt; 1%</button>
            <button class="ex" data-ex="comms">Write a SEV2 status update</button>
            <button class="ex" data-ex="sec">How to handle ingest token</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h">
          <div style="font-weight:900;">Response</div>
          <div class="tiny muted">Grounded in retrieved sources</div>
        </div>
        <div class="card-b">
          <div id="answer" class="answer muted">Ask a question to see results.</div>

          <details id="sourcesWrap">
            <summary>Sources</summary>
            <div id="sources"></div>
          </details>

          <details id="rawWrap" style="display:none;">
            <summary>Raw JSON</summary>
            <pre id="raw"></pre>
          </details>

          <div id="err" class="err"></div>
        </div>
      </div>
    </div>
  </div>

<script>
(function(){
  const $ = (id) => document.getElementById(id);

  function esc(v){
    return (v ?? "").toString()
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function setStatus(kind, text){
    const dot = $("dot");
    dot.className = "dot" + (kind ? (" " + kind) : "");
    $("statusText").textContent = text;
  }

  function mdToHtml(input){
    let s = esc(input || "");
    // bold **x**
    s = s.replace(/\\*\\*(.+?)\\*\\*/g, "<b>$1</b>");

    // bullets: lines starting with "- "
    const lines = s.split("\\n");
    let out = "";
    let inList = false;
    for (const line of lines){
      const m = line.match(/^\\s*-\\s+(.*)$/);
      if (m){
        if (!inList){ out += "<ul>"; inList = true; }
        out += "<li>" + m[1] + "</li>";
      } else {
        if (inList){ out += "</ul>"; inList = false; }
        out += line ? (line + "<br/>") : "<br/>";
      }
    }
    if (inList) out += "</ul>";
    return out;
  }

  function renderStructured(st){
    if (!st || typeof st !== "object") return "";
    const summary = st.summary ? "<div class='secTitle'>Summary</div><div>" + mdToHtml(String(st.summary)) + "</div>" : "";
    const arr = (title, items) => {
      if (!Array.isArray(items) || !items.length) return "";
      let h = "<div class='secTitle'>" + esc(title) + "</div><ul>";
      for (const it of items) h += "<li>" + mdToHtml(String(it)).replaceAll("<br/>","") + "</li>";
      h += "</ul>";
      return h;
    };
    const cits = Array.isArray(st.citations) && st.citations.length
      ? "<div class='secTitle'>Citations</div><div class='muted tiny'>" + esc(st.citations.join(", ")) + "</div>"
      : "";
    return summary + arr("Triage", st.triage) + arr("Mitigations", st.mitigations) + arr("Don't do", st.dont) + cits;
  }

  $("topk").addEventListener("input", () => $("kbadge").textContent = $("topk").value);

  document.querySelectorAll("[data-ex]").forEach(btn => {
    btn.addEventListener("click", () => {
      $("tenant").value = ($("tenant").value.trim() || "demo-sre");
      const ex = btn.getAttribute("data-ex");
      const map = {
        lat: "We have p95 checkout latency > 250ms. What are the first 3 things to check and the safest mitigation?",
        "5xx": "5xx rate is above 1%. Give a step-by-step triage and what NOT to do.",
        comms: "Write a SEV2 status update using the incident comms template for checkout latency in us-east.",
        sec: "How should we handle the ingestion token securely? Include rotation guidance."
      };
      $("q").value = map[ex] || "";
      $("q").focus();
    });
  });

  let showRaw = false;
  $("toggleRaw").addEventListener("click", () => {
    showRaw = !showRaw;
    $("rawWrap").style.display = showRaw ? "block" : "none";
    $("toggleRaw").textContent = showRaw ? "Hide raw JSON" : "Show raw JSON";
  });

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(_){
      // fallback
      try{
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      }catch(e){
        return false;
      }
    }
  }

  async function ask(){
    $("err").textContent = "";
    $("sources").innerHTML = "";
    $("sourcesWrap").open = false;
    $("answer").classList.remove("muted");
    $("answer").innerHTML = "<span class='muted'>Thinking...</span>";
    $("copy").disabled = true;

    setStatus("wait", "Calling /api/chat...");
    $("latency").textContent = "";

    const question = $("q").value.trim();
    const tenant = ($("tenant").value.trim() || "public");
    const topK = Number($("topk").value || 6);

    if (!question){
      setStatus("bad", "Error");
      $("answer").innerHTML = "<b>Error</b>";
      $("err").textContent = "Please enter a question.";
      return;
    }

    const t0 = performance.now();
    try{
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({ question, tenant, topK })
      });

      const data = await resp.json();
      $("raw").textContent = JSON.stringify(data, null, 2);

      $("latency").textContent = Math.round(performance.now() - t0) + " ms";

      if (!resp.ok){
        setStatus("bad", "Error");
        $("answer").innerHTML = "<b>Error</b>";
        $("err").textContent = data && data.error ? String(data.error) : "Request failed";
        return;
      }

      setStatus("live", "OK");

      const structuredHtml = renderStructured(data.structured);
      if (structuredHtml){
        $("answer").innerHTML = structuredHtml;
      } else {
        $("answer").innerHTML = mdToHtml(data.answer || "(no answer)");
      }

      // Copy
      $("copy").disabled = false;
      $("copy").onclick = async () => {
        const ok = await copyText(String((data.structured && data.structured.summary) ? data.structured.summary : (data.answer || "")));
        $("copy").textContent = ok ? "Copied!" : "Copy failed";
        setTimeout(()=> $("copy").textContent = "Copy answer", 900);
      };

      // Sources
      const used = Array.isArray(data.usedSources) ? data.usedSources : [];
      if (used.length){
        $("sourcesWrap").open = true;
        for (const s of used){
          const div = document.createElement("div");
          div.className = "srcCard";
          div.innerHTML =
            "<div class='srcTop'>" +
              "<div style='display:flex;gap:8px;flex-wrap:wrap;align-items:center;'>" +
                "<span class='badge'><b>" + esc(s.ref || "S?") + "</b></span>" +
                "<span class='badge'>" + esc(s.source || "unknown") + "</span>" +
                "<span class='badge'>chunk " + esc(s.chunk) + "</span>" +
              "</div>" +
              "<div class='tiny muted'>score " + esc((s.score ?? "").toString()) + "</div>" +
            "</div>" +
            (s.text ? "<div class='srcText'>" + esc(s.text) + "</div>" : "");
          $("sources").appendChild(div);
        }
      } else {
        $("sources").innerHTML = "<div class='tiny muted'>No sources returned.</div>";
      }
    }catch(e){
      setStatus("bad", "Error");
      $("answer").innerHTML = "<b>Error</b>";
      $("err").textContent = String(e);
    }
  }

  $("ask").addEventListener("click", ask);
  $("q").addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") ask();
  });

  window.addEventListener("error", (ev) => {
    // If your script was dying before, you'll see it now in the UI too
    $("err").textContent = "UI error: " + (ev.message || "unknown error");
    setStatus("bad", "UI error");
  });

  setStatus("", "Idle");
})();
</script>
</body>
</html>`;
 return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (request.method === "OPTIONS") {
        return cors(new Response("", { status: 204 }));
      }

      if (path === "/") return cors(renderHome());

      if (path === "/api/health") {
        return cors(json({
          ok: true,
          gateway: env.AI_GATEWAY_ID,
          embedModel: EMBED_MODEL,
          chatModel: CHAT_MODEL
        }));
      }

      if (path === "/api/ingest" && request.method === "POST") {
        const authFail = requireBearer(request, env.INGEST_TOKEN);
        if (authFail) return authFail;

        const body = await request.json() as { documents: IngestDoc[] };
        const docs = body?.documents || [];
        if (!docs.length) return cors(json({ error: "No documents" }, { status: 400 }));

        const vectors: VectorizeVector[] = [];
        let totalChunks = 0;

        for (const d of docs) {
          const tenant = (d.tenant || env.DEFAULT_TENANT).trim();
          const source = (d.source || "manual").trim();
          const tags = d.tags || [];
          const baseId = d.id || crypto.randomUUID();

          const chunks = chunkText(d.text, 1400);
          totalChunks += chunks.length;
          const embeddings = await embed(env, chunks);

          for (let i = 0; i < chunks.length; i++) {
            vectors.push({
              id: `${baseId}:${i}`,
              values: embeddings[i],
              metadata: {
                tenant,
                source,
                tags,
                chunk: i,
                text: chunks[i]
              }
            });
          }
        }

        const res = await env.VECTORIZE.upsert(vectors);
        return cors(json({
          ok: true,
          totalDocs: docs.length,
          totalChunks,
          mutation: res,
          aiGatewayLogId: env.AI.aiGatewayLogId ?? null
        }));
      }

      if (path === "/api/chat" && request.method === "POST") {
        const body = await request.json() as ChatRequest;
        const question = (body?.question || "").trim();
        if (!question) return cors(json({ error: "Missing question" }, { status: 400 }));

        const tenant = (body.tenant || env.DEFAULT_TENANT).trim();
        const topK = Math.min(Math.max(body.topK || Number(env.TOP_K || "6"), 1), 20);
        const maxContextChars = Math.max(Number(env.MAX_CONTEXT_CHARS || "8000"), 1000);

        // 1) Embed question
        const [qVec] = await embed(env, [question]);

        // 2) Retrieve from Vectorize (filter by tenant)
        const matches = await env.VECTORIZE.query(qVec, {
          topK,
          returnMetadata: "all",
          filter: { tenant }
        });

        const sources = (matches.matches || []).map((m: any, idx: number) => ({
          rank: idx + 1,
          id: m.id,
          score: m.score,
          tenant: m.metadata?.tenant,
          source: m.metadata?.source,
          chunk: m.metadata?.chunk,
          text: m.metadata?.text
        }));

        // Build context with lightweight citations
        let ctx = "";
        const picked: any[] = [];
        for (const s of sources) {
          if (!s.text) continue;
          const block = `[S${s.rank}] (${s.source}, chunk ${s.chunk})\n${s.text}\n`;
          if ((ctx + "\n" + block).length > maxContextChars) break;
          ctx += "\n" + block;
          picked.push(s);
        }

const system = [
  "You are an SRE/Incident Response copilot.",
  "You MUST answer using ONLY the provided Sources.",
  "",
  "Output MUST be valid JSON only (no markdown, no extra text).",
  "Schema:",
  "{",
  '  "summary": string,',
  '  "triage": string[],',
  '  "mitigations": string[],',
  '  "dont": string[],',
  '  "citations": string[]  // like ["S1","S2"]',
  "}",
  "",
  "Rules:",
  "- If Sources are insufficient, set summary to 'Not enough information in the provided sources.'",
  "- Keep arrays short and actionable (3-6 items).",
  "- citations must reference the Sources you used."
].join("\n");


        const response = await env.AI.run(
  CHAT_MODEL,
  {
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Question: ${question}\n\nSources:\n${ctx}\n\nReturn JSON:` }
    ]
  },
  { gateway: { id: env.AI_GATEWAY_ID } }
) as any;


const raw = (response?.response ?? response)?.toString?.() ?? String(response);

let structured: any = null;
try {
  structured = JSON.parse(raw);
} catch {
  structured = null;
}



        return cors(json({
  answer: structured?.summary ?? raw,
  structured,
  tenant,
  usedSources: picked.map((s) => ({
    ref: `S${s.rank}`,
    source: s.source,
    chunk: s.chunk,
    id: s.id,
    score: s.score,
    text: (s.text || "").slice(0, 600)
  })),
  aiGatewayLogId: env.AI.aiGatewayLogId ?? null
}));
      }

      return cors(json({ error: "Not found" }, { status: 404 }));
    } catch (err: any) {
      return cors(json({ error: err?.message || String(err) }, { status: 500 }));
    }
  },
} satisfies ExportedHandler<Env>;
