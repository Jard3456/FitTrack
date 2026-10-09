import { getStoredSession } from "./authApi";
import { API_BASE_URL } from "./apiConfig";

export type AssignedRoutine = {
  id: string;
  title: string;
  level: string;
  durationMinutes: number;
  scheduledDate: string;
  completedCount: number;
  lastCompletedAt: string | null;
  exercises: Array<{ id: string; name: string; type: string }>;
};

export type CreateRoutineInput = {
  title: string;
  level: string;
  durationMinutes: number;
  scheduledDate: string;
  exerciseIds: number[];
};

export type ExerciseCompletionInput = {
  exerciseId: string;
  weightKg?: number | string | null;
  durationMinutes?: number | string | null;
  notes?: string;
};

export type TraineeProgress = {
  id: string;
  routineTitle: string;
  scheduledDate: string;
  completedAt: string;
  totalExercises: number;
  exercises: Array<{
    name: string;
    type: string;
    weightKg: number | null;
    durationMinutes: number | null;
    notes: string | null;
  }>;
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
    return undefined;
  }
}

export async function getAssignedRoutines(): Promise<AssignedRoutine[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/routines`, {
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ?? "No se pudieron consultar las rutinas."
    );
  }

  return (await response.json()) as AssignedRoutine[];
}

export async function createRoutineForUser(
  userId: string,
  routine: CreateRoutineInput
) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/trainer/users/${userId}/routines`, {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(routine),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ?? "No se pudo guardar la rutina."
    );
  }
}

export async function completeRoutine(
  routineId: string,
  exercises: ExerciseCompletionInput[]
) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/routines/${routineId}/complete`, {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exercises }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ??
        "No se pudo guardar el progreso de la rutina."
    );
  }
}

export async function getTraineeProgress(userId: string): Promise<TraineeProgress[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/trainer/users/${userId}/progress`, {
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ?? "No se pudo consultar el progreso."
    );
  }

  return (await response.json()) as TraineeProgress[];
}
