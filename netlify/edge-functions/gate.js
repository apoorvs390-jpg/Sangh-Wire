// Netlify: runs before every page/file request and asks for the password (same code as Vercel middleware.js)
import { gate } from "../../lib/auth.js";

export default async (request, context) => (await gate(request)) || context.next();

export const config = { path: "/*" };
