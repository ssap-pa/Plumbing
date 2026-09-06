import { readUpload } from "@/lib/store";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const buf = readUpload(name);
  if (!buf) return new Response("not found", { status: 404 });
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(buf), { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "private, max-age=3600" } });
}
