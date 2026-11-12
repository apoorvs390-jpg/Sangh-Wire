// Sangh Wire — login (POST /api/login). Checks the password and sets a 30-day session cookie.
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import { checkPassword, makeSessionCookie, safeNext } from "../lib/auth.js";

async function handler(req) {
  let password = "", next = "/";
  try {
    const type = req.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      const b = await req.json(); password = b.password; next = b.next;
    } else {
      const f = new URLSearchParams(await req.text()); password = f.get("password"); next = f.get("next");
    }
  } catch { /* bad body → treated as wrong password */ }
  next = safeNext(next);

  if (await checkPassword(password)) {
    return new Response(null, { status: 303, headers: { Location: next, "Set-Cookie": await makeSessionCookie(req), "Cache-Control": "no-store" } });
  }
  await new Promise((r) => setTimeout(r, 800)); // slow down password guessing
  return new Response(null, { status: 303, headers: { Location: `/login?err=1&next=${encodeURIComponent(next)}`, "Cache-Control": "no-store" } });
}

export function POST(request) { return handler(request); }
export function GET() { return new Response(null, { status: 303, headers: { Location: "/" } }); }
