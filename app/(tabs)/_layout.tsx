import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tema } from '../../src/tema';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tema.primario,
        tabBarInactiveTintColor: '#829095',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
        tabBarStyle: {
          backgroundColor: tema.superficie,
          borderTopColor: tema.borde,
          height: 66 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{ ios: focused ? 'house.fill' : 'house', android: 'home', web: 'home' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lineas"
        options={{
          title: 'Líneas',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'bus', android: 'directions_bus', web: 'directions_bus' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="paradas"
        options={{
          title: 'Paradas',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'mappin.and.ellipse',
                android: 'location_on',
                web: 'location_on',
              }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Cuenta',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.crop.circle',
                android: 'person',
                web: 'person',
              }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
