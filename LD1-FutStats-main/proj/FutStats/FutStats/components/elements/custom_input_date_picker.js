import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from "react-native";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker-custom.css";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const DataInput = ({ placeholder, value, onChangeText, error, style }) => {
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 150,
      useNativeDriver: true
    }).start();
  }, [isFocused, value, animatedValue]);

  const showDatePicker = () => {
    setIsFocused(true);
    setDatePickerVisibility(true);
  };
  
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    if (date) {
      setSelectedDate(date);
      onChangeText?.(formatDateToDDMMYYYY(date));
      setIsFocused(true);
    } else {
      setIsFocused(false);
    }
    hideDatePicker();
  };

  const isWeb = Platform.OS === 'web';

  const labelTransform = useMemo(() => ({
    transform: [
      { 
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [10, -5]
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

  const underlineStyle = useMemo(() => [
    styles.underline,
    isFocused && styles.focusedUnderline,
    error && styles.errorUnderline
  ], [isFocused, error]);

  return (
    <View style={styles.container}>
      <Animated.Text 
        style={[
          styles.placeholderLabel,
          labelTransform,
          { 
            color: labelColor,
            backgroundColor: (isFocused || value),
            paddingHorizontal: 2
          }
        ]}
      >
        {placeholder}
      </Animated.Text>

      {isWeb ? (
        <View style={styles.webPickerContainer}>
          <DatePicker
            selected={selectedDate}
            onChange={handleConfirm}
            onBlur={() => setIsFocused(false)}
            onFocus={() => setIsFocused(true)}
            dateFormat="dd/MM/yyyy"
            maxDate={new Date()}
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={100}
            className="react-datepicker-custom"
            placeholderText=""
            popperPlacement="auto"
            showPopperArrow={false}
            customInput={
              <TouchableOpacity 
                style={[styles.inputContainer, style]} 
                onPress={showDatePicker}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateText, { color: inputColor }]}>
                  {selectedDate ? formatDateToDDMMYYYY(selectedDate) : ""}
                </Text>
              </TouchableOpacity>
            }
          />
        </View>
      ) : (
        <>
          <TouchableOpacity 
            style={[styles.inputContainer, style, error && styles.errorInput]} 
            onPress={showDatePicker}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateText, { color: inputColor }]}>
              {selectedDate ? formatDateToDDMMYYYY(selectedDate) : ""}
            </Text>
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            display="default"
            onConfirm={handleConfirm}
            onCancel={() => {
              setIsFocused(false);
              hideDatePicker();
            }}
            maximumDate={new Date()}
          />
        </>
      )}

      <View style={underlineStyle} />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const formatDateToDDMMYYYY = (date) => {
  if (!date) return "";
  try {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 3,
    paddingTop: 5,
    position: 'relative',
  },
  placeholderLabel: {
    fontSize: 14,
    position: "absolute",
    zIndex: 1,
    pointerEvents: 'none',
  },
  inputContainer: {
    height: 40,
    justifyContent: 'flex-end',
    paddingBottom: 5,
    marginHorizontal: 5,
  },
  dateText: { 
    fontSize: 14,
    paddingTop: Platform.select({ web: 8, default: 0 }),
    minHeight: 24,
  },
  errorText: { 
    color: "#ff4444", 
    fontSize: 12, 
    marginTop: 4 
  },
  webPickerContainer: {
    position: "relative",
    width: "100%",
    zIndex: 1,
  },
  underline: {
    height: 1,
    backgroundColor: "#666",
    marginTop: 0,
  },
  focusedUnderline: {
    backgroundColor: "#ffffff",
  },
  errorInput: {
    borderColor: "#ff4444",
  },
  errorUnderline: {
    backgroundColor: "#ff4444",
  },
});

export default DataInput;