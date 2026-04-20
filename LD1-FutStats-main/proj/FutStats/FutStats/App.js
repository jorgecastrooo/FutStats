import React, { useState, useEffect, createContext } from 'react';
import { View, ActivityIndicator,Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MenuDrawer from './components/MenuDrawer';

import TeamDetailsScreen from './TeamDetailsScreen';
import Login from './Login';
import Register from './Register';
import Home from './HomeScreen';
import PlayerDetailsScreen from './PlayerDetailsScreen';
import MatchDetails from './MatchDetails';
import Profile from './Profile';
import FavoriteLeagues from './Favorite_Leagues';
import FavoriteClubs from './Favorite_Clubs';
import FavoritePlayers from './Favorite_Players';
import Admin from './Admin';

export const AuthContext = createContext();

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);


  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token || null);
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        setUserToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);


  const authContext = {
    signIn: async (token, isAdmin) => {
      try {
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('isAdmin', JSON.stringify(isAdmin));
        setUserToken(token);
      } catch (e) {
        console.error('Erro ao salvar token:', e);
      }
    },    
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    },
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        {userToken ? (
          <Drawer.Navigator
            screenOptions={{ headerShown: false }}
            drawerContent={(props) => (
              <MenuDrawer {...props} authContext={authContext} />
            )}
          >
            <Drawer.Screen name="home" component={Home} />
            <Drawer.Screen name="Profile" component={Profile} />
            <Drawer.Screen name="FavoriteLeagues" component={FavoriteLeagues} />
            <Drawer.Screen name="FavoriteClubs" component={FavoriteClubs} />
            <Drawer.Screen name="FavoritePlayers" component={FavoritePlayers} />
            <Drawer.Screen name="details" component={TeamDetailsScreen} />
            <Drawer.Screen name="playerDetails" component={PlayerDetailsScreen} />
            <Drawer.Screen name="MatchDetails" component={MatchDetails} />
            <Drawer.Screen 
              name="Admin" 
              component={Admin}            />
          </Drawer.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {(props) => <Login {...props} authContext={authContext} />}
            </Stack.Screen>
            <Stack.Screen name="Register" component={Register} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
};

export default App;
