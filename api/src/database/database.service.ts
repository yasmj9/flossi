import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private isConnected = false;

  async onModuleInit() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      try {
        this.pool = new Pool({
          connectionString,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        });
        await this.pool.query('SELECT NOW()');
        this.isConnected = true;
        this.logger.log('Successfully connected to PostgreSQL database.');
      } catch (error) {
        this.logger.warn(`Failed to connect to PostgreSQL. Falling back to memory storage. Error: ${error.message}`);
        this.isConnected = false;
      }
    } else {
      this.logger.log('No DATABASE_URL provided. Running with in-memory persistence fallback.');
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  getPool(): Pool | null {
    return this.pool;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  async query(text: string, params?: any[]) {
    if (this.pool && this.isConnected) {
      return this.pool.query(text, params);
    }
    throw new Error('Database not connected');
  }
}
