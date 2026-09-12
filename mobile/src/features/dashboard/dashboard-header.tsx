import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PublicAdmin } from '@/features/auth/types';

interface DashboardHeaderProps {
  user: PublicAdmin;
  onLogout: () => void;
}

function formatToday(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'A';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.header}>
      <View style={styles.titles}>
        <Text style={styles.appName}>Employee Management</Text>
        <Text style={styles.title}>Boss Dashboard</Text>
        <Text style={styles.date}>{formatToday()}</Text>
      </View>

      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
          onPress={() => setMenuOpen((current) => !current)}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </Pressable>

        {menuOpen ? (
          <View style={styles.menu}>
            <Text style={styles.menuName}>{user.name}</Text>
            <Text style={styles.menuEmail}>{user.email}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={() => {
                setMenuOpen(false);
                onLogout();
              }}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  titles: {
    flex: 1,
    gap: 4,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#4b5563',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  menu: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 4,
    zIndex: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(17, 24, 39, 0.12)',
      },
      default: {
        elevation: 4,
        shadowColor: '#111827',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  menuName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  menuEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  logoutButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
