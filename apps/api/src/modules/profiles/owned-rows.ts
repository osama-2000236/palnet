import { ErrorCode } from "@baydar/shared";

import { DomainException } from "../../common/domain-exception";

// Four profile sections — certificates, volunteering, honors, publications —
// are the same three operations over four tables: create under my profile,
// update a row that is mine, delete a row that is mine.
//
// Written out four times that is twelve near-identical methods, and the
// interesting part of each is the one line that could be wrong: whether the
// `where` is scoped to the caller's profile. Once, here, it cannot be forgotten
// in the fourth copy.

/**
 * The slice of a Prisma delegate this needs.
 *
 * Structural rather than imported: the api package does not compile against the
 * generated client types, which is why every mapper in here hand-rolls its rows.
 */
export interface OwnedDelegate<TRow> {
  create(args: { data: Record<string, unknown> }): Promise<TRow>;
  updateMany(args: {
    where: { id: string; profileId: string };
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
  deleteMany(args: { where: { id: string; profileId: string } }): Promise<{ count: number }>;
  findUniqueOrThrow(args: { where: { id: string } }): Promise<TRow>;
}

/**
 * Zero rows touched means the row exists but belongs to somebody else, or does
 * not exist at all. Both are 404 on purpose: telling an attacker which is which
 * turns a guessed id into an existence oracle.
 */
export function assertTouched(count: number): void {
  if (count === 0) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
}

export async function createOwned<TRow, TDto>(
  delegate: OwnedDelegate<TRow>,
  profileId: string,
  data: Record<string, unknown>,
  toDto: (row: TRow) => TDto,
): Promise<TDto> {
  return toDto(await delegate.create({ data: { ...data, profileId } }));
}

export async function updateOwned<TRow, TDto>(
  delegate: OwnedDelegate<TRow>,
  profileId: string,
  id: string,
  data: Record<string, unknown>,
  toDto: (row: TRow) => TDto,
): Promise<TDto> {
  // `updateMany` rather than `update`, because `update` takes a unique `where`
  // and cannot also filter on profileId — which is exactly the filter that
  // makes this safe.
  const { count } = await delegate.updateMany({ where: { id, profileId }, data });
  assertTouched(count);
  return toDto(await delegate.findUniqueOrThrow({ where: { id } }));
}

export async function removeOwned<TRow>(
  delegate: OwnedDelegate<TRow>,
  profileId: string,
  id: string,
): Promise<void> {
  const { count } = await delegate.deleteMany({ where: { id, profileId } });
  assertTouched(count);
}
