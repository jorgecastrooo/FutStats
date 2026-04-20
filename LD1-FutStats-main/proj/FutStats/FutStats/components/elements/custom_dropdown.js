import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, FlatList, Modal, TouchableWithoutFeedback } from 'react-native';

const CustomDropdown = memo(({ 
  style,
  placeholder,
  error,
  value = null,
  options = [],
  onSelect,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const dropdownRef = useRef(null);

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
          outputRange: [15, -15]
        })
      },
      { 
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.8]
        }) 
      }
    ]
  }), [animatedValue]);

  const labelColor = useMemo(() => 
    error ? '#ff4444' : isFocused ? '#ffffff' : '#666',
  [error, isFocused]);

  const inputColor = useMemo(() => 
    error ? '#ff4444' : '#ffffff',
  [error]);

  const handleSelect = (item) => {
    onSelect && onSelect(item);
    setIsOpen(false);
    setIsFocused(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    setIsFocused(!isOpen);
  };

  const handleContainerPress = () => {
    dropdownRef.current?.measure((x, y, width, height, pageX, pageY) => {
      toggleDropdown();
    });
  };

  return (
    <TouchableWithoutFeedback onPress={handleContainerPress}>
      <View style={[styles.container, style]} ref={dropdownRef}>
        <Animated.Text 
          style={[
            styles.placeholderLabel,
            labelTransform,
            { 
              color: labelColor,
              pointerEvents: 'none' // This prevents the Text from blocking touches
            }
          ]}
        >
          {placeholder}
        </Animated.Text>
        
        <TouchableOpacity 
          style={[styles.input, { borderBottomColor: isFocused ? '#ffffff' : '#666' }]} 
          onPress={toggleDropdown}
          activeOpacity={0.8}
        >
          <Text style={[styles.selectedText, { color: inputColor }]}>
            {value ? value.label : ''}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>

        <View style={[
          styles.underline,
          isFocused && styles.focusedUnderline,
          error && styles.errorUnderline
        ]} />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsOpen(false)}
          >
            <View style={styles.dropdownContainer}>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.optionItem} 
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.optionText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 3,
    paddingTop: 6,
    position: 'relative',
  },
  placeholderLabel: {
    fontSize: 14,
    paddingHorizontal: 2,
    position: 'absolute',
    left: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  input: {
    height: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 5,
    borderBottomWidth: 1,
  },
  selectedText: {
    fontSize: 13,
  },
  dropdownIcon: {
    fontSize: 14,
    color: '#ffffff',
  },
  underline: {
    height: 1,
    backgroundColor: '#666',
    marginTop: -1,
  },
  focusedUnderline: {
    backgroundColor: '#ffffff',
  },
  errorUnderline: {
    backgroundColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownContainer: {
    backgroundColor: '#333',
    borderRadius: 5,
    width: '80%',
    maxHeight: 300,
    padding: 10,
  },
  optionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  optionText: {
    fontSize: 16,
    color: '#ffffff',
  },
});

export default CustomDropdown;