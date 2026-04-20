import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Linking, ImageBackground, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MenuDrawer from './components/MenuDrawer';
import ErrorPage from './components/ErrorPage';
import LoadingPage from './components/LoadingPage';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');

const PlayerDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { personId } = route.params;
  const userId = 1;
  

  const [playerDetails, setPlayerDetails] = useState(null);
  const [playerMatches, setPlayerMatches] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState({ 
    details: true, 
    matches: true,
    favorite: true
  });
  const [favoritePlayers, setFavoritePlayers] = useState([]);
  const [retryAfter, setRetryAfter] = useState(null);
  const [isSubscriptionError, setIsSubscriptionError] = useState(false);

  const scrollViewRef = useRef(null);
  const matchesPerPage = 10;
  const menuDrawerRef = useRef();


  const checkFavoriteStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://localhost:3000/api/favorites/player/${personId}`, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.isFavorite;
    } catch (error) {
      if (error.response?.status === 429) {
        const retryTime = error.response.headers['retry-after'] || 30;
        setRetryAfter(retryTime);
        setError(`Too many requests. Retrying in ${retryTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryTime * 1000));
        setRetryAfter(null);
        setError(null);
        return checkFavoriteStatus();
      }
      console.error('Error checking favorite:', error);
      return false;
    }
  };

  const fetchPlayerData = async () => {
    try {
      setError(null);
      setIsSubscriptionError(false);
      setLoading({ details: true, matches: true, favorite: loading.favorite });
      
      const [detailsResponse, matchesResponse] = await Promise.all([
        axios.get(`http://localhost:3000/api/persons/${personId}`, { timeout: 10000 }),
        axios.get(`http://localhost:3000/api/persons/${personId}/matches`, { timeout: 10000 })
      ]);
      
      setPlayerDetails(detailsResponse.data);
      setPlayerMatches(matchesResponse.data.matches || []);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 403) {
          setIsSubscriptionError(true);
          setError('Access denied. You may need to update your API subscription.');
        } else if (err.response.status === 429) {
          const retryTime = err.response.headers['retry-after'] || 30;
          setRetryAfter(retryTime);
          setError(`Too many requests. Retrying in ${retryTime} seconds...`);
        } else {
          setError('Failed to load player data. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(prev => ({ ...prev, details: false, matches: false }));
    }
  };

  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      const timer = setTimeout(() => {
        setRetryAfter(retryAfter - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryAfter === 0) {
      setError(null);
      fetchPlayerData();
    }
  }, [retryAfter]);

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      try {
        const isFavorite = await checkFavoriteStatus();
        if (isFavorite) {
          setFavoritePlayers(prev => [...prev, personId]);
        }
      } catch (error) {
        console.error('Error loading favorite status:', error);
      } finally {
        setLoading(prev => ({ ...prev, favorite: false }));
      }
    };
    loadFavoriteStatus();
  }, [personId]);


  useEffect(() => {
    fetchPlayerData();
  }, [personId]);

  // Alternar favorito
  const togglePlayerFavorite = async () => {
    const newFavoriteStatus = !favoritePlayers.includes(personId);
    
    try {
      setLoading(prev => ({ ...prev, favorite: true }));
      setFavoritePlayers(prev => 
        newFavoriteStatus ? [...prev, personId] : prev.filter(id => id !== personId)
      );
      
       const token = await AsyncStorage.getItem('userToken');
      await axios.post('http://localhost:3000/api/favorites/toggle', {
        itemId: personId.toString(),
        itemType: 'jogador'
      }, 
      {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${token}`
      }
      });

    } catch (error) {

      setFavoritePlayers(prev => 
        !newFavoriteStatus ? [...prev, personId] : prev.filter(id => id !== personId)
      );

      if (error.response?.status === 429) {
        const retryTime = error.response.headers['retry-after'] || 30;
        setRetryAfter(retryTime);
        setError(`Too many requests. Retrying in ${retryTime} seconds...`);
      } else {
        setError('Failed to update favorite status');
      }
    } finally {
      setLoading(prev => ({ ...prev, favorite: false }));
    }
  };


  const handleBackPress = () => navigation.goBack();
  const toggleMenu = () => menuDrawerRef.current?.toggleMenu();
  const handleTeamPress = (teamId) => navigation.navigate('details', { teamId });
  const handleMatchPress = (matchId) => navigation.navigate('MatchDetails', { matchId });


  const totalPages = Math.ceil(playerMatches.length / matchesPerPage);
  const currentMatches = playerMatches.slice(
    currentPage * matchesPerPage,
    (currentPage + 1) * matchesPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      scrollViewRef.current?.scrollTo({ y: 350, animated: true });
    }
  };
  
  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      scrollViewRef.current?.scrollTo({ y: 350, animated: true });
    }
  };

  const handleRetry = () => {
    setCurrentPage(0);
    setError(null);
    setRetryAfter(null);
    setIsSubscriptionError(false);
    setLoading({ details: true, matches: true, favorite: true });
    fetchPlayerData();
  };

  if (error) {
    return (
      <ErrorPage 
        errorMessage={error}
        onRetry={handleRetry}
        showRetryTimer={!!retryAfter}
        retryAfter={retryAfter}
        isSubscriptionError={isSubscriptionError}
      />
    );
  }

  if (loading.details) {
    return <LoadingPage message="Loading player details..." />;
  }

  return (
    <ImageBackground 
      source={require('./imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')} 
      style={styles.backgroundImage}
    >
      <MenuDrawer ref={menuDrawerRef} navigation={navigation} />
  
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
        <View style={styles.navigationButtons}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <FontAwesome name="bars" size={24} color="white" />
          </TouchableOpacity>
        </View>
  
        <Text style={styles.headerTitle}>Informações do Jogador</Text>
  
        <View style={styles.contentContainer}>
          <View style={styles.infoContainer}>
            {playerDetails?.photo && (
              <Image source={{ uri: playerDetails.photo }} style={styles.playerImage} />
            )}
  
            <View style={styles.infoCard}>
              <TouchableOpacity 
                onPress={togglePlayerFavorite}
                style={styles.favoriteButton}
                disabled={loading.favorite}
              >
                {loading.favorite ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons 
                    name={favoritePlayers.includes(personId) ? "heart" : "heart-outline"} 
                    size={24} 
                    color={favoritePlayers.includes(personId) ? "#FF0000" : "white"} 
                  />
                )}
              </TouchableOpacity>
  
              <Text style={styles.playerName}>{playerDetails?.name}</Text>
              
              {playerDetails?.dateOfBirth && (
                <Text style={styles.playerInfo}>
                  <Text style={styles.infoLabel}>Data de Nascimento: </Text>
                  {playerDetails.dateOfBirth}
                </Text>
              )}
  
              {playerDetails?.nationality && (
                <Text style={styles.playerInfo}>
                  <Text style={styles.infoLabel}>Nacionalidade: </Text>
                  {playerDetails.nationality}
                </Text>
              )}
  
              {playerDetails?.position && (
                <Text style={styles.playerInfo}>
                  <Text style={styles.infoLabel}>Posição: </Text>
                  {playerDetails.position}
                </Text>
              )}
  
              {playerDetails?.shirtNumber && (
                <Text style={styles.playerInfo}>
                  <Text style={styles.infoLabel}>Número da Camisa: </Text>
                  {playerDetails.shirtNumber}
                </Text>
              )}
  
              {playerDetails?.currentTeam && (
                <TouchableOpacity
                  style={styles.teamInfoContainer}
                  onPress={() => handleTeamPress(playerDetails.currentTeam.id)}
                >
                  <Text style={styles.playerInfo}>
                    <Text style={styles.infoLabel}>Clube Atual: </Text>
                    {playerDetails.currentTeam.name}
                  </Text>
                  {playerDetails.currentTeam.crest && (
                    <Image 
                      source={{ uri: playerDetails.currentTeam.crest }} 
                      style={styles.teamCrest} 
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
  
            {loading.matches ? (
              <View style={styles.loadingMatchesContainer}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.loadingMatchesText}>A carregar jogos...</Text>
              </View>
            ) : playerMatches.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Jogos Recentes</Text>
                
                {currentMatches.map((match) => (
                  <MatchItem 
                    key={match.id}
                    match={match}
                    onMatchPress={handleMatchPress}
                    onTeamPress={handleTeamPress}
                  />
                ))}
  
                {totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <TouchableOpacity 
                      style={[styles.paginationButton, currentPage === 0 && styles.disabledButton]} 
                      onPress={handlePreviousPage}
                      disabled={currentPage === 0}
                    >
                      <Text style={styles.paginationText}>Anterior</Text>
                    </TouchableOpacity>
  
                    <Text style={styles.paginationText}>
                      {currentPage + 1} / {totalPages}
                    </Text>
  
                    <TouchableOpacity 
                      style={[styles.paginationButton, currentPage === totalPages - 1 && styles.disabledButton]} 
                      onPress={handleNextPage}
                      disabled={currentPage === totalPages - 1}
                    >
                      <Text style={styles.paginationText}>Próximo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noMatchesText}>Nenhum jogo encontrado para este jogador</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

// Componente MatchItem
const MatchItem = ({ match, onMatchPress, onTeamPress }) => {
  const handleTeamPress = (teamId, e) => {
    e.stopPropagation();
    onTeamPress(teamId);
  };

  return (
    <TouchableOpacity style={styles.matchContainer} onPress={() => onMatchPress(match.id)}>
      <Text style={styles.matchDate}>
        {new Date(match.utcDate).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>

      <View style={styles.matchTeams}>
        <View style={styles.teamWrapper}>
          <TouchableOpacity
            style={styles.teamContainer}
            onPress={(e) => handleTeamPress(match.homeTeam.id, e)}
          >
            <Image 
              source={{ uri: match.homeTeam.crest || 'https://via.placeholder.com/40' }} 
              style={styles.teamLogo} 
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.homeTeam.shortName || match.homeTeam.name}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.matchScore}>
            {match.score?.fullTime?.home ?? '-'} - {match.score?.fullTime?.away ?? '-'}
          </Text>
          <Text style={styles.matchStatus}>
            {match.status === 'FINISHED' ? 'FINAL' : 'SCHEDULED'}
          </Text>
        </View>

        <View style={styles.teamWrapper}>
          <TouchableOpacity
            style={styles.teamContainer}
            onPress={(e) => handleTeamPress(match.awayTeam.id, e)}
          >
            <Image 
              source={{ uri: match.awayTeam.crest || 'https://via.placeholder.com/40' }} 
              style={styles.teamLogo} 
            />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.awayTeam.shortName || match.awayTeam.name}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Estilos
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    width: '100%',
    height: '100%',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingBottom: 40,
  },
  contentContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#fff',
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  infoContainer: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 20,
    marginTop: 80,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  playerImage: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#fff',
  },
  playerName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: 'rgb(255, 255, 255)',
  },
  playerInfo: {
    fontSize: 16,
    marginVertical: 5,
    color: '#fff',
  },
  infoLabel: {
    fontWeight: 'bold',
    color: 'rgb(255, 255, 255)',
  },
  teamInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  teamCrest: {
    width: 30,
    height: 30,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#fff',
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  matchContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchDate: {
    fontSize: 14,
    color: 'rgb(255, 255, 255)',
    textAlign: 'center',
    marginBottom: 10,
  },
  matchTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  teamContainer: {
    alignItems: 'center',
  },
  teamLogo: {
    width: 40,
    height: 40,
    marginBottom: 5,
  },
  teamName: {
    fontSize: 14,
    textAlign: 'center',
    color: 'rgb(255, 255, 255)',
    maxWidth: 100,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  matchScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgb(255, 255, 255)',
  },
  matchStatus: {
    fontSize: 12,
    color: 'rgb(255, 255, 255)',
    marginTop: 3,
  },
  loadingMatchesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingMatchesText: {
    color: 'rgb(255, 255, 255)',
    marginTop: 10,
  },
  noMatchesText: {
    color: 'rgb(255, 255, 255)',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 5,
    padding: 10,
  },
  paginationButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  paginationText: {
    color: 'rgb(255, 255, 255)',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  navigationButtons: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 16,
    paddingHorizontal: 20,
    zIndex: 100,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    alignSelf: 'flex-end',
    position: 'absolute',  
    right: 25,             
    top: 25,              
  },
  menuButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 50,
    height: 50,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlayerDetails;