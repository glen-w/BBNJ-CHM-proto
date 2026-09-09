export type DomainErrorCode =
  | "forbidden"
  | "not_found"
  | "validation"
  | "not_pending"
  | "already_published"
  | "already_submitted"
  | "already_commented"
  | "stale_pack"
  | "invalid_transition"
  | "import_rejected";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
