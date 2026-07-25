import { TeamMember } from "./googleSheets";

/**
 * djb2 hash – deterministic, produces a 32-bit unsigned integer.
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Generate a short alphanumeric code (6-7 chars) from a member name.
 * Same name always produces the same code.
 */
export function generateMemberCode(name: string): string {
  const hash = djb2(name.toLowerCase().trim());
  return hash.toString(36); // base-36: 0-9 a-z
}

/**
 * Find the member whose name hashes to the given code.
 */
export function findMemberByCode(code: string, members: TeamMember[]): string | null {
  for (const m of members) {
    if (generateMemberCode(m.name) === code) return m.name;
  }
  return null;
}
