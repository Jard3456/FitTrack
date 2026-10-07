import { AuthUser, getStoredSession } from "./authApi";
import { API_BASE_URL } from "./apiConfig";

export type UserRole = AuthUser["role"];

async function getAuthHeaders() {
  const session = await getStoredSession();

  if (!session?.token) {
    throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${session.token}`,
  };
}

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return body?.message ?? body?.error;
  } catch {
    return undefined;
  }
}

export async function getUsersForAdmin(): Promise<AuthUser[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/users`, {
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ??
        "No se pudieron consultar los usuarios."
    );
  }

  return (await response.json()) as AuthUser[];
}

export async function updateUserRole(userId: string, role: UserRole) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: "PATCH",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ?? "No se pudo actualizar el rol."
    );
  }
}
