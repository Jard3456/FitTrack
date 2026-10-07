const typeTranslations: Record<string, string> = {
  strength: "Fuerza",
  cardio: "Cardio",
  plyometrics: "Pliometría",
  stretching: "Estiramiento",
  powerlifting: "Powerlifting",
  strongman: "Strongman",
  olympic_weightlifting: "Levantamiento olímpico",
};

const muscleTranslations: Record<string, string> = {
  abdominals: "Abdominales",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Pantorrillas",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  lower_back: "Espalda baja",
  middle_back: "Espalda media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  traps: "Trapecios",
  triceps: "Tríceps",
  shoulders: "Hombros",
};

const difficultyTranslations: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Avanzado",
};

const equipmentTranslations: Record<string, string> = {
  barbell: "Barra",
  dumbbell: "Mancuernas",
  kettlebell: "Kettlebell",
  machine: "Máquina",
  cable: "Cable",
  bands: "Bandas elásticas",
  body_only: "Peso corporal",
  bodyweight: "Peso corporal",
  bench: "Banco",
  pullup_bar: "Barra de dominadas",
  none: "Sin equipo",
};

function translateValue(
  value: string,
  translations: Record<string, string>
) {
  return value
    .split(",")
    .map((part) => {
      const key = part.trim().toLowerCase().replace(/\s+/g, "_");
      return translations[key] ?? part.trim();
    })
    .filter(Boolean)
    .join(", ");
}

export const translateType = (value: string) =>
  translateValue(value, typeTranslations);

export const translateMuscle = (value: string) =>
  translateValue(value, muscleTranslations);

export const translateDifficulty = (value: string) =>
  translateValue(value, difficultyTranslations);

export const translateEquipment = (value: string) =>
  translateValue(value, equipmentTranslations);
