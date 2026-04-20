import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

const FadeInUpView = ({ children, duration = 1000, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default FadeInUpView;
