import 'dotenv/config';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface TableBackup {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  sha256: string;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
    );

    const tablesResult = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables: Record<string, TableBackup> = {};
    for (const { table_name: tableName } of tablesResult.rows) {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM ${quoteIdentifier(tableName)}`,
      );
      const serializedRows = JSON.stringify(result.rows);
      tables[tableName] = {
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
        sha256: createHash('sha256').update(serializedRows).digest('hex'),
      };
    }

    await client.query('COMMIT');

    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, '-');
    const backupDirectory = path.join(__dirname, '../../backups');
    const filePath = path.join(
      backupDirectory,
      `emse-pre-reestructuracion-${safeTimestamp}.json`,
    );

    fs.mkdirSync(backupDirectory, { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          metadata: {
            timestamp,
            database: 'emse_db',
            schema: 'public',
            tableCount: Object.keys(tables).length,
          },
          tables,
        },
        null,
        2,
      ),
      'utf8',
    );

    const stats = fs.statSync(filePath);
    console.log(`BACKUP_PATH=${filePath}`);
    console.log(`BACKUP_SIZE=${stats.size}`);
    for (const [tableName, table] of Object.entries(tables)) {
      console.log(`${tableName}=${table.rowCount}`);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
