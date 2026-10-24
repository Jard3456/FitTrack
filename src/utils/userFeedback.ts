import { Alert, Platform } from "react-native";

export function showUserFeedback(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export function confirmUserAction(
  title: string,
  message: string,
  confirmLabel = "Continuar",
  destructive = false
): Promise<boolean> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (confirmed: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(confirmed);
    };

    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: () => finish(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => finish(true),
        },
      ],
      { cancelable: true, onDismiss: () => finish(false) }
    );
  });
}
