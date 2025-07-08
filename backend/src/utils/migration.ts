import { Pool, PoolClient } from 'pg';
import fs from 'fs/promises';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  timestamp: Date;
}

interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
}

export class MigrationManager {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool, migrationsDir: string = path.join(__dirname, '../../database/migrations')) {
    this.pool = pool;
    this.migrationsDir = migrationsDir;
  }

  /**
   * Initialize migration tracking table
   */
  async initializeMigrationTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Migration table initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Load migration files from directory
   */
  async loadMigrations(): Promise<Migration[]> {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure consistent order

      const migrations: Migration[] = [];
      
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Parse migration file (expect -- UP and -- DOWN sections)
        const upMatch = content.match(/-- UP\s*\n([\s\S]*?)(?=-- DOWN|$)/i);
        const downMatch = content.match(/-- DOWN\s*\n([\s\S]*?)$/i);
        
        if (!upMatch) {
          throw new Error(`Migration file ${file} is missing UP section`);
        }

        const migration: Migration = {
          id: file.replace('.sql', ''),
          name: file,
          up: upMatch[1]?.trim() || '',
          down: downMatch?.[1]?.trim() || '',
          timestamp: this.extractTimestampFromFilename(file)
        };

        migrations.push(migration);
      }

      return migrations;
    } catch (error) {
      console.error('Failed to load migrations:', error);
      throw error;
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT id, name, executed_at FROM migrations ORDER BY executed_at');
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = await this.loadMigrations();
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    return allMigrations.filter(migration => !executedIds.has(migration.id));
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.initializeMigrationTable();
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log('All migrations completed successfully');
  }

  /**
   * Run a single migration
   */
  async runMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      console.log(`Running migration: ${migration.name}`);
      
      // Execute the migration
      await client.query(migration.up);
      
      // Record the migration
      await client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      
      await client.query('COMMIT');
      console.log(`✓ Migration ${migration.name} completed`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Migration ${migration.name} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    const executed = await this.getExecutedMigrations();
    if (executed.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = executed[executed.length - 1];
    if (!lastMigration) {
      console.log('No migrations to rollback');
      return;
    }

    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find(m => m.id === lastMigration.id);

    if (!migration) {
      throw new Error(`Migration file not found for ${lastMigration.name}`);
    }

    if (!migration.down) {
      throw new Error(`No rollback script for migration ${migration.name}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      console.log(`Rolling back migration: ${migration.name}`);
      
      // Execute rollback
      await client.query(migration.down);
      
      // Remove migration record
      await client.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
      
      await client.query('COMMIT');
      console.log(`✓ Rollback ${migration.name} completed`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Rollback ${migration.name} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reset database - rollback all migrations
   */
  async reset(): Promise<void> {
    const executed = await this.getExecutedMigrations();
    
    console.log(`Rolling back ${executed.length} migrations...`);
    
    // Rollback in reverse order
    for (let i = executed.length - 1; i >= 0; i--) {
      await this.rollback();
    }
    
    console.log('Database reset completed');
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: MigrationRecord[];
    pending: Migration[];
    total: number;
  }> {
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();
    const total = executed.length + pending.length;

    return { executed, pending, total };
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`;
    const filepath = path.join(this.migrationsDir, filename);

    const template = `-- UP
-- Add your migration SQL here

-- DOWN
-- Add your rollback SQL here
`;

    await fs.writeFile(filepath, template);
    console.log(`Created migration file: ${filename}`);
    return filepath;
  }

  /**
   * Extract timestamp from migration filename
   */
  private extractTimestampFromFilename(filename: string): Date {
    const timestampMatch = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
    if (timestampMatch && timestampMatch[1]) {
      return new Date(timestampMatch[1].replace(/-/g, ':').replace('T', ' '));
    }
    // Fallback to file creation time or current time
    return new Date();
  }
}

export class SeedManager {
  private pool: Pool;
  private seedsDir: string;

  constructor(pool: Pool, seedsDir: string = path.join(__dirname, '../../database/seeds')) {
    this.pool = pool;
    this.seedsDir = seedsDir;
  }

  /**
   * Initialize seed tracking table
   */
  async initializeSeedTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS seeds (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Seed table initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Run all seeds
   */
  async seed(): Promise<void> {
    await this.initializeSeedTable();
    
    try {
      const files = await fs.readdir(this.seedsDir);
      const seedFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      console.log(`Running ${seedFiles.length} seed files...`);

      for (const file of seedFiles) {
        await this.runSeedFile(file);
      }

      console.log('All seeds completed successfully');
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }

  /**
   * Run specific seed file
   */
  async runSeedFile(filename: string): Promise<void> {
    const seedId = filename.replace('.sql', '');
    
    // Check if already executed
    const client = await this.pool.connect();
    try {
      const existing = await client.query('SELECT id FROM seeds WHERE id = $1', [seedId]);
      if (existing.rows.length > 0) {
        console.log(`Seed ${filename} already executed, skipping`);
        return;
      }
    } finally {
      client.release();
    }

    // Execute seed
    const filepath = path.join(this.seedsDir, filename);
    const sql = await fs.readFile(filepath, 'utf-8');

    const executionClient = await this.pool.connect();
    try {
      await executionClient.query('BEGIN');
      
      console.log(`Running seed: ${filename}`);
      await executionClient.query(sql);
      
      // Record the seed execution
      await executionClient.query(
        'INSERT INTO seeds (id, name) VALUES ($1, $2)',
        [seedId, filename]
      );
      
      await executionClient.query('COMMIT');
      console.log(`✓ Seed ${filename} completed`);
    } catch (error) {
      await executionClient.query('ROLLBACK');
      console.error(`✗ Seed ${filename} failed:`, error);
      throw error;
    } finally {
      executionClient.release();
    }
  }

  /**
   * Clear all seed records (for fresh seeding)
   */
  async clearSeedHistory(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM seeds');
      console.log('Seed history cleared');
    } finally {
      client.release();
    }
  }

  /**
   * Force re-run all seeds
   */
  async reseed(): Promise<void> {
    await this.clearSeedHistory();
    await this.seed();
  }
}

// CLI interface for migration management
export class DatabaseCLI {
  private migrationManager: MigrationManager;
  private seedManager: SeedManager;

  constructor(pool: Pool) {
    this.migrationManager = new MigrationManager(pool);
    this.seedManager = new SeedManager(pool);
  }

  async execute(command: string, ...args: string[]): Promise<void> {
    switch (command) {
      case 'migrate':
        await this.migrationManager.migrate();
        break;
      
      case 'rollback':
        await this.migrationManager.rollback();
        break;
      
      case 'reset':
        await this.migrationManager.reset();
        break;
      
      case 'status':
        const status = await this.migrationManager.getStatus();
        console.log(`Migrations: ${status.executed.length} executed, ${status.pending.length} pending`);
        break;
      
      case 'create':
        if (!args[0]) {
          throw new Error('Migration name required');
        }
        await this.migrationManager.createMigration(args[0]);
        break;
      
      case 'seed':
        await this.seedManager.seed();
        break;
      
      case 'reseed':
        await this.seedManager.reseed();
        break;
      
      default:
        console.log(`Available commands:
  migrate    - Run pending migrations
  rollback   - Rollback last migration
  reset      - Rollback all migrations
  status     - Show migration status
  create     - Create new migration
  seed       - Run seeds
  reseed     - Clear and re-run all seeds`);
    }
  }
} 