import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ErrorMessage = ({ message, visible }) => {
  if (!visible || !message) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="warning" size={20} color="#FF3B30" style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FF3B30',
    fontSize: 14,
    flex: 1,
  },
});

export default ErrorMessage;