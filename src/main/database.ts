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

  initTaskParamsTable()
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

export function queryLogByTaskId(taskId: string): LogRow | null {
  if (!db) return null
  try {
    const stmt = db.prepare(
      `SELECT * FROM operation_logs WHERE task_id = @taskId AND operation = 'create' ORDER BY id DESC LIMIT 1`
    )
    return (stmt.get({ taskId }) as LogRow) || null
  } catch {
    return null
  }
}

// --- Task params table ---

export interface TaskParamsEntry {
  task_id: string
  version: string
  prompt: string | null
  ratio: string | null
  duration: number | null
  resolution: string | null
  generate_audio: number
  watermark: number
  model: string | null
  first_frame_path: string | null
  last_frame_path: string | null
  first_frame_data: string | null
  last_frame_data: string | null
  full_params: string | null
}

export interface TaskParamsRow extends TaskParamsEntry {
  id: number
  created_at: string
}

export function initTaskParamsTable(): void {
  if (!db) return
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_params (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL DEFAULT '1.5',
      prompt TEXT,
      ratio TEXT,
      duration INTEGER,
      resolution TEXT,
      generate_audio INTEGER DEFAULT 0,
      watermark INTEGER DEFAULT 0,
      model TEXT,
      first_frame_path TEXT,
      last_frame_path TEXT,
      first_frame_data TEXT,
      last_frame_data TEXT,
      full_params TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_task_params_task_id ON task_params(task_id)')
}

export function insertTaskParams(entry: TaskParamsEntry): void {
  if (!db) return
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO task_params
        (task_id, version, prompt, ratio, duration, resolution, generate_audio, watermark, model, first_frame_path, last_frame_path, first_frame_data, last_frame_data, full_params)
      VALUES
        (@task_id, @version, @prompt, @ratio, @duration, @resolution, @generate_audio, @watermark, @model, @first_frame_path, @last_frame_path, @first_frame_data, @last_frame_data, @full_params)
    `)
    stmt.run(entry)
  } catch (err) {
    console.error('Failed to insert task params:', err)
  }
}

export function getTaskParamsByTaskId(taskId: string): TaskParamsRow | null {
  if (!db) return null
  try {
    const stmt = db.prepare('SELECT * FROM task_params WHERE task_id = @taskId')
    return (stmt.get({ taskId }) as TaskParamsRow) || null
  } catch {
    return null
  }
}
