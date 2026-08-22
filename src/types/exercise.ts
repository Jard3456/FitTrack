export type Exercise = {
  id: string;
  name: string;
  type: string;
  muscle: string;
  difficulty: string;
  equipment: string;
  instructions: string;
  safetyInfo: string;
};

export type ExerciseStackParamList = {
  ListaEjercicios: undefined;
  DetalleEjercicio: { exercise: Exercise };
};