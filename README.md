# 🔬 Deep Fusion Research

*AI‑powered workflow for turning existing literature into **new, cross‑domain insights**.*

<https://github.com/user-attachments/assets/7be1d37d-8fd6-4ba0-89c3-2fdb4b5ca935>

---


## ✨ What it does

1. **Ingest any paper / URL** – PDFs are parsed with Mistral; web articles with Firecrawl.
2. **Generate a structured research plan** with LangGraph state machines & LLMs.
3. **Realtime SSE stream** shows every reasoning step as the graph executes.
4. **User‑selected Focus items** (notes, key findings, new hypotheses) are merged back into the agent context.
5. **Fusion phase** re‑runs the graph to produce a "next‑step" report – undiscovered angles, converging domains, or follow‑up experiments.

---

## 🚀 Quick start

```bash
pnpm i

cp .env.example .env.local && $EDITOR .env.local

pnpm dev  # ➜ http://localhost:3000
```

<details>
<summary>Minimal prod build</summary>

```bash
pnpm build && pnpm start
```

</details>

### Required env vars

| Key                                      | Used for                              |
| ---------------------------------------- | ------------------------------------- |
| `OPENAI_API_KEY`                         | Chat completions (planning & writing) |
| `LANGSMITH_API_KEY`                      | LangSmith traces (optional)           |
| `LANGSMITH_PROJECT`                      | Project name in LangSmith             |
| `PERPLEXITY_API_KEY` or `TAVILY_API_KEY` | Web search                            |
| `FIRECRAWL_API_KEY`                      | Article scraping                      |
| `MISTRAL_API_KEY`                        | PDF extraction                        |

---

## 🏗️ Tech stack

* **Next.js 14 / React 18** – App router, Server Actions, Tailwind CSS
* **LangGraph + LangChain** – Deterministic state machine orchestration
* **SSE** for live step streaming
* **Zustand** & **shadcn/ui** for UX

---

## 🛣 Roadmap

* [ ] Vector store & RAG for very large corpora
* [ ] Collaborative cursors & comments
* [ ] 1‑click export → Notion / Markdown / PDF

---

## 📄 License

MIT © 2025 Prasanna A P
