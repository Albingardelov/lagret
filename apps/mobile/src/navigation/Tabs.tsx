import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { HouseholdScreen } from '../screens/HouseholdScreen'
import { InventoryScreen } from '../screens/InventoryScreen'
import { RecipesScreen } from '../screens/RecipesScreen'
import { ShoppingScreen } from '../screens/ShoppingScreen'

type TabsParamList = {
  Inventory: undefined
  Recipes: undefined
  Shopping: undefined
  Household: undefined
}

const Tab = createBottomTabNavigator<TabsParamList>()

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { colors } = useTheme()
  const fg = focused ? colors.terra : colors.mutedText
  const bg = focused ? colors.terraSoft : 'transparent'

  return (
    <View
      style={{
        width: 40,
        height: 32,
        borderRadius: 10,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: fg, fontWeight: focused ? '800' : '600', fontSize: 12 }}>
        {label.slice(0, 1)}
      </Text>
    </View>
  )
}

export function Tabs() {
  const { colors } = useTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.terra, fontWeight: '900', fontSize: 20 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: colors.terra,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
      }}
    >
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          title: 'Lagret',
          tabBarLabel: 'Lagret',
          tabBarIcon: ({ focused }) => <TabIcon label="Lagret" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          title: 'Recept',
          tabBarLabel: 'Recept',
          tabBarIcon: ({ focused }) => <TabIcon label="Recept" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingScreen}
        options={{
          title: 'Inköp',
          tabBarLabel: 'Inköp',
          tabBarIcon: ({ focused }) => <TabIcon label="Inköp" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Household"
        component={HouseholdScreen}
        options={{
          title: 'Hushåll',
          tabBarLabel: 'Hushåll',
          tabBarIcon: ({ focused }) => <TabIcon label="Hushåll" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}
