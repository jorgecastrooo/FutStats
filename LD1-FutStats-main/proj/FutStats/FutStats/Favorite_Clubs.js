import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import MenuDrawer from './components/MenuDrawer';
import ErrorPage from './components/ErrorPage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FavoriteClubsScreen = ({ navigation, route }) => {
  const menuDrawerRef = useRef();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);

  const fetchFavoriteClubs = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken'); // <--- Aqui buscas o token primeiro

    if (!token) {
      console.warn('Token não encontrado.');
      return [];
    }

    const response = await axios.get('http://localhost:3000/api/favorites/clubs', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
      console.log('Dados dos clubes:', response.data);
      setClubs(response.data.clubes || []);
    } catch (error) {
      console.error('Erro ao buscar clubes favoritos:', error);
      
      if (error.response && error.response.status === 429) {
        const retryTime = error.response.headers['retry-after'] || 30;
        setRetryAfter(retryTime);
        setError(`Muitas requisições. Tentando novamente em ${retryTime} segundos...`);

        setTimeout(() => {
          setRetryAfter(null);
          fetchFavoriteClubs();
        }, retryTime * 1000);
      } else {
        setError(error.response?.data?.message || 'Erro ao carregar clubes favoritos');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavoriteClubs();
  };

  useEffect(() => {
    fetchFavoriteClubs();
  }, []);

  const handleRemoveFavorite = async (clubId) => {
    try {
      setRemovingId(clubId);
      
      // Optimistic update
      setClubs(prev => prev.filter(club => club.id !== clubId));
  
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Token não encontrado!');
      }
  
      const response = await axios.post('http://localhost:3000/api/favorites/remove', {
        itemId: clubId.toString(),
        itemType: 'clube'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });
  
      if (!response.data.success) {
        throw new Error('Falha no servidor');
      }
  
      // Refresh after successful removal
      await fetchFavoriteClubs();
    } catch (err) {
      console.error('Erro:', err);

      await fetchFavoriteClubs();
  
      if (err.response) {
        if (err.response.status === 429) {
          const retryAfter = err.response.headers['retry-after'] || 30;
          setError(`Limite de requisições atingido. Tente novamente em ${retryAfter} segundos.`);
          
          setTimeout(() => {
            setError(null);
          }, retryAfter * 1000);
        } else {
          Alert.alert('Erro', err.response.data?.message || 'Não foi possível remover o clube');
        }
      } else if (err.request) {
        Alert.alert('Erro', 'Sem resposta do servidor. Verifique sua conexão.');
      } else {
        Alert.alert('Erro', 'Ocorreu um erro inesperado');
      }
    } finally {
      setRemovingId(null);
    }
  };
  

  const toggleMenu = () => {
    menuDrawerRef.current?.toggleMenu();
  };

  const handleTeamPress = (teamId) => navigation.navigate('details', { teamId });

  if (loading && !refreshing) {
    return (
      <ImageBackground 
        source={require('./imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')} 
        style={styles.backgroundImage}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>A carregar os seus clubes...</Text>
        </View>
      </ImageBackground>
    );
  }

  if (error) {
    return (
      <ErrorPage 
        errorMessage={error}
        onRetry={fetchFavoriteClubs}
        showRetryTimer={!!retryAfter}
        retryAfter={retryAfter}
      />
    );
  }

  return (
    <ImageBackground 
      source={require('./imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')} 
      style={styles.backgroundImage}
    >
      <MenuDrawer ref={menuDrawerRef} navigation={navigation} />
      
      <View style={styles.header}>
        <View style={styles.buttonsColumn}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <FontAwesome name="bars" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Os Meus Clubes Favoritos</Text>
        <View style={{ width: 50 }}></View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFFFFF']}
            tintColor="#FFFFFF"
          />
        }
      >
        {clubs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={50} color="white" />
            <Text style={styles.emptyText}>Nenhum clube favorito</Text>
            <Text style={styles.emptySubText}>Adicione clubes para os ver aqui</Text>
          </View>
        ) : (
          clubs.map(club => (
            <TouchableOpacity 
              key={club.id} 
              style={styles.clubCard} 
              onPress={() => handleTeamPress(club.id)}
            >
              <Image 
                source={{ uri: club.logo}} 
                style={styles.clubLogo} 
                resizeMode="contain" 
              />
              <View style={styles.clubInfo}>
                <Text style={styles.clubName}>{club.name || 'Clube sem nome'}</Text>
                <Text style={styles.clubCountry}>{club.country || 'País desconhecido'}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleRemoveFavorite(club.id)}
                style={styles.removeButton}
                disabled={removingId === club.id}
              >
                {removingId === club.id ? (
                  <ActivityIndicator size="small" color="#FF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#FF4444" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    color: 'white',
    marginTop: 15,
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    marginTop: 50,
  },
  emptyText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
  },
  emptySubText: {
    color: 'white',
    fontSize: 16,
    marginTop: 5,
  },
  clubCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  clubLogo: {
    width: 70,
    height: 70,
    marginRight: 15,
  },
  clubInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clubName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clubCountry: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  removeButton: {
    padding: 10,
  },
});

export default FavoriteClubsScreen;