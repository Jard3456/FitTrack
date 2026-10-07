import { Exercise } from "../types/exercise";
import { API_BASE_URL, isApiConfigured } from "./apiConfig";
import { getStoredSession } from "./authApi";

export type CustomExerciseInput = Omit<
  Exercise,
  "id" | "customId" | "isCustom"
>;

type ApiCustomExercise = CustomExerciseInput & {
  id: number;
};

async function getAuthHeaders() {
  const session = await getStoredSession();
  if (!session?.token) {
    throw new Error("Debes iniciar sesión para usar tus ejercicios personalizados.");
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

function normalizeExercise(exercise: ApiCustomExercise): Exercise {
  return {
    ...exercise,
    id: `custom-${exercise.id}`,
    customId: exercise.id,
    isCustom: true,
  };
}

export async function getCustomExercises(): Promise<Exercise[]> {
  if (!isApiConfigured) return [];

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/exercises/custom`, {
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudieron consultar tus ejercicios personalizados.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ??
        "No se pudieron consultar tus ejercicios personalizados."
    );
  }

  const data = (await response.json()) as ApiCustomExercise[];
  return data.map(normalizeExercise);
}

export async function createCustomExercise(
  exercise: CustomExerciseInput
): Promise<Exercise> {
  if (!isApiConfigured) {
    throw new Error("El backend no está configurado.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/exercises/custom`, {
      method: "POST",
      headers: {
        ...((await getAuthHeaders()) as Record<string, string>),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(exercise),
    });
  } catch {
    throw new Error("No se pudo guardar el ejercicio personalizado.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ??
        "No se pudo guardar el ejercicio personalizado."
    );
  }

  return normalizeExercise((await response.json()) as ApiCustomExercise);
}

export async function deleteCustomExercise(customId: number) {
  if (!isApiConfigured) return;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/exercises/custom/${customId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error("No se pudo eliminar el ejercicio personalizado.");
  }

  if (!response.ok) {
    throw new Error(
      (await getErrorMessage(response)) ??
        "No se pudo eliminar el ejercicio personalizado."
    );
  }
}
