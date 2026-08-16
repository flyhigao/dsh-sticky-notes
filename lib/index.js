/**
 * dsh-sticky-notes host entry.
 *
 * Adds a tiny HTTP API used by the browser half to store multiple Markdown
 * notes inside the current DSH workspace:
 *
 *   GET  /dsh-sticky-notes/list?workspaceId=<id>
 *   POST /dsh-sticky-notes/save
 *   POST /dsh-sticky-notes/delete
 *
 * The server never trusts a raw filesystem path from the browser.  It looks
 * the workspace up through the host workspaceRegistry, then only writes under
 * `<workspace.path>/dsh-notes/`.
 */
import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';

export const name = 'dsh-sticky-notes';

const NOTES_DIR = 'dsh-notes';
const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB is plenty for sticky notes.
const ID_RE = /^[A-Za-z0-9_-]+$/;

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin === undefined || host === undefined) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('request body too large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function newNoteId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `note-${Date.now().toString(36)}-${rand}`;
}

function safeNoteId(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new Error('invalid note id');
  }
  return id;
}

function notePath(notesDir, id) {
  return join(notesDir, `${safeNoteId(id)}.md`);
}

function parseNote(id, raw, stat) {
  const text = raw.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  let title = '';
  let content = text;
  if (lines[0]?.startsWith('# ')) {
    title = lines[0].slice(2).trim();
    content = lines.slice(1).join('\n').replace(/^\s*\n/, '');
  } else {
    const first = lines.find((line) => line.trim().length > 0);
    title = first ? first.trim().slice(0, 80) : '未命名便签';
  }
  return {
    id,
    title: title || '未命名便签',
    content,
    createdAt: stat.birthtime instanceof Date && !Number.isNaN(stat.birthtime.getTime())
      ? stat.birthtime.toISOString()
      : stat.ctime.toISOString(),
    updatedAt: stat.mtime.toISOString(),
  };
}

async function listNotes(notesDir) {
  await fs.mkdir(notesDir, { recursive: true });
  const entries = await fs.readdir(notesDir, { withFileTypes: true });
  const notes = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const id = entry.name.slice(0, -3);
    if (!ID_RE.test(id)) continue;
    const filePath = join(notesDir, entry.name);
    try {
      const [raw, stat] = await Promise.all([
        fs.readFile(filePath, 'utf8'),
        fs.stat(filePath),
      ]);
      notes.push(parseNote(id, raw, stat));
    } catch {
      // A note can disappear while listing; skip it rather than failing all notes.
    }
  }
  notes.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return notes;
}

async function saveNote(notesDir, note) {
  const title = typeof note.title === 'string' ? note.title.replace(/\r?\n/g, ' ').trim() : '';
  const content = typeof note.content === 'string' ? note.content : '';
  if (title === '' && content === '') {
    throw new Error('note is empty');
  }
  const id = typeof note.id === 'string' && note.id.length > 0 ? safeNoteId(note.id) : newNoteId();
  const body = `${title ? `# ${title}\n\n` : ''}${content}`;
  const normalized = body.endsWith('\n') ? body : `${body}\n`;
  const filePath = notePath(notesDir, id);
  await fs.mkdir(notesDir, { recursive: true });
  await fs.writeFile(filePath, normalized, 'utf8');
  const stat = await fs.stat(filePath);
  return parseNote(id, normalized, stat);
}

async function deleteNote(notesDir, id) {
  const filePath = notePath(notesDir, id);
  await fs.unlink(filePath);
}

export function apply(ctx, config = {}) {
  ctx.inject(['webServer', 'workspaceRegistry'], (hostCtx) => {
    const host = hostCtx;
    host.effect(() => {
      const disposers = [
        host.webServer.register({
          kind: 'exact',
          path: '/dsh-sticky-notes/list',
          handler: async (request, response) => {
            if (request.method !== 'GET') {
              response.writeHead(405, { allow: 'GET' });
              response.end();
              return;
            }
            try {
              const url = new URL(request.url ?? '/', 'http://localhost');
              const workspaceId = url.searchParams.get('workspaceId');
              const workspace = host.workspaceRegistry.get(workspaceId);
              if (workspace === undefined) {
                sendJson(response, 404, { error: 'workspace-not-found' });
                return;
              }
              const notes = await listNotes(join(workspace.path, NOTES_DIR));
              sendJson(response, 200, { workspaceId, notes });
            } catch (error) {
              sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
            }
          },
        }),

        host.webServer.register({
          kind: 'exact',
          path: '/dsh-sticky-notes/save',
          handler: async (request, response) => {
            if (request.method !== 'POST') {
              response.writeHead(405, { allow: 'POST' });
              response.end();
              return;
            }
            if (!sameOrigin(request)) {
              sendJson(response, 403, { error: 'untrusted origin' });
              return;
            }
            try {
              const body = await readJsonBody(request);
              const workspaceId = body?.workspaceId;
              const workspace = host.workspaceRegistry.get(workspaceId);
              if (workspace === undefined) {
                sendJson(response, 404, { error: 'workspace-not-found' });
                return;
              }
              if (body?.note === null || typeof body?.note !== 'object') {
                sendJson(response, 400, { error: 'note-required' });
                return;
              }
              const note = await saveNote(join(workspace.path, NOTES_DIR), body.note);
              sendJson(response, 200, { note });
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              const status = message === 'invalid note id' || message === 'note is empty' ? 400 : 500;
              sendJson(response, status, { error: message });
            }
          },
        }),

        host.webServer.register({
          kind: 'exact',
          path: '/dsh-sticky-notes/delete',
          handler: async (request, response) => {
            if (request.method !== 'POST') {
              response.writeHead(405, { allow: 'POST' });
              response.end();
              return;
            }
            if (!sameOrigin(request)) {
              sendJson(response, 403, { error: 'untrusted origin' });
              return;
            }
            try {
              const body = await readJsonBody(request);
              const workspaceId = body?.workspaceId;
              const workspace = host.workspaceRegistry.get(workspaceId);
              if (workspace === undefined) {
                sendJson(response, 404, { error: 'workspace-not-found' });
                return;
              }
              await deleteNote(join(workspace.path, NOTES_DIR), body?.id);
              sendJson(response, 200, { ok: true });
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              const status = message === 'invalid note id' ? 400 : message.includes('ENOENT') ? 404 : 500;
              sendJson(response, status, { error: message });
            }
          },
        }),
      ];

      return () => {
        for (const dispose of disposers) dispose();
      };
    }, 'dsh-sticky-notes: http routes');
  });
}
