import { getStoredSession } from "./authApi";
import {
  API_BASE_URL,
  API_USER_ID,
  isApiConfigured,
} from "./apiConfig";

export type UserProgress = {
  name?: string;
  weight?: string;
  targetWeight?: string;
  startingWeight?: string;
  height?: string;
  objective?: string;
  lastWeightDate?: string | null;
  canRecordWeight?: boolean;
  weightHistory?: Array<{
    weight: string;
    recordedDate: string;
  }>;
  weeklyActivity?: {
    weekStart: string;
    weekEnd: string;
    completedTrainings: number;
    completedRoutines: number;
  };
};

export const isDatabaseConfigured = isApiConfigured;

export class DatabaseApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "DatabaseApiError";
  }
}

async function getRequestContext() {
  const session = await getStoredSession();

  return {
    userId: session?.user.id ?? API_USER_ID,
    headers: (session?.token
      ? { Authorization: `Bearer ${session.token}` }
      : {}) as Record<string, string>,
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

export async function getUserProgress(): Promise<UserProgress | null> {
  if (!isDatabaseConfigured) return null;

  const context = await getRequestContext();
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/progress/${encodeURIComponent(context.userId)}`,
      {
        headers: {
          Accept: "application/json",
          ...context.headers,
        },
      }
    );
  } catch {
    throw new DatabaseApiError(
      "No se pudo conectar con el servidor de la base de datos."
    );
  }

  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await getErrorMessage(response);
    throw new DatabaseApiError(
      detail ?? "La base de datos rechazó la consulta.",
      response.status
    );
  }

  return (await response.json()) as UserProgress;
}

export async function saveUserProgress(progress: UserProgress) {
  if (!isDatabaseConfigured) return;

  const context = await getRequestContext();
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/progress/${encodeURIComponent(context.userId)}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...context.headers,
        },
        body: JSON.stringify({
          userId: context.userId,
          ...progress,
        }),
      }
    );
  } catch {
    throw new DatabaseApiError(
      "No se pudo guardar la información en la base de datos."
    );
  }

  if (!response.ok) {
    const detail = await getErrorMessage(response);
    throw new DatabaseApiError(
      detail ?? "La base de datos rechazó el guardado.",
      response.status
    );
  }

  return (await response.json()) as {
    message: string;
    canRecordWeight?: boolean;
    lastWeightDate?: string | null;
  };
}
