import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  createScheduledTrip,
  getScheduledTrips,
  ScheduledTrip,
  ScheduledTripStatus,
} from "../services/integrationsApi";

type TripForm = {
  destino: string;
  pais: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion: string;
  estado: ScheduledTripStatus;
  presupuesto: string;
  moneda: string;
};

const emptyForm: TripForm = {
  destino: "",
  pais: "",
  fecha_inicio: "",
  fecha_fin: "",
  descripcion: "",
  estado: "planeado",
  presupuesto: "",
  moneda: "GTQ",
};

const statusLabel: Record<ScheduledTripStatus, string> = {
  planeado: "Planeado",
  "en curso": "En curso",
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : new Date();
}

function CalendarPicker({
  value,
  minDate,
  onChange,
}: {
  value: string;
  minDate?: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = parseLocalDate(value);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const today = formatLocalDate(new Date());
  const monthLabel = visibleMonth.toLocaleDateString("es-GT", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (value) {
      const date = parseLocalDate(value);
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [value]);

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={styles.calendarArrow}
          onPress={() => setVisibleMonth(new Date(year, month - 1, 1))}
        >
          <Ionicons name="chevron-back" size={21} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.calendarMonth}>{monthLabel}</Text>
        <TouchableOpacity
          style={styles.calendarArrow}
          onPress={() => setVisibleMonth(new Date(year, month + 1, 1))}
        >
          <Ionicons name="chevron-forward" size={21} color="#2563EB" />
        </TouchableOpacity>
      </View>
      <View style={styles.calendarWeekRow}>
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
          <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.calendarDay} />;
          const dateValue = formatLocalDate(new Date(year, month, day));
          const disabled = Boolean(minDate && dateValue < minDate);
          const selected = dateValue === value;
          const isToday = dateValue === today;
          return (
            <TouchableOpacity
              key={dateValue}
              style={styles.calendarDay}
              onPress={() => onChange(dateValue)}
              disabled={disabled}
            >
              <View style={[styles.calendarDayInner, isToday && styles.calendarToday, selected && styles.calendarSelected]}>
                <Text style={[styles.calendarDayText, isToday && styles.calendarTodayText, selected && styles.calendarSelectedText, disabled && styles.calendarDisabledText]}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {minDate ? <Text style={styles.calendarHint}>La fecha final no puede ser anterior a {minDate}.</Text> : null}
    </View>
  );
}

function TripCard({ trip }: { trip: ScheduledTrip }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.destinationRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="airplane-outline" size={21} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.destination}>{trip.destino}</Text>
            <Text style={styles.country}>{trip.pais}</Text>
          </View>
        </View>
        <Text style={[styles.status, trip.estado === "en curso" && styles.inProgress]}>
          {statusLabel[trip.estado]}
        </Text>
      </View>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={17} color="#64748B" />
        <Text style={styles.dateText}>{trip.fecha_inicio} → {trip.fecha_fin}</Text>
      </View>
      {trip.descripcion ? <Text style={styles.description}>{trip.descripcion}</Text> : null}
      {trip.presupuesto !== null && trip.presupuesto !== undefined ? (
        <Text style={styles.budget}>
          Presupuesto: {trip.presupuesto} {trip.moneda ?? ""}
        </Text>
      ) : null}
    </View>
  );
}

export default function AdminTripsScreen() {
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [statusFilter, setStatusFilter] = useState<"todos" | ScheduledTripStatus>("todos");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterCalendarTarget, setFilterCalendarTarget] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<"fecha_inicio" | "fecha_fin" | null>(null);
  const [form, setForm] = useState<TripForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadTrips = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setTrips(await getScheduledTrips({
        estado: statusFilter === "todos" ? undefined : statusFilter,
        fechaDesde: fromDate.trim() || undefined,
        fechaHasta: toDate.trim() || undefined,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los viajes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, statusFilter, toDate]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const updateForm = (field: keyof TripForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectFilterDate = (target: "from" | "to", value: string) => {
    if (target === "from") {
      setFromDate(value);
      if (toDate && toDate < value) setToDate("");
    } else {
      setToDate(value);
    }
    setFilterCalendarTarget(null);
  };

  const selectDate = (field: "fecha_inicio" | "fecha_fin", value: string) => {
    setForm((current) => {
      if (field === "fecha_inicio" && current.fecha_fin && current.fecha_fin < value) {
        return { ...current, fecha_inicio: value, fecha_fin: "" };
      }
      return { ...current, [field]: value };
    });
    setCalendarTarget(null);
  };

  const saveTrip = async () => {
    const budget = Number(form.presupuesto);
    if (!form.destino.trim() || !form.pais.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_inicio) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_fin) || form.fecha_fin < form.fecha_inicio ||
      !Number.isFinite(budget) || budget < 0) {
      if (form.fecha_fin && form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
        Alert.alert("Fechas no válidas", "La fecha final debe ser igual o posterior a la fecha inicial.");
        return;
      }
      Alert.alert("Datos incompletos", "Completa destino, país, fechas YYYY-MM-DD y un presupuesto válido.");
      return;
    }
    setSaving(true);
    try {
      await createScheduledTrip({ ...form, presupuesto: budget, moneda: form.moneda.trim() || "GTQ" });
      setModalVisible(false);
      setForm(emptyForm);
      await loadTrips(true);
      Alert.alert("Viaje registrado", "El viaje programado fue creado correctamente.");
    } catch (saveError) {
      Alert.alert("No se pudo registrar", saveError instanceof Error ? saveError.message : "La API rechazó el viaje.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.muted}>Cargando viajes...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TripCard trip={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTrips(true)} tintColor="#2563EB" />}
        contentContainerStyle={trips.length ? styles.list : styles.emptyList}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Viajes programados</Text>
            <Text style={styles.subtitle}>Consulta y registra viajes desde la API de Agenda de Viajes.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={21} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Registrar nuevo viaje</Text>
            </TouchableOpacity>
            <Text style={styles.filterTitle}>Filtrar por estado</Text>
            <View style={styles.optionsRow}>
              {(["todos", "planeado", "en curso"] as const).map((option) => (
                <TouchableOpacity key={option} style={[styles.option, statusFilter === option && styles.selectedOption]} onPress={() => setStatusFilter(option)}>
                  <Text style={[styles.optionText, statusFilter === option && styles.selectedOptionText]}>{option === "todos" ? "Todos" : statusLabel[option]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dateFilters}>
              <TouchableOpacity style={styles.filterDateButton} onPress={() => setFilterCalendarTarget("from")}>
                <Ionicons name="calendar-outline" size={17} color="#2563EB" />
                <Text style={fromDate ? styles.filterDateValue : styles.filterDatePlaceholder}>{fromDate || "Desde"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterDateButton} onPress={() => setFilterCalendarTarget("to")}>
                <Ionicons name="calendar-outline" size={17} color="#2563EB" />
                <Text style={toDate ? styles.filterDateValue : styles.filterDatePlaceholder}>{toDate || "Hasta"}</Text>
              </TouchableOpacity>
            </View>
            {filterCalendarTarget ? (
              <View style={styles.filterCalendarCard}>
                <View style={styles.inlineCalendarHeader}>
                  <Text style={styles.inlineCalendarTitle}>
                    {filterCalendarTarget === "from" ? "Filtrar desde" : "Filtrar hasta"}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterCalendarTarget(null)}>
                    <Ionicons name="close-circle-outline" size={23} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <CalendarPicker
                  value={filterCalendarTarget === "from" ? fromDate : toDate}
                  minDate={filterCalendarTarget === "to" ? fromDate : undefined}
                  onChange={(value) => selectFilterDate(filterCalendarTarget, value)}
                />
              </View>
            ) : null}
            <TouchableOpacity style={styles.filterButton} onPress={() => loadTrips()}><Text style={styles.filterButtonText}>Aplicar filtros</Text></TouchableOpacity>
            {error ? <View style={styles.errorCard}><Ionicons name="alert-circle-outline" size={20} color="#B91C1C" /><Text style={styles.errorText}>{error}</Text></View> : null}
            <Text style={styles.sectionTitle}>{trips.length} viajes encontrados</Text>
          </>
        }
        ListEmptyComponent={<View style={styles.emptyCard}><Ionicons name="map-outline" size={40} color="#94A3B8" /><Text style={styles.emptyTitle}>No hay viajes para estos filtros</Text></View>}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => !saving && setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Nuevo viaje</Text><Text style={styles.muted}>Todos los campos se envían a la API.</Text></View><TouchableOpacity onPress={() => !saving && setModalVisible(false)}><Ionicons name="close" size={26} color="#334155" /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {([ ["destino", "Destino"], ["pais", "País"], ["presupuesto", "Presupuesto"], ["moneda", "Moneda"] ] as Array<[keyof TripForm, string]>).map(([field, label]) => (
                <View key={field}><Text style={styles.formLabel}>{label}</Text><TextInput style={styles.formInput} value={form[field]} onChangeText={(value) => updateForm(field, value)} keyboardType={field === "presupuesto" ? "numeric" : "default"} placeholder={label} placeholderTextColor="#94A3B8" /></View>
              ))}
              <Text style={styles.formLabel}>Fecha de inicio</Text>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setCalendarTarget("fecha_inicio")}>
                <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                <Text style={form.fecha_inicio ? styles.datePickerValue : styles.datePickerPlaceholder}>{form.fecha_inicio || "Seleccionar fecha"}</Text>
              </TouchableOpacity>
              <Text style={styles.formLabel}>Fecha de fin</Text>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setCalendarTarget("fecha_fin")}>
                <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                <Text style={form.fecha_fin ? styles.datePickerValue : styles.datePickerPlaceholder}>{form.fecha_fin || "Seleccionar fecha"}</Text>
              </TouchableOpacity>
              {calendarTarget ? (
                <View style={styles.inlineCalendarCard}>
                  <View style={styles.inlineCalendarHeader}>
                    <Text style={styles.inlineCalendarTitle}>
                      {calendarTarget === "fecha_inicio" ? "Selecciona la fecha de inicio" : "Selecciona la fecha de fin"}
                    </Text>
                    <TouchableOpacity onPress={() => setCalendarTarget(null)}>
                      <Ionicons name="close-circle-outline" size={23} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  <CalendarPicker
                    value={form[calendarTarget]}
                    minDate={calendarTarget === "fecha_fin" ? form.fecha_inicio : undefined}
                    onChange={(value) => selectDate(calendarTarget, value)}
                  />
                </View>
              ) : null}
              <Text style={styles.formLabel}>Estado</Text>
              <View style={styles.optionsRow}>{(["planeado", "en curso"] as ScheduledTripStatus[]).map((option) => <TouchableOpacity key={option} style={[styles.option, form.estado === option && styles.selectedOption]} onPress={() => updateForm("estado", option)}><Text style={[styles.optionText, form.estado === option && styles.selectedOptionText]}>{statusLabel[option]}</Text></TouchableOpacity>)}</View>
              <Text style={styles.formLabel}>Descripción</Text><TextInput style={[styles.formInput, styles.multiline]} value={form.descripcion} onChangeText={(value) => updateForm("descripcion", value)} placeholder="Descripción del viaje" placeholderTextColor="#94A3B8" multiline />
              <TouchableOpacity style={styles.primaryButton} onPress={saveTrip} disabled={saving}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Guardar viaje</Text>}</TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  list: { padding: 18, paddingBottom: 30 },
  emptyList: { padding: 18, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F6F9" },
  title: { color: "#111827", fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 21, marginTop: 6 },
  muted: { color: "#64748B", marginTop: 8 },
  primaryButton: { minHeight: 50, backgroundColor: "#2563EB", borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  filterTitle: { color: "#334155", fontWeight: "bold", marginTop: 22, marginBottom: 8 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  selectedOption: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
  optionText: { color: "#475569", fontWeight: "600" },
  selectedOptionText: { color: "#1D4ED8" },
  dateFilters: { flexDirection: "row", gap: 8, marginTop: 10 },
  filterDateButton: { flex: 1, minHeight: 43, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  filterDateValue: { color: "#111827", fontSize: 12 },
  filterDatePlaceholder: { color: "#94A3B8", fontSize: 12 },
  filterCalendarCard: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#BFDBFE", padding: 10, marginTop: 10 },
  filterButton: { alignSelf: "flex-start", backgroundColor: "#E0E7FF", borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9, marginTop: 9 },
  filterButtonText: { color: "#3730A3", fontWeight: "bold" },
  sectionTitle: { color: "#334155", fontSize: 18, fontWeight: "bold", marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  destinationRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 10 },
  destination: { color: "#111827", fontSize: 17, fontWeight: "bold" },
  country: { color: "#64748B", marginTop: 3 },
  status: { color: "#1D4ED8", backgroundColor: "#DBEAFE", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: "bold" },
  inProgress: { color: "#92400E", backgroundColor: "#FEF3C7" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 13 },
  dateText: { color: "#475569", fontSize: 13 },
  description: { color: "#64748B", lineHeight: 19, marginTop: 9 },
  budget: { color: "#15803D", fontWeight: "bold", marginTop: 9 },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, flexDirection: "row", marginTop: 15 },
  errorText: { color: "#991B1B", flex: 1, marginLeft: 8, lineHeight: 18 },
  emptyCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 28, marginTop: 4 },
  emptyTitle: { color: "#334155", fontSize: 16, fontWeight: "bold", marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#F8FAFC", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  modalTitle: { color: "#111827", fontSize: 24, fontWeight: "bold" },
  formLabel: { color: "#374151", fontWeight: "600", marginTop: 12, marginBottom: 6 },
  formInput: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 11, padding: 12, color: "#111827", fontSize: 15 },
  datePickerButton: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 11, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  datePickerValue: { color: "#111827", fontSize: 15 },
  datePickerPlaceholder: { color: "#94A3B8", fontSize: 15 },
  inlineCalendarCard: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#BFDBFE", padding: 10, marginTop: 10 },
  inlineCalendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  inlineCalendarTitle: { color: "#1E3A8A", fontWeight: "bold", flex: 1 },
  multiline: { minHeight: 82, textAlignVertical: "top" },
  calendar: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calendarArrow: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF6FF" },
  calendarMonth: { color: "#1E293B", fontSize: 16, fontWeight: "bold", textTransform: "capitalize" },
  calendarWeekRow: { flexDirection: "row", marginBottom: 4 },
  calendarWeekDay: { width: "14.2857%", textAlign: "center", color: "#64748B", fontSize: 12, fontWeight: "bold" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: { width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center" },
  calendarDayInner: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  calendarDayText: { color: "#334155", fontSize: 14 },
  calendarToday: { borderWidth: 1, borderColor: "#60A5FA" },
  calendarTodayText: { color: "#2563EB", fontWeight: "bold" },
  calendarSelected: { backgroundColor: "#2563EB", borderWidth: 0 },
  calendarSelectedText: { color: "#FFFFFF", fontWeight: "bold" },
  calendarDisabledText: { color: "#CBD5E1" },
  calendarHint: { color: "#64748B", fontSize: 12, marginTop: 10, textAlign: "center" },
});
