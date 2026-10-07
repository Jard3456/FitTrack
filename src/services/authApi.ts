import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "./apiConfig";

const SESSION_STORAGE_KEY = "fittrack.auth.session";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "usuario" | "entrenador" | "administrador";
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export class AuthApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return body?.message ?? body?.error;
  } catch {
    return undefined;
  }
}

function normalizeSession(payload: any): AuthSession {
  const user = payload?.user ?? payload;
  const token = payload?.token ?? payload?.accessToken;

  if (!token || !user?.id || !user?.email) {
    throw new AuthApiError(
      "El servidor no devolvió una sesión de usuario válida."
    );
  }

  return {
    token: String(token),
    user: {
      id: String(user.id),
      name: String(user.name ?? "Usuario"),
      email: String(user.email),
      role:
        user.role === "entrenador" || user.role === "administrador"
          ? user.role
          : "usuario",
    },
  };
}

async function requestAuth(
  path: string,
  body: Record<string, string>
): Promise<AuthSession> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      "No se pudo conectar con el servidor. Verifica la URL y que el backend esté encendido."
    );
  }

  if (!response.ok) {
    const detail = await getErrorMessage(response);
    throw new AuthApiError(
      detail ?? "No se pudo completar la autenticación.",
      response.status
    );
  }

  return normalizeSession(await response.json());
}

export async function login(email: string, password: string) {
  const session = await requestAuth("/auth/login", { email, password });
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function register(
  name: string,
  email: string,
  password: string
) {
  const session = await requestAuth("/auth/register", {
    name,
    email,
    password,
  });
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function getStoredSession(): Promise<AuthSession | null> {
  const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!storedSession) return null;

  try {
    const session = JSON.parse(storedSession) as AuthSession;
    if (!session?.token || !session?.user?.id || !session?.user?.email) {
      throw new Error("Sesión inválida");
    }

    return {
      ...session,
      user: {
        ...session.user,
        role:
          session.user.role === "entrenador" ||
          session.user.role === "administrador"
            ? session.user.role
            : "usuario",
      },
    };
  } catch {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function logout() {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}
