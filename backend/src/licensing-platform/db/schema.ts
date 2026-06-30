// Re-export the hlp_ licensing schema (it lives under db/schema/ but is kept out
// of the main schema barrel to avoid the accounts/licenses const-name clashes).
export * from "../../db/schema/licensing-platform.js";
