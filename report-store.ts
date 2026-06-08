import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface FieldReport {
  id: string;
  createdAt: string;
  query: string;
  track: "local" | "provider";
  summary: string;
  sourceIds: string[];
  aiGenerated: true;
  requiresHumanReview: true;
}

export interface ReportStore {
  readonly mode: "sqlite-wal" | "json-atomic";
  save(report: FieldReport): Promise<FieldReport>;
  latest(): Promise<FieldReport | undefined>;
  close(): Promise<void>;
}

function ensureDirectory(path: string): void {
  mkdirSync(path, { recursive: true });
}

function atomicWriteJson(path: string, value: unknown): void {
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(value, null, 2));
  renameSync(temporaryPath, path);
}

class JsonReportStore implements ReportStore {
  readonly mode = "json-atomic" as const;
  private readonly filePath: string;

  constructor(directory: string) {
    ensureDirectory(directory);
    this.filePath = join(directory, "field-reports.json");
  }

  async save(report: FieldReport): Promise<FieldReport> {
    const reports = this.readReports();
    reports.push(report);
    atomicWriteJson(this.filePath, reports);
    return report;
  }

  async latest(): Promise<FieldReport | undefined> {
    const reports = this.readReports();
    return reports.at(-1);
  }

  async close(): Promise<void> {
    return undefined;
  }

  private readReports(): FieldReport[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as FieldReport[]) : [];
  }
}

class SqliteReportStore implements ReportStore {
  readonly mode = "sqlite-wal" as const;
  private readonly database: {
    exec: (sql: string) => unknown;
    prepare: (sql: string) => {
      run: (...values: unknown[]) => unknown;
      get: (...values: unknown[]) => unknown;
    };
    close: () => unknown;
  };

  constructor(database: SqliteReportStore["database"]) {
    this.database = database;
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS field_reports (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        query TEXT NOT NULL,
        track TEXT NOT NULL,
        summary TEXT NOT NULL,
        source_ids_json TEXT NOT NULL,
        ai_generated INTEGER NOT NULL,
        requires_human_review INTEGER NOT NULL
      );
    `);
  }

  async save(report: FieldReport): Promise<FieldReport> {
    this.database
      .prepare(
        `INSERT OR REPLACE INTO field_reports
        (id, created_at, query, track, summary, source_ids_json, ai_generated, requires_human_review)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
      )
      .run(
        report.id,
        report.createdAt,
        report.query,
        report.track,
        report.summary,
        JSON.stringify(report.sourceIds),
        1,
        1
      );

    return report;
  }

  async latest(): Promise<FieldReport | undefined> {
    const row = this.database
      .prepare("SELECT * FROM field_reports ORDER BY created_at DESC LIMIT 1;")
      .get() as
      | {
          id: string;
          created_at: string;
          query: string;
          track: "local" | "provider";
          summary: string;
          source_ids_json: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      query: row.query,
      track: row.track,
      summary: row.summary,
      sourceIds: JSON.parse(row.source_ids_json) as string[],
      aiGenerated: true,
      requiresHumanReview: true
    };
  }

  async close(): Promise<void> {
    this.database.close();
  }
}

export async function createReportStore(directory = ".sfc/reports"): Promise<ReportStore> {
  const resolvedDirectory = resolve(directory);
  ensureDirectory(resolvedDirectory);

  if (process.env.SFC_REPORT_STORE_FORCE_JSON === "1") {
    return new JsonReportStore(resolvedDirectory);
  }

  try {
    const sqliteModuleName = "node:sqlite";
    const sqlite = (await import(sqliteModuleName)) as unknown as {
      DatabaseSync: new (path: string) => SqliteReportStore["database"];
    };
    const databasePath = join(resolvedDirectory, "field-reports.sqlite");
    return new SqliteReportStore(new sqlite.DatabaseSync(databasePath));
  } catch {
    return new JsonReportStore(resolvedDirectory);
  }
}

export function buildReportId(createdAt = new Date().toISOString()): string {
  const safeTimestamp = createdAt.replace(/[^0-9a-z]/gi, "");
  return `field-report-${safeTimestamp}`;
}

export function reportDirectoryFromEnv(): string {
  const configured = process.env.SFC_REPORT_DIR || ".sfc/reports";
  return resolve(dirname(resolve(".env.local")), configured);
}
