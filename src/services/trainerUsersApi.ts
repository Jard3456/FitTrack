import { getStoredSession } from "./authApi";
import { API_BASE_URL } from "./apiConfig";

export type TrainerUser = {
  id: string;
  name: string;
  email: string;
  trainerId: string | null;
  trainerName: string | null;
  routineCount: number;
  isAvailable: boolean;
  assignedToMe: boolean;
};

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
    if (response.status === 404) {
      return "El backend no tiene activa la gestión de entrenadores. Reinicia el servidor.";
    }

    return `El servidor devolvió el código ${response.status}.`;
  }
}

export async function getTrainerUsers(): Promise<TrainerUser[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/trainer/users`, {
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ?? "No se pudieron consultar los usuarios."
    );
  }

  return (await response.json()) as TrainerUser[];
}

export async function assignTrainerUser(userId: string) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/trainer/users/${userId}`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ?? "No se pudo asignar el usuario."
    );
  }
}

export async function removeTrainerUser(userId: string) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/trainer/users/${userId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ?? "No se pudo liberar el usuario."
    );
  }
}
