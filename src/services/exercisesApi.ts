import { Exercise } from "../types/exercise";
import {
  translateDifficulty,
  translateEquipment,
  translateMuscle,
  translateType,
} from "../utils/exerciseTranslations";

declare const process: {
  env: {
    EXPO_PUBLIC_API_NINJAS_KEY?: string;
  };
};

const API_URL = "https://api.api-ninjas.com/v1/exercises";

type ApiNinjasExercise = {
  name?: string;
  type?: string;
  muscle?: string;
  difficulty?: string;
  equipment?: string;
  equipments?: string[];
  instructions?: string;
  safety_info?: string;
};

export class ExercisesApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ExercisesApiError";
  }
}

const getApiKey = () => {
  const apiKey = process.env.EXPO_PUBLIC_API_NINJAS_KEY?.trim();

  if (!apiKey) {
    throw new ExercisesApiError(
      "Falta EXPO_PUBLIC_API_NINJAS_KEY. Genera una API key en API Ninjas y agrégala al archivo .env."
    );
  }

  return apiKey;
};

const normalizeExercise = (
  exercise: ApiNinjasExercise,
  index: number
): Exercise => ({
  id: `${exercise.name ?? "exercise"}-${index}`,
  name: exercise.name ?? "Ejercicio sin nombre",
  type: translateType(exercise.type ?? "strength"),
  muscle: translateMuscle(exercise.muscle ?? "General"),
  difficulty: translateDifficulty(exercise.difficulty ?? "intermediate"),
  equipment: translateEquipment(
    exercise.equipments?.join(", ") || exercise.equipment || "Sin equipo"
  ),
  instructions:
    exercise.instructions ?? "No hay instrucciones disponibles para este ejercicio.",
  safetyInfo:
    exercise.safety_info ??
    "Usa una técnica controlada y detén el ejercicio si sientes dolor.",
});

export async function getExercises(search?: string): Promise<Exercise[]> {
  const apiKey = getApiKey();
  const query = search?.trim()
    ? `?name=${encodeURIComponent(search.trim())}`
    : "";

  let response: Response;

  try {
    response = await fetch(`${API_URL}${query}`, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
    });
  } catch {
    throw new ExercisesApiError(
      "No se pudo conectar con el servicio de ejercicios. Revisa tu conexión."
    );
  }

  if (!response.ok) {
    let detail = "La API rechazó la solicitud.";

    try {
      const body = await response.json();
      detail = body?.error ?? detail;
    } catch {
      // La respuesta puede no tener un cuerpo JSON.
    }

    throw new ExercisesApiError(detail, response.status);
  }

  const data = (await response.json()) as ApiNinjasExercise[];
  return data.map(normalizeExercise);
}
