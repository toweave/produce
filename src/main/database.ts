import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database | null = null

export interface LogEntry {
  version: string
  task_id: string | null
  operation: string
  model: string
  prompt: string | null
  status: string | null
  image_count: number
  video_count: number
  audio_count: number
  params: string | null
  result: string | null
  error: string | null
}

export interface LogRow extends LogEntry {
  id: number
  created_at: string
}

export interface LogQueryOptions {
  version: string
  operation?: string
  page: number
  pageSize: number
}

export interface LogQueryResult {
  items: LogRow[]
  total: number
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'seedance-logs.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      task_id TEXT,
      operation TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT,
      status TEXT,
      image_count INTEGER DEFAULT 0,
      video_count INTEGER DEFAULT 0,
      audio_count INTEGER DEFAULT 0,
      params TEXT,
      result TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_logs_version ON operation_logs(version)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON operation_logs(created_at)')
}

export function insertLog(entry: LogEntry): void {
  if (!db) return
  try {
    const stmt = db.prepare(`
      INSERT INTO operation_logs
        (version, task_id, operation, model, prompt, status, image_count, video_count, audio_count, params, result, error)
      VALUES
        (@version, @task_id, @operation, @model, @prompt, @status, @image_count, @video_count, @audio_count, @params, @result, @error)
    `)
    stmt.run(entry)
  } catch (err) {
    console.error('Failed to write operation log:', err)
  }
}

export function queryLogs(options: LogQueryOptions): LogQueryResult {
  if (!db) return { items: [], total: 0 }

  const conditions: string[] = ['version = @version']
  const params: Record<string, unknown> = { version: options.version }

  if (options.operation) {
    conditions.push('operation = @operation')
    params.operation = options.operation
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (options.page - 1) * options.pageSize

  const countStmt = db.prepare(`SELECT COUNT(*) as cnt FROM operation_logs ${where}`)
  const { cnt: total } = countStmt.get(params) as { cnt: number }

  const dataStmt = db.prepare(
    `SELECT * FROM operation_logs ${where} ORDER BY id DESC LIMIT @limit OFFSET @offset`
  )
  const items = dataStmt.all({ ...params, limit: options.pageSize, offset }) as LogRow[]

  return { items, total }
}
