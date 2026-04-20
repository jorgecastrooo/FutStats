import React, { useRef } from 'react';
import { Animated, Text, StyleSheet, Pressable } from 'react-native';

const CustomButtonNoBack = ({ buttonText, handleClick }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={handleClick}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={styles.pressable}
    >
      <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.buttonText}>{buttonText}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  button: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
width:'auto',
    alignItems: 'center',
  },
  buttonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
  },
  hintText: {
    color: '#666',
    marginTop: 15,
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default CustomButtonNoBack;
