import React, { useEffect, useState, useRef } from 'react';
import {View, Text, Image, StyleSheet, ScrollView, Linking, ImageBackground, Button, TouchableOpacity} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MenuDrawer from './components/MenuDrawer';
import ErrorPage from './components/ErrorPage';
import LoadingPage from './components/LoadingPage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TeamDetails = ({ route }) => {
  const navigation = useNavigation();
  const { teamId } = route.params;
  const [teamDetails, setTeamDetails] = useState({
    matches: [],
    isFavorite: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [matchesPerPage] = useState(10);
  const [error, setError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef(null);
  const menuDrawerRef = useRef();
  const [isSubscriptionError, setIsSubscriptionError] = useState(false);
const checkFavoriteStatus = async (teamId) => {
  try {
    console.log(`Verificando status de favorito para o time ${teamId}...`);
     const token = await AsyncStorage.getItem('userToken');
    const response = await axios.get(`http://localhost:3000/api/favorites/team/${teamId}`, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        
      }
    });
    
    console.log(`Status de favorito para time ${teamId}: ${response.data.isFavorite ? 'SIM' : 'NÃO'}`);
    return response.data.isFavorite;
    
  } catch (error) {
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 30;
      console.warn(`Rate limit atingido. Tentando novamente em ${retryAfter} segundos...`);
      

      setRetryAfter(retryAfter);
      setError(`Muitas requisições. Tentando novamente em ${retryAfter} segundos...`);
      
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      setRetryAfter(null);
      setError(null);
      
      return checkFavoriteStatus(teamId); 
    }
    
    console.error('Erro ao verificar status de favorito:', {
      teamId: teamId,
      error: error.message,
      status: error.response?.status
    });
    return false;
  }
};

const toggleClubFavorite = async (clubId) => {
  const numericClubId = Number(clubId);
  const newFavoriteStatus = !teamDetails.isFavorite;

  try {
    setTeamDetails(prev => ({
      ...prev,
      isFavorite: newFavoriteStatus
    }));

    const token = await AsyncStorage.getItem('userToken');
    const response = await axios.post('http://localhost:3000/api/favorites/toggle', {
      itemId: numericClubId.toString(),
      itemType: 'clube'
    }, {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${token}`
      }

    });

    return response.data;

  } catch (error) {
    setTeamDetails(prev => ({
      ...prev,
      isFavorite: !newFavoriteStatus
    }));

    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 30;
      setRetryAfter(retryAfter);
      setError(`Muitas requisições. Tentando novamente em ${retryAfter} segundos...`);

      return;
    }

    console.error('Failed to update favorite:', error);
    setError('Erro ao atualizar favorito');
  }
};

const fetchTeamDetails = async () => {
  try {
    setIsLoading(true);
    setError(null);

    const [teamResponse, matchesResponse, isFavorite] = await Promise.all([
      axios.get(`http://localhost:3000/api/teams/${teamId}`, { timeout: 10000 }),
      axios.get(`http://localhost:3000/api/teams/${teamId}/matches`, { timeout: 10000 }),
      checkFavoriteStatus(teamId)
    ]);

    const sortedMatches = matchesResponse.data.matches?.sort((a, b) =>
      new Date(b.utcDate) - new Date(a.utcDate)
    ) || [];

    setTeamDetails({
      ...teamResponse.data,
      matches: sortedMatches,
      isFavorite
    });

  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      
      if (status === 403) {
        setIsSubscriptionError(true);
        setError('Acesso negado. Pode ser necessário atualizar a sua assinatura da API.');
      } else if (status === 429) {
        const retryAfterHeader = error.response.headers['retry-after'];
        const retryTime = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 30; 
        setRetryAfter(retryTime);
        setError(`Muitas requisições. Tentando novamente em ${retryTime} segundos...`);
      
      }
    } else {
      setError('Erro ao carregar dados');
      console.warn('Erro na requisição:', error.message);
    }
  } finally {
    setIsLoading(false);
  }
};


  useEffect(() => {
    fetchTeamDetails();
  }, [teamId]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [teamId]);

  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      const timer = setTimeout(() => {
        setRetryAfter(retryAfter - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryAfter === 0) {
      setError(null);
      fetchTeamDetails();
    }
  }, [retryAfter]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleTeamPress = (teamId) => {
    navigation.navigate('details', { teamId });
  };

  const handlePlayerPress = (personId) => {
    navigation.navigate('playerDetails', { personId });
  };

  const handleLinkPress = (url) => {
    Linking.openURL(url).catch((err) => console.error("Error opening URL", err));
  };

  const handleLeaguePress = (competition) => {
    navigation.navigate('home', { 
      leagueId: competition.code,
      isFavorite: competition.isFavorite 
    });
  };

  const handleMatchPress = (matchId) => {
    navigation.navigate('MatchDetails', { matchId });
  };

  const nextPage = () => {
    if (currentPage < Math.ceil(teamDetails.matches.length / matchesPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const toggleMenu = () => {
    menuDrawerRef.current?.toggleMenu();
  };

  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = teamDetails.matches.slice(indexOfFirstMatch, indexOfLastMatch);

  if (isLoading && !error) {
      return <LoadingPage message="Carregar dados da equipa..." />;
  }

  if (error) {
    return (
        <ErrorPage 
          errorMessage={error}
          onRetry={() => {
            setError(null);
            setRetryAfter(null);
            setIsSubscriptionError(false);
            fetchTeamDetails();
          }}
          showRetryTimer={!!retryAfter}
          retryAfter={retryAfter}
          isSubscriptionError={isSubscriptionError}
        />
    );
  }

  return (
    <ImageBackground 
      source={require('./imagens/20723325-fechar-acima-do-uma-futebol-atacante-pronto-para-chutes-a-bola-dentro-a-futebol-objetivo-foto.jpg')} 
      style={styles.backgroundImage}
    >
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
  
        <View style={styles.contentContainer}>
          <View style={styles.infoContainer}>
            <View style={styles.teamHeader}>
              <Image source={{ uri: teamDetails.crest }} style={styles.teamImage} />
              <View style={styles.heartContainer}>
                <TouchableOpacity 
                  onPress={() => toggleClubFavorite(teamId)}
                  style={styles.favoriteButton}
                >
                  <Ionicons 
                    name={teamDetails.isFavorite ? "heart" : "heart-outline"} 
                    size={30} 
                    color={teamDetails.isFavorite ? "#FF0000" : "white"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={styles.teamName}>{teamDetails.name}</Text>
            
            {teamDetails.area && teamDetails.area.flag && (
              <View style={styles.teamInfoContainer}>
                <Text style={styles.teamInfo}>
                  País: <Image source={{ uri: teamDetails.area.flag }} style={styles.flagImage} /> {teamDetails.area.name}
                </Text>
              </View>
            )}
            
            <View style={styles.infoLine} />
            <Text style={styles.teamInfo}>Fundado em: {teamDetails.founded}</Text>
            <View style={styles.infoLine} />
            <Text style={styles.teamInfo}>Estádio: {teamDetails.venue}</Text>
            <View style={styles.infoLine} />
            <Text style={styles.teamInfo}>Cores do clube: {teamDetails.clubColors}</Text>
            <View style={styles.infoLine} />
            
            {teamDetails.website && (
              <Text style={[styles.teamInfo, styles.link]} onPress={() => handleLinkPress(teamDetails.website)}>
                Website: {teamDetails.website}
              </Text>
            )}
          </View>
  
          {teamDetails.runningCompetitions && teamDetails.runningCompetitions.length > 0 && (
            <View style={styles.competitionsCard}>
              <Text style={styles.sectionTitle}>Competições</Text>
              {teamDetails.runningCompetitions.map((competition) => (
  <TouchableOpacity 
    key={competition.id} 
    style={styles.competitionItem}
    onPress={() => handleLeaguePress(competition)}
  >
    <Image 
      source={{ uri: competition.emblem }} 
      style={styles.competitionEmblem} 
      resizeMode="contain"
    />
    <Text style={styles.competitionName}>{competition.name}</Text>
  </TouchableOpacity>
))}
            </View>
          )}
  
          {teamDetails.coach && (
            <View style={styles.coachCard}>
              <Text style={styles.coachTitle}>Treinador</Text>
              <Text style={styles.coachName}>{teamDetails.coach.name}</Text>
              <View style={styles.coachInfoLine} />
              <Text style={styles.coachInfo}>Nacionalidade: {teamDetails.coach.nationality}</Text>
              <View style={styles.coachInfoLine} />
              <Text style={styles.coachInfo}>Data de Nascimento: {teamDetails.coach.dateOfBirth}</Text>
              <View style={styles.coachInfoLine} />
              <Text style={styles.coachInfo}>Contrato: De {teamDetails.coach.contract.start} até {teamDetails.coach.contract.until}</Text>
            </View>
          )}
  
          <View style={styles.tableWrapper}>
            <Text style={styles.sectionTitle}>Plantel</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={styles.headerText}>Nome</Text>
                <Text style={styles.headerText}>Posição</Text>
                <Text style={styles.headerText}>Nacionalidade</Text>
                <Text style={styles.headerText}>Data Nasc.</Text>
              </View>
              <ScrollView style={styles.tableBody}>
                {teamDetails.squad?.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.tableRow}
                    onPress={() => handlePlayerPress(player.id)}
                  >
                    <Text style={styles.cell}>{player.name}</Text>
                    <Text style={styles.cell}>{player.position}</Text>
                    <Text style={styles.cell}>{player.nationality}</Text>
                    <Text style={styles.cell}>{player.dateOfBirth}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
  
          <View style={styles.matchesContainer}>
            <Text style={[styles.sectionTitle, { marginTop: 70, marginBottom: 20 }]}>Jogos</Text>
            {currentMatches.map((match) => (
              <View key={match.id} style={styles.matchItem}>
                <Text style={styles.centeredText}>
                  {new Date(match.utcDate).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.matchContainer}
                  onPress={() => handleMatchPress(match.id)}
                >
                  <View style={styles.teamsContainer}>
                    <TouchableOpacity
                      style={styles.teamContainer}
                      onPress={() => handleTeamPress(match.homeTeam.id)}
                    >
                      {match.homeTeam.crest && (
                        <Image source={{ uri: match.homeTeam.crest }} style={styles.mediumTeamCrest} />
                      )}
                      <Text style={styles.smallTeamName} numberOfLines={1}>{match.homeTeam.name}</Text>
                    </TouchableOpacity>
  
                    <View style={styles.fixedResultContainer}>
                      {match.score && match.score.fullTime && (
                        <Text style={styles.resultText}>
                          {match.score.fullTime.home} - {match.score.fullTime.away}
                        </Text>
                      )}
                    </View>
  
                    <TouchableOpacity
                      style={styles.teamContainer}
                      onPress={() => handleTeamPress(match.awayTeam.id)}
                    >
                      {match.awayTeam.crest && (
                        <Image source={{ uri: match.awayTeam.crest }} style={styles.mediumTeamCrest} />
                      )}
                      <Text style={styles.smallTeamName} numberOfLines={1}>{match.awayTeam.name}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
  
                <Text style={styles.centeredText}>
                  {match.status === 'FINISHED' ? 'Terminado' : 'Agendado'}
                </Text>
              </View>
            ))}
            <View style={styles.pagination}>
              <Button
                title="Anterior"
                onPress={prevPage}
                color="#4CAF50"
                disabled={currentPage === 1}
              />
              <Text style={styles.pageNumber}>Página {currentPage}</Text>
              <Button
                title="Próximo"
                onPress={nextPage}
                color="#4CAF50"
                disabled={currentPage === Math.ceil(teamDetails.matches.length / matchesPerPage)}
              />
            </View>
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
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  contentContainer: {
    flexDirection: 'column',
  },
  infoContainer: {
    flex: 1,
    marginBottom: 40,
  },
  infoLine: {
    borderBottomColor: 'rgb(255, 255, 255)',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  tableWrapper: {
    flex: 1,
    marginBottom: 20,
  },
  teamImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 15, 
  },
  favoriteButton: {
    marginLeft: 15, 
  },
  heartContainer: {
    position: 'absolute',
    right: 10, 
    top: '50%', 
    marginTop: -15, 
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative', 
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#fff',
  },
  teamInfo: {
    fontSize: 16,
    marginBottom: 5,
    color: '#fff',
  },
  teamInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  flagImage: {
    width: 30,
    height: 20,
    marginRight: 5,
    marginLeft: 5,
    alignSelf: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'left',
    color: '#fff',
    paddingLeft: 10,
  },
  tableContainer: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    color: '#fff',
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: 'rgba(245, 245, 245, 0.5)',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: 'rgb(255, 255, 255)',
  },
  link: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  coachCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  coachTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgb(255, 255, 255)',
    marginBottom: 10,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255)',
    marginBottom: 8,
  },
  coachInfo: {
    fontSize: 14,
    color: 'rgb(255, 255, 255)',
    marginBottom: 5,
  },
  coachInfoLine: {
    borderBottomColor: 'rgb(255, 255, 255)',
    borderBottomWidth: 1,
    marginVertical: 8,
  },
  competitionsCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  competitionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  competitionEmblem: {
    width: 50,
    height: 50,
    marginRight: 10,
    resizeMode: 'contain',
  },
  competitionName: {
    fontSize: 16,
    color: 'rgb(255, 255, 255)',
  },
  matchesContainer: {
    marginBottom: 20,
  },
  matchItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  centeredText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 10,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
    alignSelf: 'center',
    marginBottom: 20,
  },
  teamContainer: {
    alignItems: 'center',
    width: 'auto',
  },
  mediumTeamCrest: {
    width: 70,
    height: 70,
    marginBottom: 5,
    resizeMode: 'contain',
  },
  smallTeamName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fixedResultContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -30,
    // backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  resultText: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
  },
  pageNumber: {
    fontSize: 16,
    color: '#fff',
  },
  matchContainer: {
    width: '100%',
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

export default TeamDetails;