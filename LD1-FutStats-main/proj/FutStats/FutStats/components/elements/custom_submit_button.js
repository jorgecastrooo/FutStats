import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SubmitButton = ({ 
  loading, 
  handleSubmit, 
  loadingText = 'Registrando...', 
  defaultText = 'Registrar' 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 1.03,  
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedTouchable 
      style={[
        styles.button, 
        loading && styles.buttonDisabled,
        { transform: [{ scale: scaleAnim }] }
      ]}
      onPress={handleSubmit}
      disabled={loading}
      onMouseEnter={Platform.OS === 'web' ? handleHoverIn : undefined}
      onMouseLeave={Platform.OS === 'web' ? handleHoverOut : undefined}
    >
      <Text style={styles.buttonText}>
        {loading ? loadingText : defaultText}
      </Text>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 8,     
    backgroundColor: '#23722a',
    padding: 8,            
    borderRadius: 20,      
    alignItems: 'center',
    width: '60%',    
    height: 42,    
    justifyContent: 'center', 
    alignSelf: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#1a541f',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,        
    fontWeight: 'bold',
  },
});

export default SubmitButton;