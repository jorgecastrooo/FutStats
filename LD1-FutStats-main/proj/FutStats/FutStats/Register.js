import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FadeInUpView from './components/animacao/FadeInUpView';
import CustomInput from './components/elements/custom_input';
import DataInput from './components/elements/custom_input_date_picker';
import NationalityDropdown from './components/elements/nationality_dropdown';
import SubmitButton from './components/elements/custom_submit_button';
import CustomButtonNoBack from './components/elements/custom_button_noback';
import Popup from './components/elements/popup_custom';
import logo from './imagens/futstats_logo.png';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: '',
    nationality: ''
  });

  const [errors, setErrors] = useState({});
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({
    title: '',
    message: '',
    type: 'info',
    actions: [{ text: 'OK' }]
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNationalitySelect = (selectedOption) => {
    setFormData(prev => ({ ...prev, nationality: selectedOption.value }));
    if (errors.nationality) {
      setErrors(prev => ({ ...prev, nationality: '' }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      valid = false;
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
      valid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
      valid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      valid = false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha';
      valid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
      valid = false;
    }

    if (!formData.birthdate) {
      newErrors.birthdate = 'Data de nascimento é obrigatória';
      valid = false;
    } else {
      const [day, month, year] = formData.birthdate.split('/');
      const parsedDate = new Date(`${year}-${month}-${day}`);

      if (isNaN(parsedDate.getTime())) {
        newErrors.birthdate = 'Data inválida';
        valid = false;
      } else {
        const ageDiff = Date.now() - parsedDate.getTime();
        const ageDate = new Date(ageDiff);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (age < 13) {
          newErrors.birthdate = 'Você deve ter pelo menos 13 anos';
          valid = false;
        }
      }
    }

    if (!formData.nationality) {
      newErrors.nationality = 'Nacionalidade é obrigatória';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const [day, month, year] = formData.birthdate.split('/');
      const formattedBirthdate = `${year}-${month}-${day}`;

      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        nationality: formData.nationality,
        birthdate: formattedBirthdate,
        status_user: 1,
        is_admin: 0
      };

      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          birthdate: '',
          nationality: ''
        });
        setTimeout(() => navigation.navigate('Login'), 2000);
      } else {
        let message = data.error || 'Falha ao registrar. Tente novamente.';
        if (data.error?.includes('email')) {
          message = 'Este email já está registado.';
        } else if (data.error?.includes('name')) {
          message = 'Este nome de utilizador já está em uso.';
        }

        setPopupData({
          title: 'Erro no Registro',
          message,
          type: 'error',
          actions: [{ text: 'OK', onPress: () => setPopupVisible(false) }]
        });
        setPopupVisible(true);
      }
    } catch (error) {
      setPopupData({
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor',
        type: 'error',
        actions: [{ text: 'OK', onPress: () => setPopupVisible(false) }]
      });
      setPopupVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const backgroundImg = require('./imagens/hd-soccer-stadium-wallpaper-6198.jpg');

  return (
    <View style={styles.container}>
      <ImageBackground source={backgroundImg} resizeMode="cover" style={styles.image}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 40 }}>
            <FadeInUpView style={styles.box}>
              <FadeInUpView>
                <Image source={logo} style={styles.logo} />
              </FadeInUpView>
              <Text style={styles.title}>Registro {"\n"}FutStats</Text>

              <CustomInput
                placeholder="Nome completo"
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
              />

              <DataInput
                placeholder="Data de Nascimento (DD/MM/AAAA)"
                value={formData.birthdate}
                onChangeText={(text) => handleChange('birthdate', text)}
              />

              <NationalityDropdown
                value={formData.nationality}
                onSelect={handleNationalitySelect}
              />

              <CustomInput
                placeholder="Email"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                autoCapitalize="none"
              />

              <CustomInput
                placeholder="Senha (mínimo 6 caracteres)"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
              />

              <CustomInput
                placeholder="Confirmar Senha"
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
              />

              <SubmitButton
                loading={loading}
                handleSubmit={handleSubmit}
                loadingText="Registrando..."
                defaultText="Registrar"
              />

              <CustomButtonNoBack
                handleClick={() => navigation.navigate('Login')}
                buttonText="Já tem conta? Faça Login"
              />
            </FadeInUpView>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Popup de Erros */}
        <Popup
          visible={popupVisible}
          title={popupData.title}
          message={popupData.message}
          type={popupData.type}
          actions={popupData.actions}
        />
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  box: {
    width: '85%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.5,
    shadowOffset: { width: 1, height: 4 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
    alignSelf: 'center',
    opacity: 0.95,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
});

export default Register;
