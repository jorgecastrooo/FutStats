import React, { useState, useEffect,useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ImageBackground, Image, ScrollView, ActivityIndicator,Alert } from 'react-native';
import { FontAwesome,Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import RNPickerSelect from 'react-native-picker-select';
import { useNavigation, useRoute } from '@react-navigation/native';
import MenuDrawer from './components/MenuDrawer';
import ErrorPage from './components/ErrorPage';
import { API_BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [selectedLeague, setSelectedLeague] = useState(route.params?.leagueId || 'PL');
  const [selectedLeagueData, setSelectedLeagueData] = useState(null);
  const [classificationData, setClassificationData] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [topScorers, setTopScorers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showTopScorers, setShowTopScorers] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [currentMatchday, setCurrentMatchday] = useState(1);
  const [maxAvailableMatchday, setMaxAvailableMatchday] = useState(1);
  const [retryAfter, setRetryAfter] = useState(null);
  const userId = 1;
  const [loading, setLoading] = useState({
    leagues: true,
    classification: false,
    scorers: false,
    matches: false
  });
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLeagues, setFavoriteLeagues] = useState([]);

  useEffect(() => {

    if (route.params?.leagueId) {
      setSelectedLeague(route.params.leagueId);
      

      setIsFavorite(route.params.isFavorite || false);
      

      fetchClassificationData(route.params.leagueId);
      fetchTopScorers(route.params.leagueId);
      fetchMatches(route.params.leagueId);
    }
  }, [route.params]);
  
  
  const handleApiError = (error) => {
    if (error.response && error.response.status === 429) {
      const retryTime = error.response.headers['retry-after'] || 30;
      setRetryAfter(retryTime);
      setError(`Limite de requisições. Tente novamente em ${retryTime} segundos.`);
      setTimeout(() => {
        setError(null);
      }, retryAfter * 1000);
      return true;
    }
    return false;
  };

  const handlePlayerPress = (personId) => {
    navigation.navigate('playerDetails', { personId });
  };

  const handleTeamPress = (teamId) => {
    navigation.navigate('details', { teamId });
  };

  const handleMatchPress = (matchId) => {
    navigation.navigate('MatchDetails', { matchId });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  useEffect(() => {
    fetchLeagues();
    fetchFavoriteLeagues();
  }, []);

  const fetchFavoriteLeagues = async () => {
    try {
           const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/api/favorites`, {
        params: {
          itemType: 'liga'
        },
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          
        }
      });
      setFavoriteLeagues(response.data.map(item => item.id_fav));
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
      if (error.response && error.response.status === 404) {
        setFavoriteLeagues([]);
      }
    }
  };

  useEffect(() => {
    if (selectedLeague && selectedLeague !== "") {
      fetchClassificationData(selectedLeague);
      fetchTopScorers(selectedLeague);
      fetchMatches(selectedLeague); 
    }
  }, [selectedLeague]);


  const fetchLeagues = async () => {
    setLoading(prev => ({...prev, leagues: true}));
    setError(null);
    try {
      const response = await axios.get('http://localhost:3000/api/competitions');
      setLeagues(response.data.competitions.map(league => ({
        id: league.code,
        name: league.name,
        emblem: league.emblem,
      })));
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(prev => ({...prev, leagues: false}));
    }
  };

  const fetchClassificationData = async (leagueCode) => {
    setLoading(prev => ({ ...prev, classification: true }));
    setError(null);
  
    try {
      const token = await AsyncStorage.getItem('userToken');
      const [leagueResponse, favoriteResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/competitions/${leagueCode}/standings`),
        axios.get(`${API_BASE_URL}/api/favorites/check`, {
          headers: {
              'Authorization': `Bearer ${token}`
            
          },
          params: {
            itemId: leagueCode,
            itemType: 'liga'
          }
        })
      ]);
  

      setClassificationData(leagueResponse.data.standings);
      setIsFavorite(favoriteResponse.data.isFavorite);
      

      console.log('Status de favorito:', favoriteResponse.data.isFavorite);
  
      setSelectedLeagueData({
        name: leagueResponse.data.competition.name,
        emblem: leagueResponse.data.competition.emblem,
        currentMatchday: leagueResponse.data.season.currentMatchday,
      });
  
    } catch (error) {
      if (error.response?.status === 403) {
        setError('Acesso não autorizado à API de futebol');
      } else {
        setError(error.message || 'Erro ao carregar dados');
      }
    } finally {
      setLoading(prev => ({ ...prev, classification: false }));
    }
  };
  


  const fetchTopScorers = async (leagueCode) => {
    setLoading(prev => ({...prev, scorers: true}));
    setError(null);
    try {
      const response = await axios.get(`http://localhost:3000/api/competitions/${leagueCode}/scorers`);
      setTopScorers(response.data.scorers);
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(prev => ({...prev, scorers: false}));
    }
  };

  const fetchMatches = async (leagueCode, matchday = null) => {
    setLoading(prev => ({...prev, matches: true}));
    setError(null);
    try {
      const response = await axios.get(`http://localhost:3000/api/competitions/${leagueCode}/matches`);
      const allMatches = response.data.matches;
      
      const matchdaysWithMatches = [...new Set(allMatches.map(match => match.matchday))];
      const maxMatchdayWithMatches = Math.max(...matchdaysWithMatches);
      setMaxAvailableMatchday(maxMatchdayWithMatches);
      
      const requestedMatchday = matchday || response.data.matches[0]?.season.currentMatchday || 1;
      const filteredMatches = allMatches.filter(match => 
        match.matchday === requestedMatchday
      );
      
      setMatches(filteredMatches);
      setCurrentMatchday(requestedMatchday);
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(prev => ({...prev, matches: false}));
    }
  };

  const menuDrawerRef = useRef();

  const toggleMenu = () => {
    menuDrawerRef.current?.toggleMenu();
  };

  const toggleFavorite = async (leagueId) => {
    if (!leagueId) return;
    try {
          const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(`${API_BASE_URL}/api/favorites/toggle`, {
        itemId: leagueId,
        itemType: 'liga'
      },{
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${token}`
      }
      });
      setIsFavorite(response.data.isFavorite);
      if (response.data.success) {
        setFavoriteLeagues(prev => 
          response.data.action === 'added' 
            ? [...prev, leagueId]
            : prev.filter(id => id !== leagueId)
        );
      }
    } catch (error) {
      if (!handleApiError(error)) {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    }
  };

  const renderRow = ({ item }) => (
    <TouchableOpacity 
      style={styles.row} 
      onPress={() => handleTeamPress(item.team.id)}
    >
      <Text style={styles.cell}>{item.position}</Text>
      <Image source={{ uri: item.team.crest }} style={styles.teamEmblem} />
      <Text style={styles.cell}>{item.team.name}</Text>
      <Text style={styles.cell}>{item.points}</Text>
      <Text style={styles.cell}>{item.playedGames}</Text>
      <Text style={styles.cell}>{item.won}</Text>
      <Text style={styles.cell}>{item.draw}</Text>
      <Text style={styles.cell}>{item.lost}</Text>
      <Text style={styles.cell}>{item.goalsFor}</Text>
      <Text style={styles.cell}>{item.goalsAgainst}</Text>
    </TouchableOpacity>
  );

  const renderGroupTable = (group) => (
    <View style={styles.tableContainer} key={group.group}>
      <Text style={styles.groupTitle}>{group.group}</Text>
      <FlatList
        data={group.table}
        renderItem={renderRow}
        keyExtractor={(item) => item.position.toString()}
        style={styles.table}
        ListHeaderComponent={renderHeader}
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Text style={styles.headerCell}>Pos</Text>
      <Text style={styles.headerCell}>Equipe</Text>
      <Text style={styles.headerCell}>Pts</Text>
      <Text style={styles.headerCell}>J</Text>
      <Text style={styles.headerCell}>V</Text>
      <Text style={styles.headerCell}>E</Text>
      <Text style={styles.headerCell}>D</Text>
      <Text style={styles.headerCell}>GP</Text>
      <Text style={styles.headerCell}>GC</Text>
    </View>
  );

  const renderTopScorers = () => {
    if (loading.scorers) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Carregando artilheiros...</Text>
        </View>
      );
    }

    const sortedScorers = [...topScorers].sort((a, b) => b.goals - a.goals);
  
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.groupTitle}>Melhores Marcadores</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.headerPosition]}>Posição</Text>
          <Text style={[styles.headerCell, styles.headerPlayer]}>Jogador</Text>
          <Text style={styles.headerCell}>Jogos</Text>
          <Text style={styles.headerCell}>Gols</Text>
          <Text style={styles.headerCell}>Assistências</Text>
          <Text style={styles.headerCell}>Pênaltis</Text>
        </View>
        {sortedScorers.map((scorer, index) => (
          <TouchableOpacity
            key={scorer.player.id}
            style={styles.row}
            onPress={() => handlePlayerPress(scorer.player.id)}
          >
            <Text style={[styles.cell, styles.cellPosition]}>{index + 1}</Text>
            <View style={styles.playerContainer}>
              <Image source={{ uri: scorer.team.crest }} style={styles.teamEmblem_2} />
              <Text style={styles.cell}>{scorer.player.name}</Text>
            </View>
            <Text style={[styles.cell_, { marginRight: 165 }]}>{scorer.playedMatches ?? 0}</Text>
            <Text style={[styles.cell_, { marginRight: 170 }]}>{scorer.goals ?? 0}</Text>
            <Text style={[styles.cell_, { marginRight: 120 }]}>{scorer.assists ?? 0}</Text>
            <Text style={styles.cell}>{scorer.penalties ?? 0}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMatches = () => {
    if (loading.matches) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Carregando partidas...</Text>
        </View>
      );
    }

    const currentMatches = matches.filter(match => match.matchday === currentMatchday);
    const canGoNext = currentMatchday < maxAvailableMatchday;
    const canGoPrev = currentMatchday > 1;

    return (
      <View style={styles.tableContainer}>
        <View style={styles.matchHeader}>
          <Text style={styles.groupTitle}>Jornada {currentMatchday}</Text>
          <View style={styles.matchdaySelector}>
            <TouchableOpacity 
              style={[styles.matchdayButton, !canGoPrev && styles.disabledButton]}
              onPress={() => {
                if (canGoPrev) {
                  const newMatchday = currentMatchday - 1;
                  setCurrentMatchday(newMatchday);
                  fetchMatches(selectedLeague, newMatchday);
                }
              }}
              disabled={!canGoPrev}
            >
              <Text style={[styles.matchdayButtonText, !canGoPrev && styles.disabledText]}>{"<"}</Text>
            </TouchableOpacity>
            
            <Text style={styles.currentMatchdayText}>Jornada {currentMatchday}</Text>
            
            <TouchableOpacity 
              style={[styles.matchdayButton, !canGoNext && styles.disabledButton]}
              onPress={() => {
                if (canGoNext) {
                  const newMatchday = currentMatchday + 1;
                  setCurrentMatchday(newMatchday);
                  fetchMatches(selectedLeague, newMatchday);
                }
              }}
              disabled={!canGoNext}
            >
              <Text style={[styles.matchdayButtonText, !canGoNext && styles.disabledText]}>{">"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {currentMatches.length > 0 ? (
          currentMatches.map((match) => (
            <TouchableOpacity 
              key={match.id}
              style={styles.matchContainer}
              onPress={() => handleMatchPress(match.id)}
            >
              <Text style={styles.matchDate}>
                {new Date(match.utcDate).toLocaleDateString('pt-PT', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              
              <View style={styles.matchContent}>
                <TouchableOpacity 
                  style={styles.matchTeamContainer}
                  onPress={() => handleTeamPress(match.homeTeam.id)}
                >
                  <Image source={{ uri: match.homeTeam.crest }} style={styles.matchTeamEmblem} />
                  <Text style={styles.matchTeamName}>{match.homeTeam.shortName}</Text>
                </TouchableOpacity>
                
                <View style={styles.matchScoreContainer}>
                  <Text style={styles.matchScore}>
                    {match.score.fullTime.home ?? '-'} - {match.score.fullTime.away ?? '-'}
                  </Text>
                  <Text style={styles.matchStatus}>
                    {match.status === 'FINISHED' ? 'Finalizado' : 'Agendado'}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.matchTeamContainer}
                  onPress={() => handleTeamPress(match.awayTeam.id)}
                >
                  <Image source={{ uri: match.awayTeam.crest }} style={styles.matchTeamEmblem} />
                  <Text style={styles.matchTeamName}>{match.awayTeam.shortName}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noMatchesText}>Nenhum jogo encontrado para esta jornada</Text>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              if (selectedLeague) {
                fetchClassificationData(selectedLeague);
                fetchTopScorers(selectedLeague);
                fetchMatches(selectedLeague);
              }
            }}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading.leagues || loading.classification) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Carregando dados da liga...</Text>
        </View>
      );
    }

    if (showTopScorers) {
      return renderTopScorers();
    }

    if (showMatches) {
      return renderMatches();
    }

    if (classificationData.length > 0) {
      return classificationData.map((group) => renderGroupTable(group));
    }

    return (
      <Text style={styles.noDataText}>Nenhum dado disponível para esta liga</Text>
    );
  };

  if (error) {
    return (
        <ErrorPage 
          errorMessage={error}
          onRetry={() => {
            setError(null);
            setRetryAfter(null);
            fetchTeamDetails();
          }}
          showRetryTimer={!!retryAfter}
          retryAfter={retryAfter}
          isSubscriptionError={error.includes('Acesso negado')}
        />
    );
  }

  return (
    <ImageBackground 
      source={require('./imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')} 
      style={styles.backgroundImage}
    >

<MenuDrawer ref={menuDrawerRef} navigation={navigation} />

      <ScrollView contentContainerStyle={styles.container}>

      <View style={styles.buttonsColumn}>
        {/* Botão de voltar - topo da coluna */}
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        {/* Botão de menu - abaixo do de voltar */}
        <TouchableOpacity style={styles.menuBtn} onPress={toggleMenu}>
        <FontAwesome name="bars" size={24} color="white" />
</TouchableOpacity>

      </View>

        <Text style={styles.title}>Classificação</Text>

        <View style={styles.selectContainer}>
          <Text style={styles.label}>Liga:</Text>
          {loading.leagues ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <RNPickerSelect
            value={selectedLeague}
            onValueChange={(value) => {
              setSelectedLeague(value);
              setIsFavorite(false); 
            }}
            items={leagues.map((league) => ({
              label: league.name,
              value: league.id,
              key: league.id
            }))}
            style={pickerSelectStyles}
            placeholder={{label: 'Selecione uma liga', value: null}}
          />
          )}
          <TouchableOpacity 
            onPress={() => toggleFavorite(selectedLeague)}
            style={styles.favoriteLeagueButton}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#FF0000" : "white"} 
            />
          </TouchableOpacity>

        </View>
        
        <View style={styles.toggleButtonsContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, !showTopScorers && !showMatches && styles.activeToggleBtn]} 
            onPress={() => {
              setShowTopScorers(false);
              setShowMatches(false);
            }}
          >
            <Text style={styles.toggleBtnText}>Classificação</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleBtn, showTopScorers && styles.activeToggleBtn]} 
            onPress={() => {
              setShowTopScorers(true);
              setShowMatches(false);
            }}
          >
            <Text style={styles.toggleBtnText}>Artilheiros</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleBtn, showMatches && styles.activeToggleBtn]} 
            onPress={() => {
              setShowTopScorers(false);
              setShowMatches(true);
            }}
          >
            <Text style={styles.toggleBtnText}>Jogos</Text>
          </TouchableOpacity>
        </View>

        {selectedLeagueData && (
          <View style={styles.leagueInfo}>
            <Image source={{ uri: selectedLeagueData.emblem }} style={styles.leagueImage} />
            <Text style={styles.leagueName}>{selectedLeagueData.name}</Text>
          </View>
        )}

        {renderContent()}
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  title: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    color: 'white',
  },
  favoriteLeagueButton:{
    marginLeft: 15,
  },
  toggleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    width: '100%',
  },
  toggleBtn: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeToggleBtn: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: 'red',
  },
  toggleBtnText: {
    color: 'white',
    fontSize: 16,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '90%',
  },
  label: {
    fontSize: 18,
    color: 'white',
    marginRight: 10,
  },
  leagueInfo: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
    marginLeft: 62,
    borderRadius: 8,
    width: 'auto',
    alignSelf: 'flex-start',
    marginTop: -150,
  },
  leagueImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  leagueName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  tableContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  table: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'white',
  },
  cell: {
    fontSize: 14,
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  cell_:{
    fontSize: 14,
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  headerCell: {
    fontSize: 14,
    color: 'white',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  teamEmblem: {
    width: 30,
    height: 30,
    marginRight: 10,
    borderRadius: 5,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    gap: 5,
  },
  teamEmblem_2: {
    width: 25,
    height: 25,
    borderRadius: 5,
    marginRight: -60,
  },
  matchHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  matchdaySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  matchdayButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  disabledButton: {
    backgroundColor: '#222',
  },
  matchdayButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#666',
  },
  currentMatchdayText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  matchContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  matchDate: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  matchContent: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', 
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  matchTeamContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100, 
    maxWidth: 150, 
  },
  matchTeamEmblem: {
    width: 40,
    height: 40,
    marginBottom: 5,
  },
  matchTeamName: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  matchScoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80, 
  },
  matchScore: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  matchStatus: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noMatchesText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noDataText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
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
  container: {
    flexGrow: 1,
    paddingTop: 150,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 10,
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  inputAndroid: {
    fontSize: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 10,
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  inputWeb: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 10,
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    minWidth: 200,
  },
});
export default HomeScreen;