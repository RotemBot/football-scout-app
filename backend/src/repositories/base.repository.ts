import { Pool, QueryResult } from 'pg';
import { BaseModel } from '../models';

export abstract class BaseRepository<T extends BaseModel> {
  protected pool: Pool;
  protected tableName: string;

  constructor(pool: Pool, tableName: string) {
    this.pool = pool;
    this.tableName = tableName;
  }

  // Execute a query with parameters
  protected async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { text, duration, rows: result.rowCount || 0 });
      return result;
    } catch (error) {
      console.error('Query error', { text, params, error });
      throw error;
    }
  }

  // Find by ID
  async findById(id: string): Promise<T | null> {
    const result = await this.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] ? this.transformFromDb(result.rows[0]) : null;
  }

  // Find all records
  async findAll(): Promise<T[]> {
    const result = await this.query(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC`);
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Find with pagination
  async findWithPagination(limit: number = 10, offset: number = 0): Promise<T[]> {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Count all records
  async count(): Promise<number> {
    const result = await this.query(`SELECT COUNT(*) FROM ${this.tableName}`);
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  // Delete by ID
  async deleteById(id: string): Promise<boolean> {
    const result = await this.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    return (result.rowCount || 0) > 0;
  }

  // Check if record exists
  async exists(id: string): Promise<boolean> {
    const result = await this.query(
      `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1)`,
      [id]
    );
    return result.rows[0]?.exists || false;
  }

  // Abstract methods that must be implemented by subclasses
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T | null>;
  abstract transformFromDb(dbRow: any): T;
  abstract transformToDb(model: Partial<T>): any;
} 