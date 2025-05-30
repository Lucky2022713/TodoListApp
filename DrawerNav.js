// DrawerNav.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { CommonActions, useNavigation } from '@react-navigation/native';
import {
  SafeAreaView,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

const Drawer = createDrawerNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#5A4FCF',
  secondary: '#EF5350',
  background: '#F7F8FA',
  surface:   '#FFFFFF',
  textDark:  '#333333',
  textLight: '#FFFFFF',
  border:    '#E0E0E0',
};

const DIM = {
  drawerWidth:         Math.round(SCREEN_WIDTH * 0.78),
  avatarLarge:         100,
  avatarSmall:         40,
  headerHeight:        220,
  iconSize:            28,
  drawerIconSize:      26,
  drawerItemHeight:    64,
  drawerLabelFontSize: 18,
};

export default function DrawerNav() {
  const { token, setToken } = useAuth();
  const navigation = useNavigation();
  const [profileUri, setProfileUri] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const resp = await fetch(`${API_URL}/api/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`Status ${resp.status}`);
        const json = await resp.json();
        const profile = Array.isArray(json) ? json[0] : json;
        if (profile.profile_picture) {
          setProfileUri(`${API_URL}${profile.profile_picture}`);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      }
    })();
  }, [token]);

  const pickAndUpload = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission Needed', 'Please grant access to update your picture.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      let localUri = result.assets[0].uri;
      if (Platform.OS === 'android' && !localUri.startsWith('file://')) {
        localUri = 'file://' + localUri;
      }
      const formData = new FormData();
      formData.append('profile_picture', {
        uri: localUri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      });

      const uploadResp = await fetch(`${API_URL}/api/profile/picture/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadResp.ok) throw new Error(`Upload failed: ${uploadResp.status}`);
      const { profile_picture } = await uploadResp.json();
      setProfileUri(`${API_URL}${profile_picture}`);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Could not update picture.');
    }
  }, [token]);

  const handleLogout = useCallback(() => {
    setToken(null);
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })
    );
  }, [navigation, setToken]);

  function CustomDrawerContent(props) {
    return (
      <SafeAreaView style={styles.drawerContainer}>
        <LinearGradient
          colors={['#1E1E1E', '#121212']}
          style={styles.headerContainer}
        >
          <TouchableOpacity onPress={pickAndUpload} style={styles.avatarWrapper}>
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={styles.avatarLarge} />
            ) : (
              <FontAwesome
                name="user-circle"
                size={DIM.avatarLarge}
                color={COLORS.textLight}
              />
            )}
          </TouchableOpacity>
          <Text style={styles.appTitle}>TodoListApp</Text>
        </LinearGradient>

        <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
          <DrawerItemList {...props} />
        </DrawerContentScrollView>

        <TouchableOpacity style={styles.logoutContainer} onPress={handleLogout}>
          <View style={styles.logoutInner}>
            <FontAwesome name="sign-out" size={DIM.iconSize} color={COLORS.secondary} />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle:       { backgroundColor: '#1E1E1E', elevation: 0 },
        headerTintColor:    COLORS.textLight,
        headerTitleStyle:  { fontSize: 22, fontWeight: '600', color: COLORS.textLight },

        drawerStyle:        { backgroundColor: '#121212', width: DIM.drawerWidth },
        drawerActiveTintColor:   COLORS.primary,
        drawerInactiveTintColor: '#888888',
        drawerItemStyle:    {
          height: DIM.drawerItemHeight,
          justifyContent: 'center',
          borderRadius: 8,
          marginVertical: 4,
        },
        drawerLabelStyle:   {
          fontSize: DIM.drawerLabelFontSize,
          color: COLORS.textLight,
          marginLeft: -8,
        },

        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={styles.menuButton}
          >
            <FontAwesome name="bars" size={DIM.iconSize} color={COLORS.textLight} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={pickAndUpload} style={styles.avatarSmallWrapper}>
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={styles.avatarSmall} />
            ) : (
              <FontAwesome
                name="user-circle"
                size={DIM.avatarSmall}
                color={COLORS.textLight}
              />
            )}
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color }) => (
            <FontAwesome name="tachometer" size={DIM.drawerIconSize} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Tasks"
        component={HomeScreen}
        options={{
          title: 'My Tasks',
          drawerIcon: ({ color }) => (
            <FontAwesome name="tasks" size={DIM.drawerIconSize} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          drawerIcon: ({ color }) => (
            <FontAwesome name="history" size={DIM.drawerIconSize} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'space-between',
  },
  headerContainer: {
    height: DIM.headerHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: COLORS.textLight,
    borderRadius: DIM.avatarLarge / 2,
    padding: 3,
  },
  avatarLarge: {
    width: DIM.avatarLarge,
    height: DIM.avatarLarge,
    borderRadius: DIM.avatarLarge / 2,
  },
  appTitle: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  scroll: {
    paddingTop: 12,
    backgroundColor: '#121212',
  },
  logoutContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  logoutInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 16,
    fontSize: 18,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  menuButton: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 8,
  },
  avatarSmallWrapper: {
    marginRight: 16,
    padding: 6,
    borderRadius: DIM.avatarSmall / 2,
    overflow: 'hidden',
  },
  avatarSmall: {
    width: DIM.avatarSmall,
    height: DIM.avatarSmall,
    borderRadius: DIM.avatarSmall / 2,
    borderWidth: 1,
    borderColor: COLORS.textLight,
  },
});
