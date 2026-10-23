import React, { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  children: ReactNode;
};

export default function ResponsiveScreen({ children }: Props) {
  return <View style={styles.frame}>{children}</View>;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
    backgroundColor: "#F4F6F9",
  },
});
