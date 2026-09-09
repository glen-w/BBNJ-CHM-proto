import type { Db } from "@/lib/db";
import { User } from "@/lib/contracts/events";

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  roles_json: string;
  party_code: string | null;
  active: number;
};

export function rowToUser(row: UserRow): User {
  return User.parse({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    roles: JSON.parse(row.roles_json),
    partyCode: row.party_code ?? undefined,
    active: row.active === 1,
  });
}

export function findUserById(db: Db, id: string): User | undefined {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? rowToUser(row) : undefined;
}

export function findUserByUsername(db: Db, username: string): User | undefined {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  return row ? rowToUser(row) : undefined;
}

export function listUsers(db: Db): User[] {
  return (db.prepare("SELECT * FROM users ORDER BY username").all() as UserRow[]).map(rowToUser);
}

export function usersWithRole(db: Db, role: string): User[] {
  return listUsers(db).filter((u) => u.active && u.roles.includes(role as User["roles"][number]));
}

export function upsertUser(db: Db, user: User): void {
  User.parse(user);
  db.prepare(
    `INSERT INTO users(id, username, display_name, roles_json, party_code, active)
     VALUES (@id, @username, @displayName, @roles, @partyCode, @active)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username, display_name = excluded.display_name,
       roles_json = excluded.roles_json, party_code = excluded.party_code, active = excluded.active`,
  ).run({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roles: JSON.stringify(user.roles),
    partyCode: user.partyCode ?? null,
    active: user.active ? 1 : 0,
  });
}
