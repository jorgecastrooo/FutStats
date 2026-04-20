import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, ImageBackground, Animated, TouchableOpacity, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import MenuDrawer from './components/MenuDrawer';
import ErrorPage from './components/ErrorPage';
import LoadingPage from './components/LoadingPage';

const MatchDetails = ({ route, navigation }) => {
  const { matchId } = route.params;
  const [matchDetails, setMatchDetails] = useState(null);
  const [headToHead, setHeadToHead] = useState(null);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [retryAfter, setRetryAfter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionError, setIsSubscriptionError] = useState(false);

  const itemsPerPage = 10;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const scaleAnimations = useRef([]).current;
  const scrollViewRef = useRef(null);
  const menuDrawerRef = useRef();

  const handleBackPress = () => {
    navigation.goBack();
  };

useEffect(() => {
  if (headToHead?.matches) {
    scaleAnimations.current = headToHead.matches.map(() => new Animated.Value(1));
  }
}, [headToHead]);


  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      const timer = setTimeout(() => {
        setRetryAfter(retryAfter - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryAfter === 0) {
      setError(null);
      fetchMatchDetails();
    }
  }, [retryAfter]);

  const fetchMatchDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSubscriptionError(false);
      
      const [matchResponse, headToHeadResponse] = await Promise.all([
        axios.get(`http://localhost:3000/api/matches/${matchId}`),
        axios.get(`http://localhost:3000/api/matches/${matchId}/head2head`)
      ]);

      setMatchDetails(matchResponse.data);
      setHeadToHead(headToHeadResponse.data);
      scaleAnimations.current = headToHeadResponse.data.matches.map(() => new Animated.Value(1));

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        console.log(status);
        if (status === 403 || status === 500) {
          setIsSubscriptionError(true);
          setError(error.response.data?.message || 'Acesso negado: Você não tem permissão para acessar este recurso.');
        
        } else if (status === 429) {
          const retryTime = error.response.headers['retry-after'] || 30;
          setRetryAfter(parseInt(retryTime));
          setError(`Limite de requisições atingido. Por favor, aguarde ${retryTime} segundos.`);
        } else {
          setError('Erro ao buscar detalhes do jogo');
        }
      } else {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const handleLeaguePress = (competition) => {
    navigation.navigate('home', { 
      leagueId: competition.code,
      isFavorite: competition.isFavorite
    });
  };

  const handleMatchPress = (matchId) => {
    navigation.navigate('MatchDetails', { matchId });
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleTeamPress = (teamId) => {
    navigation.navigate('details', { teamId });
  };

  const handlePressIn = (index) => {
    if (scaleAnimations.current[index]) {
      Animated.spring(scaleAnimations.current[index], {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = (index) => {
    if (scaleAnimations.current[index]) {
      Animated.spring(scaleAnimations.current[index], {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const toggleMenu = () => {
    menuDrawerRef.current?.toggleMenu();
  };

  if (isLoading && !error) {
    return <LoadingPage message="Carregando detalhes do jogo..." />;
  }

  if (error) {
    return (
      <ErrorPage 
        errorMessage={error}
        onRetry={() => {
          setError(null);
          setRetryAfter(null);
          setIsSubscriptionError(false);
          fetchMatchDetails();
        }}
        showRetryTimer={!!retryAfter}
        retryAfter={retryAfter}
        isSubscriptionError={isSubscriptionError}
      />
    );
  }
  const paginatedMatches = headToHead
    ? headToHead.matches.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
    : [];

  return (
    <ImageBackground
      source={require('./imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')}
      style={styles.backgroundImage}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <MenuDrawer ref={menuDrawerRef} navigation={navigation} />
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
        >
          <View style={styles.buttonsColumn}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuBtn} onPress={toggleMenu}>
              <FontAwesome name="bars" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {matchDetails && (
            <>
              <TouchableOpacity
                style={styles.competitionContainer}
                onPress={() => handleLeaguePress(matchDetails.competition.id)}
              >
                <Image source={{ uri: matchDetails.competition.emblem }} style={styles.competitionEmblem} />
                <Text style={styles.competitionName}>{matchDetails.competition.name}</Text>
              </TouchableOpacity>

              <Text style={styles.date}>
                {new Date(matchDetails.utcDate).toLocaleDateString('pt-PT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <View style={styles.teamsContainer}>
                <View style={styles.teamWrapper}>
                  <TouchableOpacity
                    style={styles.teamContainer}
                    onPress={() => handleTeamPress(matchDetails.homeTeam.id)}
                  >
                    <Image source={{ uri: matchDetails.homeTeam.crest }} style={styles.teamCrest} />
                    <Text style={styles.teamName}>{matchDetails.homeTeam.name}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.scoreWrapper}>
                  <Animated.Text style={[styles.score, { transform: [{ scale: scoreAnim }] }]}>
                    {matchDetails.score.fullTime.home} - {matchDetails.score.fullTime.away}
                  </Animated.Text>
                </View>

                <View style={styles.teamWrapper}>
                  <TouchableOpacity
                    style={styles.teamContainer}
                    onPress={() => handleTeamPress(matchDetails.awayTeam.id)}
                  >
                    <Image source={{ uri: matchDetails.awayTeam.crest }} style={styles.teamCrest} />
                    <Text style={styles.teamName}>{matchDetails.awayTeam.name}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {headToHead && (
            <View style={styles.headToHeadContainer}>
              <Text style={styles.sectionTitleLarge}>Confrontos Diretos</Text>

              {paginatedMatches.map((match, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPressIn={() => handlePressIn(index)}
                  onPressOut={() => handlePressOut(index)}
                  onPress={() => handleMatchPress(match.id)}
                >
                  <Animated.View
                    style={[
                      styles.headToHeadMatch,
                      { transform: [{ scale: scaleAnimations[index] }] },
                    ]}
                  >
                    
                    <View style={styles.headToHeadTeams}>
                      <View style={styles.teamWrapper}>
                        <TouchableOpacity
                          style={styles.teamContainer}
                          onPress={() => handleTeamPress(match.homeTeam.id)}
                        >
                          <Image source={{ uri: match.homeTeam.crest }} style={styles.teamCrestMedium} />
                          <Text style={styles.headToHeadTeamName}>{match.homeTeam.name}</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.scoreWrapper}>
                        <Text style={styles.headToHeadScore}>
                          {match.score.fullTime.home} - {match.score.fullTime.away}
                        </Text>
                      </View>

                      <View style={styles.teamWrapper}>
                        <TouchableOpacity
                          style={styles.teamContainer}
                          onPress={() => handleTeamPress(match.awayTeam.id)}
                        >
                          <Image source={{ uri: match.awayTeam.crest }} style={styles.teamCrestMedium} />
                          <Text style={styles.headToHeadTeamName}>{match.awayTeam.name}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.headToHeadDate}>
                      {new Date(match.utcDate).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              ))}

              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 0 && styles.disabledButton]}
                  onPress={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  <Text style={styles.paginationText}>Anterior</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paginationButton, (currentPage + 1) * itemsPerPage >= headToHead.matches.length && styles.disabledButton]}
                  onPress={() => setCurrentPage(currentPage + 1)}
                  disabled={(currentPage + 1) * itemsPerPage >= headToHead.matches.length}
                >
                  <Text style={styles.paginationText}>Próximo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  container: {
    flexGrow: 1,
  },
  competitionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  competitionEmblem: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  competitionName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
  },
  competitionStage: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
  },
  date: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#fff',
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    borderRadius: 10,
  },
  teamWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  teamContainer: {
    alignItems: 'center',
  },
  teamCrest: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  teamName: {
    fontSize: 18,
    textAlign: 'center',
    color: '#fff',
  },
  scoreWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headToHeadContainer: {
    marginTop: 20,
  },
  headToHeadMatch: {
    marginBottom: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    alignItems: 'center',
  },
  headToHeadTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  teamCrestMedium: {
    width: 50,
    height: 50,
    marginBottom: 5,
  },
  headToHeadTeamName: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  headToHeadScore: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headToHeadDate: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
    marginTop: 5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  paginationButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  paginationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  sectionTitleLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 30,
    textShadowColor: 'rgb(255, 255, 255)',
    textShadowOffset: { width: 1, height: 1 }, 
    textShadowRadius: 3,
  },
  buttonsColumn: {
    position: 'absolute',
    top: 40,
    left: 30,
    zIndex: 10,
  },
  backButton: {
    padding: 15,
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10, 
  },
  menuBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MatchDetails;