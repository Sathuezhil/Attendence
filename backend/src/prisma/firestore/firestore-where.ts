import { toMillis, toNumber } from './firestore-serialize';

const FILTER_KEYS = new Set([
  'equals',
  'not',
  'in',
  'notIn',
  'lt',
  'lte',
  'gt',
  'gte',
  'contains',
  'startsWith',
  'endsWith',
  'mode',
]);

export interface RelatedLookup {
  getBelongsTo(
    model: string,
    id: unknown,
  ): Record<string, unknown> | null;
}

export interface WhereContext {
  relations: Record<
    string,
    { kind: 'belongsTo' | 'hasMany'; model: string; foreignKey: string }
  >;
  lookup: RelatedLookup;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function isFilterObject(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => FILTER_KEYS.has(key));
}

function normalizeString(value: unknown): string {
  if (value == null) {
    return '';
  }
  return String(value);
}

function compareEquals(left: unknown, right: unknown): boolean {
  if (left == null && right == null) {
    return true;
  }
  if (left == null || right == null) {
    return false;
  }

  const leftTime = toMillis(left);
  const rightTime = toMillis(right);
  if (leftTime != null && rightTime != null) {
    return leftTime === rightTime;
  }

  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (
    leftNumber != null &&
    rightNumber != null &&
    typeof left !== 'string' &&
    typeof right !== 'string'
  ) {
    return leftNumber === rightNumber;
  }

  return left === right;
}

function compareInsensitive(left: unknown, right: unknown): boolean {
  return (
    normalizeString(left).toLowerCase() === normalizeString(right).toLowerCase()
  );
}

export function compareOrdered(left: unknown, right: unknown): number | null {
  const leftTime = toMillis(left);
  const rightTime = toMillis(right);
  if (leftTime != null && rightTime != null) {
    return leftTime - rightTime;
  }
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber != null && rightNumber != null) {
    return leftNumber - rightNumber;
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right);
  }
  return null;
}

export function compareValues(left: unknown, right: unknown): number {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  const ordered = compareOrdered(left, right);
  if (ordered != null) {
    return ordered;
  }
  return String(left).localeCompare(String(right));
}

function matchFilterObject(
  value: unknown,
  filter: Record<string, unknown>,
): boolean {
  const mode =
    filter.mode === 'insensitive' ? 'insensitive' : 'default';

  for (const [key, expected] of Object.entries(filter)) {
    if (key === 'mode' || expected === undefined) {
      continue;
    }
    if (key === 'equals') {
      const ok =
        mode === 'insensitive'
          ? compareInsensitive(value, expected)
          : compareEquals(value, expected);
      if (!ok) {
        return false;
      }
      continue;
    }
    if (key === 'not') {
      if (expected === null) {
        if (value == null) {
          return false;
        }
        continue;
      }
      if (isFilterObject(expected)) {
        if (matchFilterObject(value, expected)) {
          return false;
        }
        continue;
      }
      if (compareEquals(value, expected)) {
        return false;
      }
      continue;
    }
    if (key === 'in') {
      const list = Array.isArray(expected) ? expected : [];
      if (list.length === 0) {
        return false;
      }
      if (!list.some((item) => compareEquals(value, item))) {
        return false;
      }
      continue;
    }
    if (key === 'notIn') {
      const list = Array.isArray(expected) ? expected : [];
      if (list.some((item) => compareEquals(value, item))) {
        return false;
      }
      continue;
    }
    if (key === 'contains') {
      const haystack = normalizeString(value);
      const needle = normalizeString(expected);
      const ok =
        mode === 'insensitive'
          ? haystack.toLowerCase().includes(needle.toLowerCase())
          : haystack.includes(needle);
      if (!ok) {
        return false;
      }
      continue;
    }
    if (key === 'startsWith') {
      const haystack = normalizeString(value);
      const needle = normalizeString(expected);
      const ok =
        mode === 'insensitive'
          ? haystack.toLowerCase().startsWith(needle.toLowerCase())
          : haystack.startsWith(needle);
      if (!ok) {
        return false;
      }
      continue;
    }
    if (key === 'endsWith') {
      const haystack = normalizeString(value);
      const needle = normalizeString(expected);
      const ok =
        mode === 'insensitive'
          ? haystack.toLowerCase().endsWith(needle.toLowerCase())
          : haystack.endsWith(needle);
      if (!ok) {
        return false;
      }
      continue;
    }
    if (key === 'lt' || key === 'lte' || key === 'gt' || key === 'gte') {
      if (value == null) {
        return false;
      }
      const ordered = compareOrdered(value, expected);
      if (ordered == null) {
        return false;
      }
      if (key === 'lt' && !(ordered < 0)) {
        return false;
      }
      if (key === 'lte' && !(ordered <= 0)) {
        return false;
      }
      if (key === 'gt' && !(ordered > 0)) {
        return false;
      }
      if (key === 'gte' && !(ordered >= 0)) {
        return false;
      }
    }
  }

  return true;
}

export function matchWhere(
  record: Record<string, unknown>,
  where: unknown,
  context: WhereContext,
): boolean {
  if (where == null) {
    return true;
  }
  if (!isPlainObject(where)) {
    return false;
  }

  if (Array.isArray(where.AND)) {
    if (!where.AND.every((part) => matchWhere(record, part, context))) {
      return false;
    }
  } else if (where.AND !== undefined) {
    if (!matchWhere(record, where.AND, context)) {
      return false;
    }
  }

  if (Array.isArray(where.OR)) {
    if (
      where.OR.length > 0 &&
      !where.OR.some((part) => matchWhere(record, part, context))
    ) {
      return false;
    }
  }

  if (where.NOT !== undefined) {
    const notParts = Array.isArray(where.NOT) ? where.NOT : [where.NOT];
    if (notParts.some((part) => matchWhere(record, part, context))) {
      return false;
    }
  }

  for (const [key, condition] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      continue;
    }
    if (condition === undefined) {
      continue;
    }

    const relation = context.relations[key];
    if (relation) {
      if (relation.kind !== 'belongsTo') {
        continue;
      }
      const related = context.lookup.getBelongsTo(
        relation.model,
        record[relation.foreignKey],
      );
      if (!related) {
        return false;
      }
      if (
        !matchWhere(related, condition, {
          ...context,
          relations: {},
        })
      ) {
        return false;
      }
      continue;
    }

    if (isFilterObject(condition)) {
      if (!matchFilterObject(record[key], condition)) {
        return false;
      }
      continue;
    }

    if (!compareEquals(record[key], condition)) {
      return false;
    }
  }

  return true;
}

export function expandUniqueWhere(
  where: Record<string, unknown> | undefined,
  uniqueNames: string[],
): Record<string, unknown> | undefined {
  if (!where) {
    return where;
  }
  const expanded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    if (
      uniqueNames.includes(key) &&
      isPlainObject(value) &&
      !isFilterObject(value)
    ) {
      Object.assign(expanded, value);
      continue;
    }
    expanded[key] = value;
  }
  return expanded;
}
