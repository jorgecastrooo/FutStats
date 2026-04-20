import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ImageBackground, Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import FadeInUpView from './components/animacao/FadeInUpView';
import CustomInput from './components/elements/custom_input';
import SubmitButton from './components/elements/custom_submit_button';
import CustomButtonNoBack from './components/elements/custom_button_noback';
import Popup from './components/elements/popup_custom';
import logo from './imagens/futstats_logo.png';

const { width, height } = Dimensions.get('window'); // Pegando as dimensões da tela

const Login = ({ authContext }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [showEmptyFieldsError, setShowEmptyFieldsError] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const navigation = useNavigation();

  const switch_resg = () => {
    navigation.navigate('Register');
  };

  const handleSubmit = async () => {
    setErrors({});
    if (!formData.email || !formData.password) {
      setShowEmptyFieldsError(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setShowLoginError(true);
        return;
      }

      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('isAdmin', JSON.stringify(data.user.is_admin));
      await authContext.signIn(data.token, data.user.is_admin);

      const isAdminStored = await AsyncStorage.getItem('isAdmin');
    const isAdmin = JSON.parse(isAdminStored);

    if (isAdmin) {
      navigation.navigate('Admin');
    } else {
      navigation.navigate('home');
    }
    } catch (error) {
      console.error('Erro no login:', error);
      setShowLoginError(true);
    } finally {
      setLoading(false);
    }
  };

  const backback = require('./imagens/hd-soccer-stadium-wallpaper-6198.jpg');

  return (
    <View style={styles.container}>
      <ImageBackground source={backback} resizeMode="cover" style={styles.image}>
        <FadeInUpView style={styles.box}>
          <FadeInUpView>
            <Image source={logo} style={styles.logo} />
          </FadeInUpView>
          <Text style={styles.title}>Bem vindo ao FutStats!!</Text>
          <CustomInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={value => handleChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <CustomInput
            style={styles.input}
            placeholder="Senha"
            value={formData.password}
            onChangeText={value => handleChange('password', value)}
            secureTextEntry
            error={errors.password}
          />
          <SubmitButton loading={loading} handleSubmit={handleSubmit} />
          <CustomButtonNoBack handleClick={switch_resg} buttonText="Não tem conta? Registre-se já!" />

          <Popup
            visible={showEmptyFieldsError}
            title="Campos Obrigatórios"
            message="Por favor, preencha todos os campos!"
            type="warning"
            actions={[{ text: 'OK', onPress: () => setShowEmptyFieldsError(false) }]}
            onDismiss={() => setShowEmptyFieldsError(false)}
          />

          <Popup
            visible={showLoginError}
            title="Erro de Login"
            message="Credenciais inválidas ou problema de conexão!"
            type="error"
            actions={[{ text: 'OK', onPress: () => setShowLoginError(false) }]}
            onDismiss={() => setShowLoginError(false)}
          />
        </FadeInUpView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%'
  },
  box: {
    width: '75%', 
    maxWidth: 400, 
    padding: 20,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    shadowColor: 'rgba(255, 255, 255, 1)',
    shadowOpacity: 0.5,
    shadowOffset: { width: 1, height: 4 },
    shadowRadius: 8,
    borderRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    marginHorizontal: 20, 
  },
  image: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
    alignSelf: 'center',
    opacity: 0.95,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1
  },
  input: {
    width: '100%',
    marginBottom: 10,
  }
});

export default Login;
