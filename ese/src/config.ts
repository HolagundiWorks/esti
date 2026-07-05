/** ESE runtime config. The default kbteam admin credential is declared here at
 *  deploy time (env) and seeded on first run — same first-run pattern as the
 *  AORMS Community admin. Ollama is local (no document leaves the host). */
export const config = {
  port: Number(process.env.ESE_PORT ?? 4100),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://esti:esti@localhost:5432/ese",

  /** Default admin, declared at deploy; forced to rotate on first login. */
  adminUser: process.env.ESE_ADMIN_USER ?? "kbadmin",
  adminPassword: process.env.ESE_ADMIN_PASSWORD ?? "",

  /** Local LLM for structuring/reading/analysis — never a cloud provider. */
  ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1",

  /** Where uploaded source PDFs/markdown are stored (fs path). */
  storageDir: process.env.ESE_STORAGE_DIR ?? "./.ese-files",
} as const;
