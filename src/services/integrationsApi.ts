const TRAVEL_OAUTH_URL =
  process.env.EXPO_PUBLIC_TRAVEL_OAUTH_URL?.trim() ||
  "https://agenda-viajes-laes18-api.azurewebsites.net";
const TRAVEL_API_URL =
  process.env.EXPO_PUBLIC_TRAVEL_API_URL?.trim() ||
  "https://agenda-viajes-laes18-api.azurewebsites.net/api";
const TRAVEL_CLIENT_ID = process.env.EXPO_PUBLIC_TRAVEL_CLIENT_ID?.trim() || "";
const TRAVEL_CLIENT_SECRET =
  process.env.EXPO_PUBLIC_TRAVEL_CLIENT_SECRET?.trim() || "";
const MOVIES_API_URL =
  process.env.EXPO_PUBLIC_MOVIES_API_URL?.trim() ||
  "https://cineteca-api-12771576319.us-central1.run.app/api";

export type ScheduledTripStatus = "planeado" | "en curso";

export type ScheduledTrip = {
  id: number | string;
  destino: string;
  pais: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion?: string | null;
  estado: ScheduledTripStatus;
  presupuesto?: number | string | null;
  moneda?: string | null;
  created_at?: string;
};

export type CreateScheduledTripInput = {
  destino: string;
  pais: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion: string;
  estado: ScheduledTripStatus;
  presupuesto: number;
  moneda: string;
};

export type Movie = {
  id: number | string;
  titulo: string;
  anio: number;
  genero: string;
  sinopsis?: string | null;
  poster_url?: string | null;
  calificacion?: number | string | null;
  visualizaciones?: number | null;
  reviews_count?: number | null;
  reviews_avg_calificacion?: number | string | null;
};

export type MovieReviewInput = {
  autor: string;
  calificacion: number;
  comentario?: string;
};

let travelToken = "";
let travelTokenExpiresAt = 0;

function getErrorMessage(payload: any, fallback: string) {
  if (payload?.errors) {
    const details = Object.values(payload.errors)
      .flat()
      .filter(Boolean)
      .join(" ");
    if (details) return `${payload.message ?? fallback} ${details}`;
  }
  return payload?.message ?? payload?.error ?? fallback;
}

async function parseResponse(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `${fallback} (HTTP ${response.status})`));
  }
  return payload;
}

async function getTravelToken() {
  if (travelToken && Date.now() < travelTokenExpiresAt) return travelToken;
  if (!TRAVEL_CLIENT_ID || !TRAVEL_CLIENT_SECRET) {
    throw new Error(
      "Faltan EXPO_PUBLIC_TRAVEL_CLIENT_ID y EXPO_PUBLIC_TRAVEL_CLIENT_SECRET en el archivo .env."
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: TRAVEL_CLIENT_ID,
    client_secret: TRAVEL_CLIENT_SECRET,
    scope: "integraciones.programados.read integraciones.viajes.write",
  });

  let response: Response;
  try {
    response = await fetch(`${TRAVEL_OAUTH_URL}/oauth/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
  } catch {
    throw new Error("No se pudo conectar con la API de Agenda de Viajes.");
  }

  const payload = await parseResponse(response, "No se pudo obtener el token de viajes.");
  if (!payload.access_token) throw new Error("La API de viajes no devolvió un token válido.");

  travelToken = String(payload.access_token);
  travelTokenExpiresAt = Date.now() + Math.max(Number(payload.expires_in ?? 3600) - 60, 60) * 1000;
  return travelToken;
}

async function travelRequest(path: string, options: RequestInit = {}) {
  const token = await getTravelToken();
  let response: Response;
  try {
    response = await fetch(`${TRAVEL_API_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error("No se pudo conectar con la API de Agenda de Viajes.");
  }
  return parseResponse(response, "La API de viajes rechazó la solicitud.");
}

export async function getScheduledTrips(filters: {
  estado?: ScheduledTripStatus;
  fechaDesde?: string;
  fechaHasta?: string;
} = {}): Promise<ScheduledTrip[]> {
  const params = new URLSearchParams({ per_page: "50" });
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.fechaDesde) params.set("fecha_desde", filters.fechaDesde);
  if (filters.fechaHasta) params.set("fecha_hasta", filters.fechaHasta);
  const payload = await travelRequest(
    `/integraciones/v1/programados/viajes?${params.toString()}`
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function createScheduledTrip(input: CreateScheduledTripInput) {
  await travelRequest("/integraciones/v1/programados/viajes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function movieRequest(path: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${MOVIES_API_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error("No se pudo conectar con la API de CineTeca.");
  }
  return parseResponse(response, "La API de CineTeca rechazó la solicitud.");
}

export async function getMovieRanking(order: "valoradas" | "vistas") {
  const payload = await movieRequest(`/publico/peliculas/ranking?orden=${order}&limit=20`);
  return (Array.isArray(payload.data) ? payload.data : []) as Movie[];
}

export async function createMovieReview(movieId: Movie["id"], input: MovieReviewInput) {
  await movieRequest(`/publico/peliculas/${encodeURIComponent(String(movieId))}/reviews`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
