import { NextFunction, Request, Response } from "express";
import { env } from "@/config/env";
import {
  AssistantCartLine,
  AssistantMessage,
  runAssistant,
} from "@/lib/assistant";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 500;

// Giới hạn đơn giản theo IP để chặn spam gọi AI (tốn tiền) — đủ cho một
// server đơn lẻ, không cần Redis.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

function parseMessages(value: unknown): AssistantMessage[] | null {
  if (!Array.isArray(value)) return null;

  const messages: AssistantMessage[] = [];
  for (const item of value.slice(-MAX_MESSAGES)) {
    if (
      !item ||
      (item.role !== "user" && item.role !== "assistant") ||
      typeof item.content !== "string" ||
      !item.content.trim()
    ) {
      return null;
    }
    messages.push({
      role: item.role,
      content: item.content.slice(0, MAX_CONTENT_LENGTH),
    });
  }

  // Claude yêu cầu hội thoại bắt đầu bằng lượt của user.
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();

  return messages.length > 0 && messages[messages.length - 1].role === "user"
    ? messages
    : null;
}

function parseCart(value: unknown): AssistantCartLine[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 30).flatMap((item) =>
    item && typeof item.title === "string" && Number.isFinite(item.quantity)
      ? [
          {
            title: item.title.slice(0, 100),
            quantity: Number(item.quantity),
            optionsLabel:
              typeof item.optionsLabel === "string"
                ? item.optionsLabel.slice(0, 200)
                : undefined,
          },
        ]
      : [],
  );
}

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.anthropic.apiKey) {
      res.status(503).json({ message: "Trợ lý AI chưa được cấu hình" });
      return;
    }

    if (isRateLimited(req.ip ?? "unknown")) {
      res.status(429).json({ message: "Bạn nhắn nhanh quá, đợi chút nhé" });
      return;
    }

    const messages = parseMessages(req.body?.messages);
    if (!messages) {
      res.status(400).json({ message: "Tin nhắn không hợp lệ" });
      return;
    }

    res.json(await runAssistant(messages, parseCart(req.body?.cart)));
  } catch (err) {
    next(err);
  }
}
