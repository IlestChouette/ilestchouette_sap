import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#1B5E9B';

function TabIcon({ emoji, active }: { emoji: string; active: boolean }) {
  return <Text style={{ fontSize: 22, opacity: active ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom + 8 : 20;
  const tabHeight = Platform.OS === 'android' ? 56 + insets.bottom : 80;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingBottom: bottomPad,
          paddingTop: 8,
          height: tabHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Missions',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🚴" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Historique',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" active={focused} />,
        }}
      />
    </Tabs>
  );
}
