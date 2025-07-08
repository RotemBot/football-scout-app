import { testPool } from '../setup';
import { PlayerRepository } from '../../src/repositories/player.repository';
import { Player } from '../../src/models';

describe('PlayerRepository', () => {
  let playerRepository: PlayerRepository;

  beforeEach(() => {
    playerRepository = new PlayerRepository(testPool);
  });

  describe('create', () => {
    test('should create a new player', async () => {
      const playerData = {
        name: 'Test Player',
        position: 'ST',
        age: 25,
        nationality: 'Brazil',
        currentClub: 'Test FC',
        marketValueEuros: 50000000,
        league: 'Premier League',
        heightCm: 180,
        foot: 'Right',
        goalsThisSeason: 15,
        assistsThisSeason: 5,
        appearancesThisSeason: 25
      };

      const createdPlayer = await playerRepository.create(playerData);

      expect(createdPlayer.id).toBeDefined();
      expect(createdPlayer.name).toBe(playerData.name);
      expect(createdPlayer.position).toBe(playerData.position);
      expect(createdPlayer.age).toBe(playerData.age);
      expect(createdPlayer.nationality).toBe(playerData.nationality);
      expect(createdPlayer.currentClub).toBe(playerData.currentClub);
      expect(createdPlayer.marketValueEuros).toBe(playerData.marketValueEuros);
      expect(createdPlayer.createdAt).toBeInstanceOf(Date);
      expect(createdPlayer.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    test('should find a player by ID', async () => {
      const playerData = {
        name: 'Find Test Player',
        position: 'CM',
        age: 28,
        nationality: 'Spain',
        currentClub: 'Test Madrid',
        goalsThisSeason: 0,
        assistsThisSeason: 0,
        appearancesThisSeason: 0
      };

      const createdPlayer = await playerRepository.create(playerData);
      const foundPlayer = await playerRepository.findById(createdPlayer.id);

      expect(foundPlayer).toBeDefined();
      expect(foundPlayer!.id).toBe(createdPlayer.id);
      expect(foundPlayer!.name).toBe(playerData.name);
      expect(foundPlayer!.position).toBe(playerData.position);
    });

    test('should return null for non-existent player', async () => {
      const foundPlayer = await playerRepository.findById('12345678-1234-1234-1234-123456789012');
      expect(foundPlayer).toBeNull();
    });
  });

  describe('update', () => {
    test('should update a player', async () => {
      const playerData = {
        name: 'Update Test Player',
        position: 'LW',
        age: 26,
        nationality: 'Argentina',
        currentClub: 'Test Barcelona',
        goalsThisSeason: 0,
        assistsThisSeason: 0,
        appearancesThisSeason: 0
      };

      const createdPlayer = await playerRepository.create(playerData);
      const updateData = {
        name: 'Updated Player Name',
        age: 27,
        goalsThisSeason: 10
      };

      const updatedPlayer = await playerRepository.update(createdPlayer.id, updateData);

      expect(updatedPlayer).toBeDefined();
      expect(updatedPlayer!.name).toBe(updateData.name);
      expect(updatedPlayer!.age).toBe(updateData.age);
      expect(updatedPlayer!.goalsThisSeason).toBe(updateData.goalsThisSeason);
      expect(updatedPlayer!.position).toBe(playerData.position); // Should remain unchanged
    });
  });

  describe('findByPosition', () => {
    test('should find players by position', async () => {
      const playerData1 = {
        name: 'Striker 1',
        position: 'ST',
        age: 25,
        nationality: 'Brazil',
        currentClub: 'Test FC',
        goalsThisSeason: 0,
        assistsThisSeason: 0,
        appearancesThisSeason: 0
      };

      const playerData2 = {
        name: 'Striker 2',
        position: 'ST',
        age: 28,
        nationality: 'Argentina',
        currentClub: 'Test United',
        goalsThisSeason: 0,
        assistsThisSeason: 0,
        appearancesThisSeason: 0
      };

      await playerRepository.create(playerData1);
      await playerRepository.create(playerData2);

      const strikers = await playerRepository.findByPosition('ST');
      expect(strikers.length).toBeGreaterThanOrEqual(2);
      strikers.forEach(player => {
        expect(player.position).toBe('ST');
      });
    });
  });

  describe('searchByName', () => {
    test('should search players by name', async () => {
      const playerData = {
        name: 'Unique Search Player',
        position: 'GK',
        age: 30,
        nationality: 'Germany',
        currentClub: 'Test Bayern',
        goalsThisSeason: 0,
        assistsThisSeason: 0,
        appearancesThisSeason: 0
      };

      await playerRepository.create(playerData);

      const searchResults = await playerRepository.searchByName('Unique Search');
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults[0].name).toContain('Unique Search');
    });
  });

  describe('findByAgeRange', () => {
    test('should find players within age range', async () => {
      const playerData = {
        name: 'Age Range Player',
        position: 'CB',
        age: 24,
        nationality: 'France',
        currentClub: 'Test PSG',
        goalsThisSeason: 0,
        assistsThisSeason: 0,
        appearancesThisSeason: 0
      };

      await playerRepository.create(playerData);

      const playersInRange = await playerRepository.findByAgeRange(20, 30);
      expect(playersInRange.length).toBeGreaterThanOrEqual(1);
      playersInRange.forEach(player => {
        expect(player.age).toBeGreaterThanOrEqual(20);
        expect(player.age).toBeLessThanOrEqual(30);
      });
    });
  });
}); 