// Vercel: runs before every page/file/API request and asks for the password
import { gate } from "./lib/auth.js";

export default async function middleware(request) {
  const blocked = await gate(request);
  if (blocked) return blocked;
  // let the request continue normally
  return new Response(null, { headers: { "x-middleware-next": "1" } });
}
