import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground,
  ActivityIndicator
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FadeInUpView from './components/animacao/FadeInUpView';
import Popup from './components/elements/popup_custom';
import MenuDrawer from './components/MenuDrawer';

const Admin = () => {
  const menuDrawerRef = useRef();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isDeletePopupVisible, setIsDeletePopupVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/users', {
        headers: { Authorization: `Bearer ${token}`}
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso negado - Permissão de administrador necessária');
        }
        throw new Error('Erro ao carregar usuários');
      }

      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`http://localhost:3000/api/users/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: !currentStatus })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      setUsers(users.map(user => 
        user.id === id ? { ...user, status_user: !currentStatus } : user
      ));

      Alert.alert('Sucesso', `Status atualizado com sucesso!`);
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('Erro', error.message);
    }
  };

  const deleteUser = (id) => {
    const userToDelete = users.find(user => user.id === id);
    setSelectedUser(id);
    setDeleteMessage(`Tem certeza que deseja excluir o usuário ${userToDelete.nome} (${userToDelete.email})?`);
    setIsDeletePopupVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
  
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`http://localhost:3000/api/users/${selectedUser}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      const responseData = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Usuário não encontrado');
        }
        throw new Error(responseData.error || 'Erro ao excluir usuário');
      }

      setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser));
      await fetchUsers();
      
    } catch (error) {
      console.error('Erro completo:', error);
      Alert.alert('Erro', error.message);
    } finally {
      setIsDeletePopupVisible(false);
      setSelectedUser(null);
    }
  };

  const toggleAdminStatus = async (id, currentAdminStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erro', 'Sessão expirada');
        navigation.navigate('Login');
        return;
      }
  
      const decodedToken = decodeJWT(token);
      if (!decodedToken || !decodedToken.id) {
        throw new Error('Token inválido');
      }
  
      if (decodedToken.id === id) {
        Alert.alert('Erro', 'Você não pode modificar suas próprias permissões');
        return;
      }
  
      const response = await fetch(`http://localhost:3000/api/users/${id}/admin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_admin: !currentAdminStatus })
      });
  
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao atualizar permissões');
      }
  
      setUsers(users.map(user => 
        user.id === id ? { ...user, is_admin: !currentAdminStatus } : user
      ));
  
      Alert.alert('Sucesso', responseData.message);
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('Erro', error.message);
    }
  };

  useEffect(() => {
    const getUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        
        const decoded = decodeJWT(token);
        if (decoded && decoded.id) {
          setCurrentUserId(decoded.id);
        }
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
      }
    };
    getUserId();
    fetchUsers();
  }, []);

  const toggleMenu = () => {
    menuDrawerRef.current?.toggleMenu();
  };

  const renderItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.nome}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={[styles.userStatus, 
          { color: item.status_user ? '#23722a' : '#d32f2f' }]}>
          {item.status_user ? 'Ativo' : 'Inativo'}
        </Text>
        {item.is_admin && <Text style={styles.adminBadge}>Admin</Text>}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, { 
            backgroundColor: item.is_admin ? '#d32f2f' : '#1976d2',
            opacity: item.id === currentUserId ? 0.5 : 1 
          }]}
          onPress={() => toggleAdminStatus(item.id, item.is_admin)}
          disabled={item.id === currentUserId}
        >
          <Text style={styles.buttonText}>
            {item.is_admin ? 'Remover Admin' : 'Tornar Admin'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: item.status_user ? '#d32f2f' : '#23722a' }]}
          onPress={() => toggleUserStatus(item.id, item.status_user)}
        >
          <Text style={styles.buttonText}>
            {item.status_user ? 'Desativar' : 'Ativar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#757575' }]}
          onPress={() => deleteUser(item.id)}
        >
          <Text style={styles.buttonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const backback = require('./imagens/stadium-1590576_1280.jpg');

  return (
    <View style={styles.container}>
      <ImageBackground source={backback} resizeMode="cover" style={styles.image}>
        <MenuDrawer ref={menuDrawerRef} navigation={navigation} />
        

        <FadeInUpView style={styles.content}>

        <View style={styles.header}>
          <View style={styles.buttonsColumn}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
              <FontAwesome name="bars" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Administração de Usuários</Text>
          <View style={{ width: 50 }}></View>
        </View>
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (


            
            <FlatList
              data={users}
              renderItem={renderItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
              }
            />
          )}
          
          <Popup
            visible={isDeletePopupVisible}
            title="Confirmar exclusão"
            message={deleteMessage}
            type="warning"
            actions={[
              {
                text: 'Cancelar',
                onPress: () => {
                  setIsDeletePopupVisible(false);
                  setSelectedUser(null);
                },
              },
              {
                text: 'Confirmar',
                onPress: handleConfirmDelete,
              },
            ]}
            onDismiss={() => setIsDeletePopupVisible(false)}
          />
        </FadeInUpView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  buttonsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  menuButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginHorizontal: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  userStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  adminBadge: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: 'bold',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 5,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    minWidth: 100,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  }
});

export default Admin;