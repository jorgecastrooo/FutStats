import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';

const { width, height } = Dimensions.get('window'); 

const Popup = ({
  visible,
  title,
  message,
  type = 'error',
  actions = [],
  onDismiss,
}) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <MaterialCommunityIcons name="alert-circle" size={28} color="#d32f2f" />;
      case 'warning':
        return <MaterialCommunityIcons name="alert" size={28} color="#ed6c02" />;
      case 'info':
        return <MaterialCommunityIcons name="information" size={28} color="#0288d1" />;
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'error':
        return '#d32f2f';
      case 'warning':
        return '#ed6c02';
      case 'info':
        return '#0288d1';
      default:
        return '#d32f2f';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            {getIcon()}
            <Text style={[styles.title, { color: getColor() }]}>{title}</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                style={[styles.button, action.style]}>
                <Text style={styles.buttonText}>{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%', 
    maxWidth: 400, 
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 5,
    borderColor: '#d32f2f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: width > 400 ? 22 : 18, 
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#d32f2f',
    fontFamily: 'System',
  },
  message: {
    fontSize: width > 400 ? 16 : 14,
    color: '#333',
    lineHeight: 22,
    fontFamily: 'System',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: '#c62828',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default Popup;
