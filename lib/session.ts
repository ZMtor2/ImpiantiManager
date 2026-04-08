import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  const user = session.user as { ruolo?: string };
  if (user.ruolo !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}
