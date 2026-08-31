"use client";

import { useState, useTransition, type FormEvent } from "react";
import { askAssistant } from "./actions";

type Message = {
  role: "user" | "bot";
  text: string;
  source?: string;
};

const INITIAL_MESSAGE: Message = {
  role: "bot",
  text:
    "Fala! Sou o assistente da obra — nesta versão respondo algumas " +
    "consultas com dado real do sistema (é um mock, sem IA de verdade). " +
    "Pergunta sobre o status de um ativo, quais estão prontos pro L4, " +
    "documentos anexados ou certificados vencendo.",
};

export function AssistantChat({ exampleTag }: { exampleTag: string | null }) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  const suggestions = exampleTag
    ? [
        `Status da ${exampleTag}?`,
        "Quais ativos estão prontos pro L4?",
        `Documentos do ${exampleTag}`,
        "Certificados vencendo esse mês",
      ]
    : ["Quais ativos estão prontos pro L4?", "Certificados vencendo esse mês"];

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    startTransition(async () => {
      const reply = await askAssistant(trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: reply.text, source: reply.source },
      ]);
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div
        data-testid="assistant-messages"
        className="flex max-h-[420px] flex-col gap-2 overflow-y-auto"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            data-role={m.role}
            className={`whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto max-w-[80%] bg-zinc-900 text-white"
                : "max-w-[85%] bg-zinc-50 text-zinc-800"
            }`}
          >
            {m.text}
            {m.source && (
              <div className="mt-1 font-mono text-[10px] text-zinc-400">
                {m.source}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="max-w-[85%] rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
            digitando…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Pergunta pro assistente"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: qual o status da UPS-2.1?"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:border-amber-300"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
