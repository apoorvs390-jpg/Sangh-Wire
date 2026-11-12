// Netlify wrapper — reuses the same code as Vercel (api/login.js)
import { POST, GET } from "../../api/login.js";
export default (req) => (req.method === "POST" ? POST(req) : GET(req));
