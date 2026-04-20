import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { View, Text, TextInput, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';

const CustomInput = memo(({ 
  style,
  label,
  placeholder,
  error,
  value = '',
  onChangeText,
  keyboardType,
  secureTextEntry,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 150,
      useNativeDriver: true
    }).start();
  }, [isFocused, value, animatedValue]);

  const labelTransform = useMemo(() => ({
    transform: [
      { 
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [10, -5] // Reduzi de [15, -15] para [10, -5]
        })
      },
      { 
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.8]
        }) 
      }
    ],
    opacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1]
    })
  }), [animatedValue]);

  const labelColor = useMemo(() => 
    error ? '#ff4444' : isFocused ? '#ffffff' : '#666',
  [error, isFocused]);

  const inputColor = useMemo(() => 
    error ? '#ff4444' : '#ffffff',
  [error]);

  const underlineStyle = useMemo(() => [
    styles.underline,
    isFocused && styles.focusedUnderline,
    error && styles.errorUnderline
  ], [isFocused, error]);

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <TouchableWithoutFeedback onPress={handleContainerPress}>
      <View style={[styles.container, style]}>
        <Animated.Text 
          style={[
            styles.placeholderLabel,
            labelTransform,
            { 
              color: labelColor,
              backgroundColor: 'transparent',
              zIndex: 1,
              paddingHorizontal: 2,
              marginLeft: 5,
            }
          ]}
          pointerEvents="none"
        >
          {placeholder}
        </Animated.Text>
        
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: inputColor },
            error && styles.errorInput,
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          value={value}
          placeholder=""
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={`Input para ${placeholder}`}
        />
        
        <View style={underlineStyle} />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </TouchableWithoutFeedback>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 5,
  },
  placeholderLabel: {
    fontSize: 14,
    position: 'absolute',
    left: 0,
    fontWeight: '500',
  },
  input: {
    height: 50,
    fontSize: 13,
    paddingTop: 20,
    paddingHorizontal: 5,
    borderBottomWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
  },
  underline: {
    height: 1.5,
    backgroundColor: '#E0E0E0',
    marginTop: -1.5,
  },
  focusedUnderline: {
    backgroundColor: '#ffffff', 
  },
  errorInput: {
    borderColor: '#ff4444',
  },
  errorUnderline: {
    backgroundColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default CustomInput;