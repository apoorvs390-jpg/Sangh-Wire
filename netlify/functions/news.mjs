// Netlify wrapper — reuses the same code as Vercel (api/news.js)
import { GET } from "../../api/news.js";
export default (req) => GET(req);
