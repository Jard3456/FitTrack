import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>

      {/* Encabezado */}
      <LinearGradient
        colors={["#2563EB", "#1D4ED8"]}
        style={styles.header}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.welcome}>Hola 👋</Text>

        <Text style={styles.title}>Bienvenido a</Text>

        <Text style={styles.appName}>FITTRACK</Text>

        <Text style={styles.slogan}>
          Entrena • Registra • Supérate
        </Text>
      </LinearGradient>

      {/* Motivación */}

      <View style={styles.card}>

        <Text style={styles.quote}>
          "Cada entrenamiento te acerca a tu mejor versión."
        </Text>

      </View>

      {/* Botón */}

      <TouchableOpacity style={styles.button}>

        <Ionicons
          name="barbell"
          size={22}
          color="white"
        />

        <Text style={styles.buttonText}>
          Comenzar entrenamiento
        </Text>

      </TouchableOpacity>

      {/* Accesos rápidos */}

      <Text style={styles.section}>
        Accesos rápidos
      </Text>

      <View style={styles.grid}>

        <View style={styles.box}>

          <Ionicons
            name="barbell"
            size={35}
            color="#2563EB"
          />

          <Text style={styles.boxText}>
            Rutinas
          </Text>

        </View>

        <View style={styles.box}>

          <Ionicons
            name="stats-chart"
            size={35}
            color="#2563EB"
          />

          <Text style={styles.boxText}>
            Progreso
          </Text>

        </View>

        <View style={styles.box}>

          <Ionicons
            name="person"
            size={35}
            color="#2563EB"
          />

          <Text style={styles.boxText}>
            Perfil
          </Text>

        </View>

        <View style={styles.box}>

          <Ionicons
            name="fitness"
            size={35}
            color="#2563EB"
          />

          <Text style={styles.boxText}>
            Ejercicios
          </Text>

        </View>

      </View>

      {/* Estadísticas */}

      <Text style={styles.section}>
        Resumen
      </Text>

      <View style={styles.stats}>

        <View style={styles.statCard}>
          <Text style={styles.number}>4</Text>
          <Text>Rutinas</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.number}>20</Text>
          <Text>Ejercicios</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.number}>Meta</Text>
          <Text>Ganar masa</Text>
        </View>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#F4F6F9"
  },

  header: {
  backgroundColor: "#111827",
  alignItems: "center",
  justifyContent: "center",
  paddingTop: 60,
  paddingBottom: 50,
  borderBottomLeftRadius: 40,
  borderBottomRightRadius: 40,
},
logoContainer: {
  width: 170,
  height: 170,
  borderRadius: 85,
  backgroundColor: "#fe7904",
  justifyContent: "center",
  alignItems: "center",
  elevation: 12,
  marginBottom: 20,
},
  logo:{
    width:180,
    height:180,
  },

  welcome:{
    color:"white",
    fontSize:22,
    marginTop:5,
  },

  title:{
    color:"white",
    fontSize:22,
  },

  appName:{
    color:"white",
    fontSize:40,
    fontWeight:"bold",
  },

  slogan:{
    color:"white",
    fontSize:16,
    marginTop:5,
  },

  card:{
    backgroundColor:"white",
    margin:20,
    padding:20,
    borderRadius:18,
    elevation:5,
  },

  quote:{
    textAlign:"center",
    fontSize:18,
    fontStyle:"italic",
    color:"#555",
  },

  button:{
    marginHorizontal:20,
    backgroundColor:"#2563EB",
    borderRadius:15,
    padding:18,
    flexDirection:"row",
    justifyContent:"center",
    alignItems:"center",
  },

  buttonText:{
    color:"white",
    marginLeft:10,
    fontSize:18,
    fontWeight:"bold",
  },

  section:{
    fontSize:24,
    fontWeight:"bold",
    marginHorizontal:20,
    marginTop:30,
    marginBottom:15,
  },

  grid:{
    flexDirection:"row",
    flexWrap:"wrap",
    justifyContent:"space-evenly",
  },

  box:{
    width:"42%",
    backgroundColor:"white",
    alignItems:"center",
    padding:20,
    borderRadius:20,
    marginBottom:20,
    elevation:5,
  },

  boxText:{
    marginTop:10,
    fontWeight:"bold",
    fontSize:16,
  },

  stats:{
    flexDirection:"row",
    justifyContent:"space-evenly",
    marginBottom:40,
  },

  statCard:{
    backgroundColor:"white",
    padding:20,
    borderRadius:18,
    width:100,
    alignItems:"center",
    elevation:5,
  },

  number:{
    fontSize:22,
    fontWeight:"bold",
    color:"#5685eb",
  }

});