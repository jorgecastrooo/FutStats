import React, { forwardRef, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../App';

const MenuDrawer = forwardRef(({ navigation }, ref) => {
  const { signOut } = React.useContext(AuthContext); 
  const [menuVisible, setMenuVisible] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  React.useEffect(() => {
    const checkAdmin = async () => {
      const isAdminStored = await AsyncStorage.getItem('isAdmin');
      setIsAdmin(JSON.parse(isAdminStored));
    };
    checkAdmin();
  }, []);
  

  React.useImperativeHandle(ref, () => ({
    toggleMenu
  }));

  const baseMenuItems = [
    { icon: 'home', label: 'Início', screen: 'home' },
    { icon: 'person', label: 'Perfil', screen: 'Profile' },
    {
      icon: 'heart',
      label: 'Favoritos',
      subItems: [
        { icon: 'person', label: 'Jogadores', screen: 'FavoritePlayers' },
        { icon: 'trophy', label: 'Ligas', screen: 'FavoriteLeagues' },
        { icon: 'shirt', label: 'Clubes', screen: 'FavoriteClubs' }
      ]
    },
    { icon: 'log-out', label: 'Sair', color: '#FF0000' }
  ];
  
  const menuItems = isAdmin
    ? [{ icon: 'cog', label: 'Admin', screen: 'Admin' }, ...baseMenuItems]
    : baseMenuItems;
  

  const handleItemPress = (item, index) => {
    if (item.subItems) {
      setExpandedMenu(expandedMenu === index ? null : index);
    } else {
      if (item.label === 'Sair') {
        handleLogout();
      } else if (item.screen) {
        navigation.navigate(item.screen);
        toggleMenu();
      }
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isAdmin');
      await AsyncStorage.removeItem('userToken');
      signOut();
      navigation.navigate('Login'); 
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  

  return (
    <Modal
      transparent
      visible={menuVisible}
      animationType="none"
      onRequestClose={toggleMenu}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={toggleMenu}
      />

      <Animated.View
        style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}
      >
        <Text style={styles.menuTitle}>Menu</Text>

        {menuItems.map((item, index) => (
          <View key={index}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleItemPress(item, index)}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.color || 'white'}
              />
              <Text style={[styles.menuText, item.color && { color: item.color }]}>
                {item.label}
              </Text>
              {item.subItems && (
                <Ionicons
                  name={expandedMenu === index ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="white"
                  style={styles.chevron}
                />
              )}
            </TouchableOpacity>

            {expandedMenu === index && item.subItems?.map((subItem, subIndex) => (
              <TouchableOpacity
                key={subIndex}
                style={styles.subMenuItem}
                onPress={() => {
                  subItem.screen && navigation.navigate(subItem.screen);
                  toggleMenu();
                }}
              >
                <Ionicons name={subItem.icon} size={16} color="white" />
                <Text style={styles.subMenuText}>{subItem.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: '100%',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    paddingTop: 60,
    paddingHorizontal: 15,
    zIndex: 100,
  },
  menuTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FF0000',
    paddingBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 5,
    borderRadius: 5,
  },
  menuText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 15,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
  subMenuItem: {
    paddingVertical: 10,
    paddingLeft: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subMenuText: {
    color: 'white',
    marginLeft: 15,
    fontSize: 16,
  },
});

export default MenuDrawer;
