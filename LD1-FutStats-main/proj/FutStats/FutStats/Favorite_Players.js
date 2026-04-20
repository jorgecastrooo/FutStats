import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Alert,
  Image
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import MenuDrawer from './components/MenuDrawer';
import axios from 'axios';
import ErrorPage from './components/ErrorPage';
import AsyncStorage from '@react-native-async-storage/async-storage';
const FavoritePlayers = ({ navigation }) => {
  const menuDrawerRef = useRef();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const userId = 1;
  const [retryAfter, setRetryAfter] = useState(null);
  const toggleMenu = () => {
    menuDrawerRef.current?.toggleMenu();
  };

  const handleApiError = (error) => {
    if (error.response && error.response.status === 429) {
      const retryTime = error.response.headers['retry-after'] || 30;
      setRetryAfter(retryTime);
      setError(`Limite de requisições. Tente novamente em ${retryTime} segundos.`);
      
      setTimeout(() => {
        setError(null);
        setRetryAfter(null);
        fetchFavoritePlayers(); 
      }, retryTime * 1000); 
      
      return true;
    }
    return false;
  };

  const fetchFavoritePlayers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get('http://localhost:3000/api/favoritos/jogadores', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setPlayers(response.data.jogadores);
      setError(null);
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchFavoritePlayers();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRemoveFavorite = async (playerId) => {
    try {
      setRemovingId(playerId);
      setPlayers(prev => prev.filter(player => player.id !== playerId));
      const token = await AsyncStorage.getItem('userToken');
       const response = await axios.post('http://localhost:3000/api/favorites/remove', {
              itemId: playerId.toString(),
              itemType: 'jogador'
            }, {
              headers: {
                Authorization: `Bearer ${token}`
              },
              timeout: 5000
            });
      if (!response.data.success) {
        throw new Error('Falha no servidor');
      }
      await fetchFavoritePlayers();
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handlePlayerPress = (personId) => {
    navigation.navigate('playerDetails', { personId });
  };

  if (error && retryAfter) {
    return (
        <ErrorPage 
          errorMessage={error}  
          onRetry={() => {
            setError(null);
            setRetryAfter(null);
            fetchFavoritePlayers();  
          }}
          showRetryTimer={true}
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

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerButtonsColumn}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
                <FontAwesome name="bars" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Os Meus Jogadores Favoritos</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.playersContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : players.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum jogador favorito encontrado</Text>
            ) : (
              players.map(player => (
                <TouchableOpacity
                  key={player.id}
                  onPress={() => handlePlayerPress(player.id)}
                  style={styles.playerCard}
                >
                  {player.photo ? (
                    <Image 
                      source={{ uri: player.photo }} 
                      style={styles.playerImage} 
                    />
                  ) : (
                    <View style={styles.playerInitialsContainer}>
                      <Text style={styles.playerInitials}>
                        {player.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <View style={styles.clubInfo}>
                      {player.currentTeam?.crest && (
                        <Image 
                          source={{ uri: player.currentTeam.crest }} 
                          style={styles.clubLogo} 
                        />
                      )}
                      <Text style={styles.playerDetails}>
                        {player.currentTeam?.name || 'Sem clube'} • {player.position || 'Posição não especificada'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(player.id);
                    }}
                    style={styles.favoritePlayerButton}
                    disabled={removingId === player.id}
                  >
                    {removingId === player.id ? (
                      <ActivityIndicator size="small" color="#FF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={24} color="#FF4444" />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
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
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    justifyContent: 'space-between',
  },
  headerButtonsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 45,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginRight: 50,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  playersContent: {
    marginHorizontal: 15,
    marginTop: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    marginLeft: 45,  
    marginRight: 45, 
},
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  playerInitialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  playerInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  playerDetails: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  favoritePlayerButton: {
    padding: 10,
  },
  loader: {
    marginTop: 50,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  emptyText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  menuButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FavoritePlayers;