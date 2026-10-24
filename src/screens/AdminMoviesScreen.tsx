import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { showUserFeedback } from "../utils/userFeedback";

import {
  createMovieReview,
  getMovieRanking,
  Movie,
} from "../services/integrationsApi";

type Ranking = "valoradas" | "vistas";

function MovieCard({ movie, onReview }: { movie: Movie; onReview: () => void }) {
  return (
    <View style={styles.card}>
      {movie.poster_url ? <Image source={{ uri: movie.poster_url }} style={styles.poster} /> : <View style={styles.posterPlaceholder}><Ionicons name="film-outline" size={26} color="#64748B" /></View>}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>{movie.titulo}</Text>
        <Text style={styles.movieMeta}>{movie.anio} · {movie.genero}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.rating}><Ionicons name="star" size={14} color="#F59E0B" /> {movie.calificacion ?? "—"}</Text>
          <Text style={styles.views}><Ionicons name="eye-outline" size={14} color="#64748B" /> {movie.visualizaciones ?? 0}</Text>
        </View>
        <TouchableOpacity style={styles.reviewButton} onPress={onReview} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#1D4ED8" />
          <Text style={styles.reviewButtonText}>Registrar review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminMoviesScreen() {
  const [ranking, setRanking] = useState<Ranking>("valoradas");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMovies = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setMovies(await getMovieRanking(ranking));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las películas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ranking]);

  useEffect(() => { loadMovies(); }, [loadMovies]);

  const openReview = (movie: Movie) => {
    setSelectedMovie(movie);
    setAuthor("");
    setRating("");
    setComment("");
  };

  const saveReview = async () => {
    const value = Number(rating);
    if (!selectedMovie || !author.trim() || !Number.isInteger(value) || value < 1 || value > 10) {
      showUserFeedback("Datos incompletos", "Indica el autor y una calificación entera entre 1 y 10.");
      return;
    }
    setSaving(true);
    try {
      await createMovieReview(selectedMovie.id, { autor: author.trim(), calificacion: value, comentario: comment.trim() });
      setSelectedMovie(null);
      showUserFeedback("Review registrada", "La review fue enviada correctamente.");
      await loadMovies(true);
    } catch (saveError) {
      showUserFeedback("No se pudo registrar", saveError instanceof Error ? saveError.message : "La API rechazó la review.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.muted}>Cargando películas...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MovieCard movie={item} onReview={() => openReview(item)} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMovies(true)} tintColor="#2563EB" />}
        contentContainerStyle={movies.length ? styles.list : styles.emptyList}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>CineTeca</Text>
            <Text style={styles.subtitle}>Consulta los rankings y registra reviews de películas.</Text>
            <View style={styles.tabs}>
              {([ ["valoradas", "Más valoradas", "star"], ["vistas", "Más vistas", "eye"] ] as Array<[Ranking, string, keyof typeof Ionicons.glyphMap]>).map(([value, label, icon]) => (
                <TouchableOpacity key={value} style={[styles.tab, ranking === value && styles.selectedTab]} onPress={() => setRanking(value)}>
                  <Ionicons name={icon} size={18} color={ranking === value ? "#FFFFFF" : "#64748B"} />
                  <Text style={[styles.tabText, ranking === value && styles.selectedTabText]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <View style={styles.errorCard}><Ionicons name="alert-circle-outline" size={20} color="#B91C1C" /><Text style={styles.errorText}>{error}</Text></View> : null}
            <Text style={styles.sectionTitle}>{ranking === "valoradas" ? "Películas más valoradas" : "Películas con más visualizaciones"}</Text>
          </>
        }
        ListEmptyComponent={<View style={styles.emptyCard}><Ionicons name="film-outline" size={40} color="#94A3B8" /><Text style={styles.emptyTitle}>No hay películas disponibles</Text></View>}
      />

      <Modal visible={Boolean(selectedMovie)} transparent animationType="slide" onRequestClose={() => !saving && setSelectedMovie(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><View style={styles.modalTitleContent}><Text style={styles.modalTitle}>Registrar review</Text><Text style={styles.modalMovie}>{selectedMovie?.titulo}</Text></View><TouchableOpacity onPress={() => !saving && setSelectedMovie(null)}><Ionicons name="close" size={26} color="#334155" /></TouchableOpacity></View>
            <ScrollView>
              <Text style={styles.formLabel}>Autor</Text><TextInput style={styles.formInput} value={author} onChangeText={setAuthor} placeholder="Tu nombre" placeholderTextColor="#94A3B8" />
              <Text style={styles.formLabel}>Calificación (1-10)</Text><TextInput style={styles.formInput} value={rating} onChangeText={setRating} keyboardType="numeric" placeholder="9" placeholderTextColor="#94A3B8" />
              <Text style={styles.formLabel}>Comentario (opcional)</Text><TextInput style={[styles.formInput, styles.multiline]} value={comment} onChangeText={setComment} multiline placeholder="Escribe tu opinión" placeholderTextColor="#94A3B8" />
              <TouchableOpacity style={styles.primaryButton} onPress={saveReview} disabled={saving}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Enviar review</Text>}</TouchableOpacity>
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
  muted: { color: "#64748B", marginTop: 8 },
  title: { color: "#111827", fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 21, marginTop: 6 },
  tabs: { flexDirection: "row", backgroundColor: "#E2E8F0", borderRadius: 14, padding: 4, marginTop: 20, gap: 4 },
  tab: { flex: 1, minHeight: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  selectedTab: { backgroundColor: "#2563EB" },
  tabText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  selectedTabText: { color: "#FFFFFF" },
  sectionTitle: { color: "#334155", fontSize: 18, fontWeight: "bold", marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 13, marginBottom: 10, flexDirection: "row", elevation: 2 },
  poster: { width: 76, height: 108, borderRadius: 9, backgroundColor: "#E2E8F0" },
  posterPlaceholder: { width: 76, height: 108, borderRadius: 9, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  movieInfo: { flex: 1, marginLeft: 12 },
  movieTitle: { color: "#111827", fontSize: 16, fontWeight: "bold" },
  movieMeta: { color: "#64748B", fontSize: 12, marginTop: 5 },
  statsRow: { flexDirection: "row", gap: 14, marginTop: 9 },
  rating: { color: "#92400E", fontSize: 12, fontWeight: "bold" },
  views: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  reviewButton: { alignSelf: "flex-start", backgroundColor: "#EFF6FF", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 11 },
  reviewButtonText: { color: "#1D4ED8", fontSize: 12, fontWeight: "bold" },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, flexDirection: "row", marginTop: 15 },
  errorText: { color: "#991B1B", flex: 1, marginLeft: 8, lineHeight: 18 },
  emptyCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 28, marginTop: 4 },
  emptyTitle: { color: "#334155", fontSize: 16, fontWeight: "bold", marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 12 },
  modalCard: { width: "100%", maxWidth: 760, alignSelf: "center", backgroundColor: "#F8FAFC", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "75%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  modalTitleContent: { flex: 1 },
  modalTitle: { color: "#111827", fontSize: 24, fontWeight: "bold" },
  modalMovie: { color: "#64748B", fontSize: 15, marginTop: 4 },
  formLabel: { color: "#374151", fontWeight: "600", marginTop: 12, marginBottom: 6 },
  formInput: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 11, padding: 12, color: "#111827", fontSize: 15 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  primaryButton: { minHeight: 50, backgroundColor: "#2563EB", borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 18, marginBottom: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
