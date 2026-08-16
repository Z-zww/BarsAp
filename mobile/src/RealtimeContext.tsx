import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api, getBase, getToken } from './api';
import { useAuth } from './AuthContext';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface RealtimeEvent {
  type: string;
  [key: string]: any;
}

interface RealtimeValue {
  connected: boolean;
  event: (RealtimeEvent & { eventId: number }) | null;
  onlineUsers: Set<number>;
}

const RealtimeContext = createContext<RealtimeValue>({ connected: false, event: null, onlineUsers: new Set() });

async function registerPushNotifications() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '消息通知', importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return;
  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.registerPushToken(pushToken.data, Platform.OS);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [event, setEvent] = useState<(RealtimeEvent & { eventId: number }) | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const eventId = useRef(0);

  useEffect(() => {
    if (!user || !getToken()) { setConnected(false); setOnlineUsers(new Set()); return; }
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      const wsBase = getBase().replace(/^http/, 'ws');
      socket = new WebSocket(wsBase + '/ws?token=' + encodeURIComponent(getToken() || ''));
      socket.onopen = () => setConnected(true);
      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(String(message.data));
          if (data.type === 'presence') {
            setOnlineUsers((current) => {
              const next = new Set(current);
              if (data.online) next.add(Number(data.userId)); else next.delete(Number(data.userId));
              return next;
            });
          }
          eventId.current += 1;
          setEvent({ ...data, eventId: eventId.current });
        } catch (error) {}
      };
      socket.onclose = () => {
        setConnected(false);
        if (!stopped) reconnectTimer = setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    registerPushNotifications().catch(() => {});
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [user?.id]);

  const value = useMemo(() => ({ connected, event, onlineUsers }), [connected, event, onlineUsers]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() { return useContext(RealtimeContext); }
