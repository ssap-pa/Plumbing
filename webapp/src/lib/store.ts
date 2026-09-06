import fs from "node:fs";
import path from "node:path";
import type { Database, Site } from "./types";

// 단일 운영자용 JSON 파일 저장소. DATA_DIR 환경변수로 위치를 바꿀 수 있다.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function readDb(): Database {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) return { sites: [] };
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const db = JSON.parse(raw) as Database;
    if (!Array.isArray(db.sites)) return { sites: [] };
    return db;
  } catch {
    return { sites: [] };
  }
}

export function writeDb(db: Database) {
  ensureDirs();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

export function listSites(): Site[] {
  return readDb().sites.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getSite(id: string): Site | undefined {
  return readDb().sites.find((s) => s.id === id);
}

export function saveSite(site: Site): Site {
  const db = readDb();
  const idx = db.sites.findIndex((s) => s.id === site.id);
  site.updatedAt = new Date().toISOString();
  if (idx >= 0) db.sites[idx] = site;
  else db.sites.push(site);
  writeDb(db);
  return site;
}

export function deleteSite(id: string): boolean {
  const db = readDb();
  const before = db.sites.length;
  db.sites = db.sites.filter((s) => s.id !== id);
  writeDb(db);
  return db.sites.length < before;
}

export function saveUpload(originalName: string, buf: Buffer): string {
  ensureDirs();
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return name;
}

export function readUpload(name: string): Buffer | null {
  const safe = path.basename(name);
  const p = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}
