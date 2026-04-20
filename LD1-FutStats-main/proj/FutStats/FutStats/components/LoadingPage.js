import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ImageBackground } from 'react-native';

const LoadingPage = ({ message, backgroundImage }) => {
  return (
    <ImageBackground 
      source={backgroundImage || require('../imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')} 
      style={styles.backgroundImage}
    >
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>{message || 'Carregando...'}</Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },
});

export default LoadingPage;