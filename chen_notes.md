## model config
src/lib/ai.ts — line 22 sets AI_MODEL = "gemini-2.5-flash-preview-05-20" and line 23 sets MAX_TOKENS = 2048. The client itself (API key wiring + lazy singleton) is in the same file.
-- changed to "gemini-2.5-flash"
Per-call generation params (temperature, response format) live in src/lib/exercises/generate.ts:73-81.
## max_tokens too limited? does max_tokens mean each time or in total? for example if a single user takes multiple free exercise, or multiple uses use  at the same time?