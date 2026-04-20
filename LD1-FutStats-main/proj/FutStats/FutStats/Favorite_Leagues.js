import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Alert
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import MenuDrawer from './components/MenuDrawer';
import axios from 'axios';
import ErrorPage from './components/ErrorPage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FavoriteLeagues = ({ navigation, route }) => {
  const menuDrawerRef = useRef();
  const [leagues, setLeagues] = useState([]);
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
        fetchFavoriteLeagues(); 
      }, retryTime * 1000); 
      
      return true;
    }
    return false;
  };

  const fetchFavoriteLeagues = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://localhost:3000/api/favoritos/ligas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const formattedLeagues = response.data.ligas.map(league => ({
        id: league.id,
        code: league.code,
        name: league.name,
        area: league.area,
        logo: league.logo,
        isFavorite: true
      }));
      setLeagues(formattedLeagues);
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
      fetchFavoriteLeagues();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRemoveFavorite = async (leagueId) => {
    try {
      setRemovingId(leagueId);
      
      setLeagues(prev => prev.filter(league => league.code !== leagueId));
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(
        'http://localhost:3000/api/favorites/remove',
        { 
          itemId: leagueId.toString(),
          itemType: 'liga'
        },
        { 
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 5000
        }
      );

      if (!response.data.success) {
        throw new Error('Falha no servidor');
      }

      await fetchFavoriteLeagues();
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleLeaguePress = (league) => {
    navigation.navigate('home', { 
      leagueId: league.code,
      isFavorite: true 
    });
  };


  if (error && retryAfter) {
    return (
        <ErrorPage 
          errorMessage={error} 
          onRetry={() => {
            setError(null);
            setRetryAfter(null);
            fetchFavoriteLeagues();  
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
        <View style={styles.mainContainer}>
          <View style={styles.header}>
            <View style={styles.headerButtonsColumn}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
                <FontAwesome name="bars" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Minhas Ligas Favoritas</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.leaguesContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : leagues.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma liga favorita encontrada</Text>
            ) : (
              leagues.map(league => (
                <View key={`${league.id}-${league.code}`} style={styles.leagueCard}>
                  <TouchableOpacity 
                    style={styles.leagueContent}
                    onPress={() => handleLeaguePress(league.id)}
                  >
                    <Image 
                      source={{ uri: league.logo }} 
                      style={styles.leagueLogo} 
                      resizeMode="contain"
                    />
                    <View style={styles.leagueInfo}>
                      <Text style={styles.leagueName} numberOfLines={1}>{league.name}</Text>
                      <Text style={styles.leagueCountry}>{league.area}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => handleRemoveFavorite(league.code)}
                    style={styles.removeButton}
                    disabled={removingId === league.code}
                  >
                    {removingId === league.code ? (
                      <ActivityIndicator size="small" color="#FF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={24} color="#FF4444" />
                    )}
                  </TouchableOpacity>
                </View>
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
  mainContainer: {
    flex: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerButtonsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
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
  leaguesContent: {
    marginHorizontal: 25,
    marginTop: 20,
  },
  leagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  leagueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leagueLogo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  leagueCountry: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  removeButton: {
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
});

export default FavoriteLeagues;