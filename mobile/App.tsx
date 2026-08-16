import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/AuthContext';
import { RealtimeProvider } from './src/RealtimeContext';
import { theme } from './src/theme';
import TodayScreen from './src/screens/TodayScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import DrinksScreen from './src/screens/DrinksScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DrinkDetailScreen from './src/screens/DrinkDetailScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import MyLibraryScreen from './src/screens/MyLibraryScreen';
import MemoEditScreen from './src/screens/MemoEditScreen';
import MemosScreen from './src/screens/MemosScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ChatScreen from './src/screens/ChatScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

export type RootStackParamList = {
  Tabs: undefined;
  DrinkDetail: { id: string; drink?: any };
  PostDetail: { id: number };
  CreatePost: undefined;
  MyLibrary: undefined;
  MemoEdit: { date: string; memoId?: number; content?: string };
  Memos: undefined;
  UserProfile: { userId: number };
  Messages: undefined;
  Chat: { userId: number; username?: string };
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Today: '☀️',
  Calendar: '📅',
  Drinks: '🍸',
  Community: '💬',
  Profile: '👤',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryDark,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: '今日' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: '日历' }} />
      <Tab.Screen name="Drinks" component={DrinksScreen} options={{ title: '酒库' }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ title: '社区' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <View style={styles.shell}>
      <View style={styles.phone}>
        <AuthProvider>
          <RealtimeProvider>
          <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.bg },
            headerShadowVisible: false,
            headerTintColor: theme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: theme.colors.bg },
          }}
        >
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="DrinkDetail" component={DrinkDetailScreen} options={{ title: '酒品详情' }} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: '帖子' }} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: '发布配方' }} />
          <Stack.Screen name="MyLibrary" component={MyLibraryScreen} options={{ title: '我的酒库' }} />
          <Stack.Screen name="MemoEdit" component={MemoEditScreen} options={{ title: '便签' }} />
          <Stack.Screen name="Memos" component={MemosScreen} options={{ title: '全部便签' }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '用户主页' }} />
          <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: '私信' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route.params?.username ? '@' + route.params.username : '私信' })} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: '通知' }} />
        </Stack.Navigator>
          </NavigationContainer>
          </RealtimeProvider>
        </AuthProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#E8E4DE' },
  phone: { flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center', backgroundColor: theme.colors.bg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
});
