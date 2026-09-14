import type { DatabaseClient } from '../database/client';
import { randomUUID } from 'expo-crypto';
import {
  assertDeckName,
  type CreateDeckInput,
  type Deck,
  type UpdateDeckInput,
} from '../../domain/decks';

type DeckRow = {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

function toDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createId(): string {
  return randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export class DeckRepository {
  public constructor(private readonly db: DatabaseClient) {}

  public async list(parentId: string | null = null): Promise<Deck[]> {
    const rows = await this.db.getAllAsync<DeckRow>(
      `SELECT id, name, parent_id, position, created_at, updated_at
       FROM decks
       WHERE deleted_at IS NULL AND parent_id IS ?
       ORDER BY position ASC, name COLLATE NOCASE ASC`,
      parentId,
    );
    return rows.map(toDeck);
  }

  public async listAll(): Promise<Deck[]> {
    const rows = await this.db.getAllAsync<DeckRow>(
      `SELECT id, name, parent_id, position, created_at, updated_at
       FROM decks WHERE deleted_at IS NULL
       ORDER BY position ASC, name COLLATE NOCASE ASC`,
    );
    return rows.map(toDeck);
  }

  public async getById(id: string): Promise<Deck | null> {
    const row = await this.db.getFirstAsync<DeckRow>(
      `SELECT id, name, parent_id, position, created_at, updated_at
       FROM decks WHERE id = ? AND deleted_at IS NULL`,
      id,
    );
    return row ? toDeck(row) : null;
  }

  public async create(input: CreateDeckInput): Promise<Deck> {
    const name = assertDeckName(input.name);
    const parentId = input.parentId ?? null;
    if (parentId && !(await this.getById(parentId))) {
      throw new Error('Parent deck does not exist.');
    }

    const existing = await this.db.getFirstAsync<{ max_position: number | null }>(
      'SELECT MAX(position) AS max_position FROM decks WHERE parent_id IS ? AND deleted_at IS NULL',
      parentId,
    );
    const timestamp = now();
    const deck: Deck = {
      id: createId(),
      name,
      parentId,
      position: (existing?.max_position ?? -1) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.db.runAsync(
      `INSERT INTO decks (id, name, parent_id, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      deck.id,
      deck.name,
      deck.parentId,
      deck.position,
      deck.createdAt,
      deck.updatedAt,
    );
    return deck;
  }

  public async update(id: string, input: UpdateDeckInput): Promise<Deck> {
    const current = await this.getById(id);
    if (!current) throw new Error('Deck does not exist.');
    const name = assertDeckName(input.name);
    const parentId = input.parentId === undefined ? current.parentId : input.parentId;
    if (parentId === id) throw new Error('A deck cannot be its own parent.');
    if (parentId && !(await this.getById(parentId))) throw new Error('Parent deck does not exist.');
    if (parentId && parentId !== current.parentId) {
      const descendant = await this.db.getFirstAsync<{ id: string }>(
        `WITH RECURSIVE descendants(id) AS (
           SELECT id FROM decks WHERE id = ?
           UNION ALL
           SELECT decks.id FROM decks JOIN descendants ON decks.parent_id = descendants.id
         )
         SELECT id FROM descendants WHERE id = ?`,
        id,
        parentId,
      );
      if (descendant) throw new Error('A deck cannot be moved inside one of its descendants.');
    }

    const updatedAt = now();
    await this.db.runAsync(
      'UPDATE decks SET name = ?, parent_id = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      name,
      parentId,
      updatedAt,
      id,
    );
    return { ...current, name, parentId, updatedAt };
  }

  public async remove(id: string): Promise<void> {
    const children = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM decks WHERE parent_id = ? AND deleted_at IS NULL',
      id,
    );
    const cards = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM cards WHERE deck_id = ? AND deleted_at IS NULL',
      id,
    );
    if ((children?.count ?? 0) > 0 || (cards?.count ?? 0) > 0) {
      throw new Error('Deck must be empty before it can be deleted.');
    }
    const result = await this.db.runAsync(
      'UPDATE decks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      now(),
      now(),
      id,
    );
    if (result.changes === 0) throw new Error('Deck does not exist.');
  }
}
