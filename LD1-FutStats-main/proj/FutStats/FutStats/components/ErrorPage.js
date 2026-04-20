import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  TouchableOpacity, 
  Animated, 
  Easing, 
  Linking
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const ErrorPage = ({ 
  errorMessage, 
  onRetry, 
  backgroundImage, 
  showRetryTimer,
  retryAfter,
  isSubscriptionError
}) => {
  const navigation = useNavigation();
  const [retryCountdown, setRetryCountdown] = useState(retryAfter || 0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const rotationCount = useRef(0);
  const totalRotations = 30;


  useEffect(() => {
    const animateRotation = () => {
      if (rotationCount.current < totalRotations) {
        rotationCount.current += 1;
        
        Animated.timing(spinAnim, {
          toValue: rotationCount.current * 360,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true
        }).start(() => {
          if (rotationCount.current < totalRotations) {
            animateRotation();
          }
        });
      }
    };

    animateRotation();
    
    return () => {
      spinAnim.stopAnimation();
    };
  }, []);


  useEffect(() => {
    if (showRetryTimer && retryAfter > 0) {
      const interval = setInterval(() => {
        setRetryCountdown(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showRetryTimer, retryAfter]);

  return (
    <ImageBackground 
      source={backgroundImage || require('../imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')} 
      style={styles.backgroundImage}
      blurRadius={5}
    >
      <View style={styles.overlay}>
        {isSubscriptionError ? (
          <View style={[styles.card, styles.subscriptionCard]}>
            <View style={styles.headerContainer}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Ionicons name="lock-closed" size={40} color="white" />
            </View>
            
            <Text style={styles.cardTitle}>Conteúdo Exclusivo</Text>
            <Text style={styles.cardText}>Desbloqueie todos os recursos do aplicativo com uma assinatura premium.</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.secondaryButtonText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => Linking.openURL('https://www.football-data.org/coverage')}
              >
                <Text style={styles.primaryButtonText}>Assinar Agora</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ) : showRetryTimer ? (
          <View style={[styles.card, styles.retryCard]}>
            <Animated.View 
              style={{
                transform: [{
                  rotate: spinAnim.interpolate({
                    inputRange: [0, 360 * totalRotations],
                    outputRange: ['0deg', `${360 * totalRotations}deg`]
                  })
                }]
              }}
            >
              <Ionicons name="football" size={60} color="white" />
            </Animated.View>
            <Text style={styles.cardTitle}>Processando...</Text>
            <Text style={styles.cardText}>Aguarde enquanto estabilizamos a conexão</Text>
            <Text style={styles.countdownText}>{retryCountdown}s</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Ionicons name="warning" size={50} color="white" style={styles.icon}/>
            <Text style={styles.cardTitle}>Ocorreu um erro</Text>
            <Text style={styles.cardText}>{errorMessage}</Text>
            
            {onRetry && (
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={onRetry}
              >
                <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
                <Ionicons name="refresh" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
  },
  card: {
    width: '90%',
    maxWidth: 400,
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
  },
  cardTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 12,
  },
  countdownText: {
    fontSize: 40,
    color: 'white',
    marginTop: 20,
  }
});

export default ErrorPage;
