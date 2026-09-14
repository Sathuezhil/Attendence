import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  recordNotFoundError,
  uniqueConstraintError,
} from './firestore-error';
import {
  MODEL_CONFIG,
  ModelConfig,
  ModelName,
  UniqueIndex,
} from './firestore-models';
import {
  deserializeRecord,
  pickSelected,
  serializeForWrite,
  stripUndefined,
  toNumber,
} from './firestore-serialize';
import { DocumentStore, StoredRecord } from './firestore-store';
import {
  compareValues,
  expandUniqueWhere,
  matchWhere,
} from './firestore-where';

type AnyRecord = Record<string, unknown>;

export interface DelegateClient {
  store: DocumentStore;
  delegate(name: ModelName): FirestoreDelegate;
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function uniqueNames(config: ModelConfig): string[] {
  return [
    'id',
    ...config.uniques.map((unique) =>
      unique.fields.length === 1 ? unique.fields[0] : unique.name,
    ),
    ...config.uniques.map((unique) => unique.name),
  ];
}

function valueMatches(
  record: AnyRecord,
  expected: Record<string, unknown>,
): boolean {
  return Object.entries(expected).every(([key, value]) => {
    if (value === null) {
      return record[key] == null;
    }
    return record[key] === value || (record[key] == null && value == null);
  });
}

export class FirestoreDelegate {
  constructor(
    private readonly name: ModelName,
    private readonly client: DelegateClient,
  ) {}

  private get config(): ModelConfig {
    return MODEL_CONFIG[this.name];
  }

  async findMany(args: AnyRecord = {}): Promise<any[]> {
    const rows = await this.loadFiltered(args.where);
    const sorted = this.sortRows(rows, args.orderBy);
    const skipped = args.skip ? sorted.slice(Number(args.skip)) : sorted;
    const taken =
      args.take == null ? skipped : skipped.slice(0, Number(args.take));
    return Promise.all(
      taken.map((row) => this.present(row, args.include, args.select)),
    );
  }

  async findFirst(args: AnyRecord = {}): Promise<any | null> {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] ?? null;
  }

  async findUnique(args: AnyRecord = {}): Promise<any | null> {
    const where = expandUniqueWhere(asRecord(args.where), uniqueNames(this.config));
    return this.findFirst({ ...args, where });
  }

  async count(args: AnyRecord = {}): Promise<number> {
    const rows = await this.loadFiltered(args.where);
    return rows.length;
  }

  async create(args: AnyRecord = {}): Promise<any> {
    const { scalars, nestedCreates } = this.splitWriteData(asRecord(args.data));
    const now = new Date();
    const id =
      typeof scalars.id === 'string' && scalars.id ? scalars.id : randomUUID();
    const record = {
      ...this.config.defaults,
      ...scalars,
      id,
      createdAt: scalars.createdAt ?? now,
      updatedAt: scalars.updatedAt ?? now,
    };
    await this.assertUnique(record);
    await this.persist(record);
    await this.writeNested(id, nestedCreates);
    return this.present(
      await this.requireById(id),
      args.include,
      args.select,
    );
  }

  async update(args: AnyRecord = {}): Promise<any> {
    const current = await this.findUnique({ where: args.where });
    if (!current) {
      throw recordNotFoundError();
    }
    const { scalars, nestedCreates } = this.splitWriteData(asRecord(args.data));
    const next = {
      ...current,
      ...scalars,
      id: current.id,
      updatedAt: new Date(),
    };
    await this.assertUnique(next, String(current.id));
    await this.persist(next);
    await this.writeNested(String(current.id), nestedCreates);
    return this.present(
      await this.requireById(String(current.id)),
      args.include,
      args.select,
    );
  }

  async upsert(args: AnyRecord = {}): Promise<any> {
    const existing = await this.findUnique({ where: args.where });
    if (existing) {
      return this.update({
        where: { id: existing.id },
        data: args.update ?? {},
        include: args.include,
        select: args.select,
      });
    }
    const uniqueWhere = expandUniqueWhere(
      asRecord(args.where),
      uniqueNames(this.config),
    );
    return this.create({
      data: { ...uniqueWhere, ...asRecord(args.create) },
      include: args.include,
      select: args.select,
    });
  }

  async delete(args: AnyRecord = {}): Promise<any> {
    const current = await this.findUnique({
      where: args.where,
      include: args.include,
      select: args.select,
    });
    if (!current) {
      throw recordNotFoundError();
    }
    await this.cascadeHasMany(String(current.id));
    await this.client.store.delete(this.config.collection, String(current.id));
    return current;
  }

  async deleteMany(args: AnyRecord = {}): Promise<{ count: number }> {
    const rows = await this.loadFiltered(args.where);
    for (const row of rows) {
      await this.delete({ where: { id: row.id } });
    }
    return { count: rows.length };
  }

  async updateMany(args: AnyRecord = {}): Promise<{ count: number }> {
    const rows = await this.loadFiltered(args.where);
    for (const row of rows) {
      await this.update({ where: { id: row.id }, data: args.data });
    }
    return { count: rows.length };
  }

  async createMany(args: AnyRecord = {}): Promise<{ count: number }> {
    const rows = Array.isArray(args.data) ? args.data : [];
    let count = 0;
    for (const row of rows) {
      try {
        await this.create({ data: row });
        count += 1;
      } catch (error) {
        if (
          args.skipDuplicates &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }
    return { count };
  }

  async aggregate(args: AnyRecord = {}): Promise<any> {
    const rows = await this.loadFiltered(args.where);
    return this.summarize(rows, args);
  }

  async groupBy(args: AnyRecord = {}): Promise<any[]> {
    const rows = await this.loadFiltered(args.where);
    const by = Array.isArray(args.by) ? (args.by as string[]) : [];
    const groups = new Map<string, { key: AnyRecord; rows: AnyRecord[] }>();
    for (const row of rows) {
      const key: AnyRecord = {};
      for (const field of by) {
        key[field] = row[field];
      }
      const id = JSON.stringify(key);
      const group = groups.get(id) ?? { key, rows: [] };
      group.rows.push(row);
      groups.set(id, group);
    }

    let result = [...groups.values()].map((group) => ({
      ...group.key,
      ...this.summarize(group.rows, args),
    }));
    result = this.sortRows(result, args.orderBy);
    if (args.skip) {
      result = result.slice(Number(args.skip));
    }
    if (args.take != null) {
      result = result.slice(0, Number(args.take));
    }
    return result;
  }

  private summarize(rows: AnyRecord[], args: AnyRecord): AnyRecord {
    const output: AnyRecord = {};
    if (args._count) {
      output._count =
        args._count === true
          ? rows.length
          : { _all: rows.length };
    }
    if (args._sum && typeof args._sum === 'object') {
      const sums: AnyRecord = {};
      for (const [field, enabled] of Object.entries(asRecord(args._sum))) {
        if (!enabled) {
          continue;
        }
        let sum = 0;
        let seen = false;
        for (const row of rows) {
          const numeric = toNumber(row[field]);
          if (numeric != null) {
            sum += numeric;
            seen = true;
          }
        }
        sums[field] = seen ? sum : null;
      }
      output._sum = sums;
    }
    return output;
  }

  private async loadFiltered(where: unknown): Promise<AnyRecord[]> {
    const records = await this.loadAll();
    const lookup = await this.buildLookup(where);
    return records.filter((record) =>
      matchWhere(record, where, {
        relations: this.config.relations,
        lookup,
      }),
    );
  }

  private async loadAll(): Promise<AnyRecord[]> {
    const snap = await this.client.store.load(this.config.collection);
    return [...snap.values()].map((row) =>
      deserializeRecord(row, this.config),
    );
  }

  private async requireById(id: string): Promise<AnyRecord> {
    const snap = await this.client.store.load(this.config.collection);
    const row = snap.get(id);
    if (!row) {
      throw recordNotFoundError();
    }
    return deserializeRecord(row, this.config);
  }

  private async persist(record: AnyRecord): Promise<void> {
    const id = String(record.id);
    const serialized = serializeForWrite(stripUndefined(record), this.config);
    await this.client.store.set(this.config.collection, id, serialized);
  }

  private async assertUnique(
    record: AnyRecord,
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.loadAll();
    for (const unique of this.config.uniques) {
      if (this.uniqueSkipped(record, unique)) {
        continue;
      }
      const clash = existing.find((row) => {
        if (ignoreId && String(row.id) === ignoreId) {
          return false;
        }
        if (
          unique.whereEquals &&
          !valueMatches(row, unique.whereEquals)
        ) {
          return false;
        }
        return unique.fields.every((field) => {
          const left = row[field];
          const right = record[field];
          if (this.config.dateOnlyFields.includes(field)) {
            return compareValues(left, right) === 0;
          }
          return left === right || compareValues(left, right) === 0;
        });
      });
      if (clash) {
        throw uniqueConstraintError([
          unique.name,
          ...unique.fields,
          ...unique.fields.map((field) =>
            field.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`),
          ),
        ]);
      }
    }
  }

  private uniqueSkipped(record: AnyRecord, unique: UniqueIndex): boolean {
    if (unique.whereEquals && !valueMatches(record, unique.whereEquals)) {
      return true;
    }
    return (unique.skipIfNull ?? []).some((field) => record[field] == null);
  }

  private splitWriteData(data: AnyRecord): {
    scalars: AnyRecord;
    nestedCreates: Array<{ model: ModelName; foreignKey: string; rows: AnyRecord[] }>;
  } {
    const scalars: AnyRecord = {};
    const nestedCreates: Array<{
      model: ModelName;
      foreignKey: string;
      rows: AnyRecord[];
    }> = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        continue;
      }
      const relation = this.config.relations[key];
      if (!relation) {
        scalars[key] = value;
        continue;
      }
      if (relation.kind === 'belongsTo' && isConnect(value)) {
        scalars[relation.foreignKey] = value.connect.id;
        continue;
      }
      if (relation.kind === 'hasMany' && isNestedCreate(value)) {
        const rows = Array.isArray(value.create) ? value.create : [value.create];
        nestedCreates.push({
          model: relation.model,
          foreignKey: relation.foreignKey,
          rows: rows.map((row) => asRecord(row)),
        });
        continue;
      }
    }

    return { scalars, nestedCreates };
  }

  private async writeNested(
    parentId: string,
    nestedCreates: Array<{
      model: ModelName;
      foreignKey: string;
      rows: AnyRecord[];
    }>,
  ): Promise<void> {
    for (const nested of nestedCreates) {
      for (const row of nested.rows) {
        await this.client.delegate(nested.model).create({
          data: { ...row, [nested.foreignKey]: parentId },
        });
      }
    }
  }

  private async cascadeHasMany(parentId: string): Promise<void> {
    for (const relation of Object.values(this.config.relations)) {
      if (relation.kind !== 'hasMany') {
        continue;
      }
      await this.client.delegate(relation.model).deleteMany({
        where: { [relation.foreignKey]: parentId },
      });
    }
  }

  private async present(
    record: AnyRecord,
    include: unknown,
    select: unknown,
  ): Promise<any> {
    const presented: AnyRecord = { ...record };
    const includeMap = asRecord(include);
    for (const [key, spec] of Object.entries(includeMap)) {
      if (!spec) {
        continue;
      }
      const relation = this.config.relations[key];
      if (!relation) {
        continue;
      }
      const includeArgs = spec === true ? {} : asRecord(spec);
      if (relation.kind === 'belongsTo') {
        const relatedId = record[relation.foreignKey];
        presented[key] = relatedId
          ? await this.client.delegate(relation.model).findUnique({
              where: { id: relatedId },
              select: includeArgs.select,
              include: includeArgs.include,
            })
          : null;
        continue;
      }
      presented[key] = await this.client.delegate(relation.model).findMany({
        where: { [relation.foreignKey]: record.id },
        orderBy: includeArgs.orderBy,
        select: includeArgs.select,
        include: includeArgs.include,
      });
    }

    if (select) {
      const selected = pickSelected(presented, asRecord(select));
      for (const [key, spec] of Object.entries(includeMap)) {
        if (spec) {
          selected[key] = presented[key];
        }
      }
      return selected;
    }
    return presented;
  }

  private sortRows(rows: AnyRecord[], orderBy: unknown): AnyRecord[] {
    const orders = Array.isArray(orderBy)
      ? orderBy
      : orderBy
        ? [orderBy]
        : [];
    if (orders.length === 0) {
      return rows;
    }
    return [...rows].sort((left, right) => {
      for (const order of orders) {
        const entries = Object.entries(asRecord(order));
        for (const [field, direction] of entries) {
          const dir = direction === 'desc' ? -1 : 1;
          if (field === '_sum' || field === '_count') {
            const nested = asRecord(direction);
            for (const [nestedField, nestedDir] of Object.entries(nested)) {
              const nestedSign = nestedDir === 'desc' ? -1 : 1;
              const cmp = compareValues(
                asRecord(left[field])[nestedField],
                asRecord(right[field])[nestedField],
              );
              if (cmp !== 0) {
                return cmp * nestedSign;
              }
            }
            continue;
          }
          const cmp = compareValues(left[field], right[field]);
          if (cmp !== 0) {
            return cmp * dir;
          }
        }
      }
      return 0;
    });
  }

  private async buildLookup(where: unknown) {
    const needed = new Set<string>();
    collectRelationModels(where, this.config, needed);
    const caches = new Map<string, Map<string, StoredRecord>>();
    for (const modelName of needed) {
      const related = this.client.delegate(modelName as ModelName);
      const rows = await related.loadAllPublic();
      const map = new Map<string, StoredRecord>();
      for (const row of rows) {
        map.set(String(row.id), row as StoredRecord);
      }
      caches.set(modelName, map);
    }
    return {
      getBelongsTo(model: string, id: unknown) {
        if (id == null) {
          return null;
        }
        return caches.get(model)?.get(String(id)) ?? null;
      },
    };
  }

  async loadAllPublic(): Promise<AnyRecord[]> {
    return this.loadAll();
  }
}

function isConnect(
  value: unknown,
): value is { connect: { id: unknown } } {
  return (
    !!value &&
    typeof value === 'object' &&
    'connect' in value &&
    !!asRecord(asRecord(value).connect).id
  );
}

function isNestedCreate(
  value: unknown,
): value is { create: unknown } {
  return !!value && typeof value === 'object' && 'create' in value;
}

function collectRelationModels(
  where: unknown,
  config: ModelConfig,
  needed: Set<string>,
): void {
  if (!where || typeof where !== 'object') {
    return;
  }
  const record = asRecord(where);
  for (const [key, value] of Object.entries(record)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const parts = Array.isArray(value) ? value : [value];
      for (const part of parts) {
        collectRelationModels(part, config, needed);
      }
      continue;
    }
    const relation = config.relations[key];
    if (relation?.kind === 'belongsTo') {
      needed.add(relation.model);
    }
  }
}
