import type { SessionPayload } from "./session";

export type Role = "OWNER" | "DEVELOPER" | "CLIENT";

export function canAccessOwner(session: SessionPayload | null): boolean {
  return session?.role === "OWNER";
}

export function canAccessDeveloper(session: SessionPayload | null): boolean {
  return session?.role === "DEVELOPER";
}

export function canAccessClient(session: SessionPayload | null): boolean {
  return session?.role === "CLIENT";
}

export function canSeeBilling(session: SessionPayload | null): boolean {
  return session?.role === "OWNER" || session?.role === "CLIENT";
}

export function redirectForRole(role: Role): string {
  switch (role) {
    case "OWNER":
      return "/owner";
    case "DEVELOPER":
      return "/developer";
    case "CLIENT":
      return "/client";
    default:
      return "/login";
  }
}
