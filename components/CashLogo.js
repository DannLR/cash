import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Marca compacta Cash: inicial proprietária com sinal de crescimento. */
export default function CashLogo({ size = 38, style }) {
  return (
    <View
      accessibilityLabel="Cash"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Math.round(size * 0.32) },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.59, lineHeight: size * 0.72 }]}>C</Text>
      <View style={[styles.growth, { right: size * 0.12, bottom: size * 0.14 }]}>
        <Ionicons name="trending-up" size={size * 0.34} color="#E8D9FF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#7956B5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#4E347A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -2,
    marginLeft: -2,
    fontFamily: 'Space Grotesk, sans-serif',
  },
  growth: {
    position: 'absolute',
    backgroundColor: '#7956B5',
    borderRadius: 4,
    paddingLeft: 1,
    paddingTop: 1,
  },
});
