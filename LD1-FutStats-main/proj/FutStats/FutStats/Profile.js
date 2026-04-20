import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import MenuDrawer from './components/MenuDrawer';
import axios from 'axios';
import { API_BASE_URL } from './config';
import ErrorMessage from './components/ErrorMessage';
import ErrorPage from './components/ErrorPage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Profile = ({ navigation }) => {
  const [userData, setUserData] = useState({
    username: "",
    name: "",
    email: "",
    birthdate: new Date(),
    nationality: ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [activeSection, setActiveSection] = useState('info');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    birthdate: '',
    nationality: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const menuDrawerRef = useRef();
  const [successMessage, setSuccessMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleApiError = (error) => {
    if (error.response && error.response.status === 429) {
      const retryTime = error.response.headers['retry-after'] || 30;
      setRetryAfter(retryTime);
      setApiError(`Limite de requisições. Tente novamente em ${retryTime} segundos.`);

      setTimeout(() => {
        setApiError(null);
        fetchUserData();
      }, (retryAfter || 30) * 1000);  
      return true;
    }
    return false;
  };

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      

      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
        timeout: 5000,
        headers: { 
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Formato de resposta inválido');
      }
  
      const user = response.data.data || {};
      const birthDate = user.data_nas 
        ? new Date(user.data_nas.includes('T') ? user.data_nas : `${user.data_nas}T00:00:00`)
        : new Date();
  
      setUserData({
        username: user.email?.split('@')[0] || 'user',
        name: user.nome || '',
        email: user.email || '',
        birthdate: birthDate,
        nationality: user.nacionalidade || 'Portugal'
      });
  
    } catch (error) {
      if (!handleApiError(error)) {
        setApiError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Manejar cambios de fecha
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setUserData({...userData, birthdate: selectedDate});
      setErrors({...errors, birthdate: ''});
    }
  };

  // Selector de fecha para web
  const WebDatePicker = () => (
    <input
      type="date"
      value={userData.birthdate.toISOString().split('T')[0]}
      onChange={(e) => {
        setUserData({...userData, birthdate: new Date(e.target.value)});
        setShowDatePicker(false);
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer'
      }}
    />
  );

  const handleSaveInfo = async () => {
    // Resetar erros
    setErrors({
      name: '',
      email: '',
      birthdate: '',
      nationality: ''
    });
  
    // Validar campos
    let hasError = false;
    const newErrors = { ...errors };
  
    if (!userData.name?.trim()) {
      newErrors.name = 'Por favor, insira seu nome completo';
      hasError = true;
    }
    
    if (!userData.email?.trim()) {
      newErrors.email = 'Por favor, insira seu email';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      newErrors.email = 'Por favor, insira um email válido';
      hasError = true;
    }
    
    if (!userData.birthdate) {
      newErrors.birthdate = 'Por favor, selecione sua data de nascimento';
      hasError = true;
    }
    
    if (!userData.nationality?.trim()) {
      newErrors.nationality = 'Por favor, insira sua nacionalidade';
      hasError = true;
    }
  
    setErrors(newErrors);
  
    if (hasError) {
      return;
    }
  
    try {
      setIsLoading(true);
      
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/api/user/update-profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          birthdate: userData.birthdate.toISOString().split('T')[0],
          nationality: userData.nationality
          // Removemos o userId do body pois será obtido do token
        })
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        if (data.message === 'Utilizador não encontrado') {
          Alert.alert('Erro', 'Não foi possível encontrar seu perfil no sistema');
        } else if (data.message?.includes('email já está em uso')) {
          setErrors({...errors, email: data.message});
        } else if (data.message?.includes('nacionalidade')) {
          setErrors({...errors, nationality: data.message});
        }else if (data.message?.includes('nome já está em uso')) {
            setErrors({...errors, name: data.message});
          
        } else {
          throw new Error(data.message || 'Erro ao atualizar perfil');
        }
        return;
      }
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      
      setUserData({
        ...userData,
        name: data.updatedData.name,
        email: data.updatedData.email,
        birthdate: new Date(data.updatedData.birthdate),
        nationality: data.updatedData.nationality
      });
  
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      if (!handleApiError(error)) {
        Alert.alert('Erro', error.message || 'Ocorreu um problema ao atualizar o perfil');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Resetar erros
    setErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setSuccessMessage(null);
    setShowSuccess(false);
    
    try {
      // Validações locais
      if (!passwordData.currentPassword) {
        throw new Error('Por favor insira a password atual');
      }
  
      if (passwordData.newPassword.length < 6) {
        throw new Error('A nova password precisa de 6+ caracteres');
      }
  
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('As passwords não são iguais');
      }
  
      // Obter token
      const token = await AsyncStorage.getItem('userToken');
      
      // Chamada à API
      const response = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
          // Não enviamos userId - vem do token
        })
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        if (result.message === 'Password atual incorreta') {
          throw new Error('A password atual está incorreta');
        }
        throw new Error(result.message || 'Falha na alteração');
      }
  
      // Sucesso
      setSuccessMessage('Password alterada com sucesso!');
      setShowSuccess(true);
      setTimeout(() => {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowSuccess(false);
      }, 3000);
  
    } catch (error) {
      // Tratamento de erros específicos
      const errorMessage = error.message;
      
      if (errorMessage.includes('atual')) {
        setErrors(prev => ({ ...prev, currentPassword: errorMessage }));
      } 
      else if (errorMessage.includes('6+') || errorMessage.includes('6 caracteres')) {
        setErrors(prev => ({ ...prev, newPassword: errorMessage }));
      } 
      else if (errorMessage.includes('iguais') || errorMessage.includes('coincidem')) {
        setErrors(prev => ({ ...prev, confirmPassword: errorMessage }));
      } 
      else {
        if (!handleApiError(error)) {
          Alert.alert('Erro', error.message || 'Ocorreu um erro. Tente novamente.');
        }
      }
    }
  };

  // Navegación
  const handleBackPress = () => navigation.goBack();
  const toggleMenu = () => menuDrawerRef.current?.toggleMenu();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>A carregar perfil...</Text>
      </View>
    );
  }

  if (apiError && retryAfter) {
    return (
      <ErrorPage 
        errorMessage={apiError}
        onRetry={() => {
          setApiError(null);
          setRetryAfter(null);
          fetchUserData();
        }}
        showRetryTimer={true}
        retryAfter={retryAfter}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MenuDrawer ref={menuDrawerRef} navigation={navigation} />
      
      <ScrollView style={styles.contentContainer}>
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.headerButtonsContainer}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
              <FontAwesome name="bars" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>

        {/* Foto de perfil */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }}
            style={styles.avatar}
          />
          <Text style={styles.username}>@{userData.username}</Text>
        </View>

        {/* Selector de sección */}
        <View style={styles.sectionSelector}>
          <TouchableOpacity 
            style={[styles.sectionButton, activeSection === 'info' && styles.activeSection]}
            onPress={() => setActiveSection('info')}
          >
            <Text style={styles.sectionButtonText}>Informação</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sectionButton, activeSection === 'password' && styles.activeSection]}
            onPress={() => setActiveSection('password')}
          >
            <Text style={styles.sectionButtonText}>Password</Text>
          </TouchableOpacity>
        </View>

        {/* Sección de información */}
        {activeSection === 'info' && (
          <View style={styles.sectionContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                value={userData.name}
                onChangeText={(text) => {
                  setUserData({...userData, name: text});
                  setErrors({...errors, name: ''});
                }}
                placeholder="O seu nome completo"
                placeholderTextColor="#AAAAAA"
              />
              <ErrorMessage message={errors.name} visible={!!errors.name} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={userData.email}
                onChangeText={(text) => {
                  setUserData({...userData, email: text});
                  setErrors({...errors, email: ''});
                }}
                keyboardType="email-address"
                placeholder="O seu email"
                placeholderTextColor="#AAAAAA"
              />
              <ErrorMessage message={errors.email} visible={!!errors.email} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Data de Nascimento</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateText}>
                  {userData.birthdate.toLocaleDateString('pt-PT')}
                </Text>
                {showDatePicker && (
                  Platform.OS === 'web' ? (
                    <WebDatePicker />
                  ) : (
                    <DateTimePicker
                      value={userData.birthdate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      locale="pt-PT"
                      maximumDate={new Date()}
                      positiveButtonLabel="Confirmar"
                      negativeButtonLabel="Cancelar"
                    />
                  )
                )}
              </TouchableOpacity>
              <ErrorMessage message={errors.birthdate} visible={!!errors.birthdate} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nacionalidade</Text>
              <TextInput
                style={styles.input}
                value={userData.nationality}
                onChangeText={(text) => {
                  setUserData({...userData, nationality: text});
                  setErrors({...errors, nationality: ''});
                }}
                placeholder="A sua nacionalidade"
                placeholderTextColor="#AAAAAA"
              />
              <ErrorMessage message={errors.nationality} visible={!!errors.nationality} />
            </View>

            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSaveInfo}
            >
              <Text style={styles.saveButtonText}>Guardar Alterações</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sección de contraseña */}
        {activeSection === 'password' && (
          <View style={styles.sectionContainer}>
            {showSuccess && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password Atual</Text>
              <TextInput
                style={styles.input}
                value={passwordData.currentPassword}
                onChangeText={(text) => {
                  setPasswordData({...passwordData, currentPassword: text});
                  setErrors({...errors, currentPassword: ''});
                }}
                secureTextEntry
                placeholder="Insira a password atual"
                placeholderTextColor="#AAAAAA"
              />
              <ErrorMessage message={errors.currentPassword} visible={!!errors.currentPassword} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nova Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.newPassword}
                onChangeText={(text) => {
                  setPasswordData({...passwordData, newPassword: text});
                  setErrors({...errors, newPassword: ''});
                }}
                secureTextEntry
                placeholder="Insira a nova password"
                placeholderTextColor="#AAAAAA"
              />
              <ErrorMessage message={errors.newPassword} visible={!!errors.newPassword} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar Nova Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.confirmPassword}
                onChangeText={(text) => {
                  setPasswordData({...passwordData, confirmPassword: text});
                  setErrors({...errors, confirmPassword: ''});
                }}
                secureTextEntry
                placeholder="Confirme a nova password"
                placeholderTextColor="#AAAAAA"
              />
              <ErrorMessage message={errors.confirmPassword} visible={!!errors.confirmPassword} />
            </View>

            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleChangePassword}
            >
              <Text style={styles.saveButtonText}>Alterar Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  menuButton: {
    padding: 10,
    backgroundColor: '#000000',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonsContainer: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginRight: 60,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1E1E1E',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  username: {
    marginTop: 15,
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  sectionSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    backgroundColor: '#1E1E1E',
    paddingVertical: 10,
  },
  sectionButton: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 20,
  },
  activeSection: {
    backgroundColor: '#4CAF50',
  },
  sectionButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  sectionContainer: {
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2D2D2D',
    padding: 15,
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
  },
  dateInput: {
    backgroundColor: '#2D2D2D',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    height: 50,
  },
  dateText: {
    color: 'white',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  successText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default Profile;