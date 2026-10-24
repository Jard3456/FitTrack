import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type DropdownOption = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function DropdownField({
  value,
  options,
  onChange,
  placeholder = "Seleccionar una opción",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedOption?.label ?? placeholder}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !selectedOption && styles.placeholder]} numberOfLines={1}>
          {selectedOption?.label ?? placeholder}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar opciones"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Selecciona tu objetivo</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={() => setOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={23} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView bounces={false}>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => selectOption(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.selectedOption,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View style={styles.optionIcon}>
                      <Ionicons
                        name={option.icon ?? "fitness-outline"}
                        size={19}
                        color={selected ? "#2563EB" : "#64748B"}
                      />
                    </View>
                    <Text style={[styles.optionLabel, selected && styles.selectedOptionLabel]}>
                      {option.label}
                    </Text>
                    {selected ? <Ionicons name="checkmark-circle" size={21} color="#2563EB" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  triggerPressed: { borderColor: "#60A5FA", backgroundColor: "#F8FAFC" },
  disabled: { opacity: 0.55 },
  value: { color: "#1E293B", flex: 1, fontSize: 15, fontWeight: "600" },
  placeholder: { color: "#94A3B8", fontWeight: "400" },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    elevation: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  sheetHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: { color: "#0F172A", fontSize: 17, fontWeight: "700" },
  option: {
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginVertical: 3,
  },
  selectedOption: { backgroundColor: "#EFF6FF" },
  optionPressed: { backgroundColor: "#F1F5F9" },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { color: "#334155", flex: 1, fontSize: 15, fontWeight: "600" },
  selectedOptionLabel: { color: "#1D4ED8" },
});
