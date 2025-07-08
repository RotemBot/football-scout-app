import { Pool } from 'pg';
import { BaseRepository } from './base.repository';
import { Player } from '../models';

export class PlayerRepository extends BaseRepository<Player> {
  constructor(pool: Pool) {
    super(pool, 'players');
  }

  // Create a new player
  async create(data: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    const dbData = this.transformToDb(data);
    const result = await this.query(
      `INSERT INTO players (
        name, position, age, nationality, current_club, market_value_euros, 
        league, height_cm, foot, goals_this_season, assists_this_season, 
        appearances_this_season, contract_expires
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        dbData.name,
        dbData.position,
        dbData.age,
        dbData.nationality,
        dbData.current_club,
        dbData.market_value_euros,
        dbData.league,
        dbData.height_cm,
        dbData.foot,
        dbData.goals_this_season,
        dbData.assists_this_season,
        dbData.appearances_this_season,
        dbData.contract_expires
      ]
    );
    return this.transformFromDb(result.rows[0]);
  }

  // Update a player
  async update(id: string, data: Partial<Player>): Promise<Player | null> {
    const dbData = this.transformToDb(data);
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(dbData)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await this.query(
      `UPDATE players SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] ? this.transformFromDb(result.rows[0]) : null;
  }

  // Find players by position
  async findByPosition(position: string): Promise<Player[]> {
    const result = await this.query(
      `SELECT * FROM players WHERE position = $1 ORDER BY created_at DESC`,
      [position]
    );
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Find players by nationality
  async findByNationality(nationality: string): Promise<Player[]> {
    const result = await this.query(
      `SELECT * FROM players WHERE nationality = $1 ORDER BY created_at DESC`,
      [nationality]
    );
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Find players by club
  async findByClub(club: string): Promise<Player[]> {
    const result = await this.query(
      `SELECT * FROM players WHERE current_club = $1 ORDER BY created_at DESC`,
      [club]
    );
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Find players by age range
  async findByAgeRange(minAge: number, maxAge: number): Promise<Player[]> {
    const result = await this.query(
      `SELECT * FROM players WHERE age >= $1 AND age <= $2 ORDER BY created_at DESC`,
      [minAge, maxAge]
    );
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Find players by market value range
  async findByMarketValueRange(minValue: number, maxValue: number): Promise<Player[]> {
    const result = await this.query(
      `SELECT * FROM players WHERE market_value_euros >= $1 AND market_value_euros <= $2 ORDER BY created_at DESC`,
      [minValue, maxValue]
    );
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Search players by name
  async searchByName(name: string): Promise<Player[]> {
    const result = await this.query(
      `SELECT * FROM players WHERE name ILIKE $1 ORDER BY created_at DESC`,
      [`%${name}%`]
    );
    return result.rows.map(row => this.transformFromDb(row));
  }

  // Transform database row to Player model
  transformFromDb(dbRow: any): Player {
    return {
      id: dbRow.id,
      name: dbRow.name,
      position: dbRow.position,
      age: dbRow.age,
      nationality: dbRow.nationality,
      currentClub: dbRow.current_club,
      marketValueEuros: dbRow.market_value_euros ? parseInt(dbRow.market_value_euros, 10) : undefined,
      league: dbRow.league,
      heightCm: dbRow.height_cm,
      foot: dbRow.foot,
      goalsThisSeason: dbRow.goals_this_season || 0,
      assistsThisSeason: dbRow.assists_this_season || 0,
      appearancesThisSeason: dbRow.appearances_this_season || 0,
      contractExpires: dbRow.contract_expires ? new Date(dbRow.contract_expires) : undefined,
      createdAt: new Date(dbRow.created_at),
      updatedAt: new Date(dbRow.updated_at)
    } as Player;
  }

  // Transform Player model to database row
  transformToDb(model: Partial<Player>): any {
    return {
      name: model.name,
      position: model.position,
      age: model.age,
      nationality: model.nationality,
      current_club: model.currentClub,
      market_value_euros: model.marketValueEuros,
      league: model.league,
      height_cm: model.heightCm,
      foot: model.foot,
      goals_this_season: model.goalsThisSeason || 0,
      assists_this_season: model.assistsThisSeason || 0,
      appearances_this_season: model.appearancesThisSeason || 0,
      contract_expires: model.contractExpires
    };
  }
} 