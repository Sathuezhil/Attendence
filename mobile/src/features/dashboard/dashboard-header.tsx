import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PublicAdmin } from '@/features/auth/types';
import { colors, radius, shadow, space, touch } from '@/theme';
import { AppIcon } from '@/ui/icon';

interface DashboardHeaderProps {
  user: PublicAdmin;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function firstName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? 'Admin';
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

export function DashboardHeader({
  user,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <View style={styles.header}>
      <View style={styles.titles}>
        <Text style={styles.greeting}>
          {greeting()}, {firstName(user.name)}
        </Text>
        <Text style={styles.appName}>Employee Management</Text>
        <Text style={styles.title}>Boss Dashboard</Text>
        <Text style={styles.date}>{formatToday()}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          onPress={onOpenNotifications}
          style={({ pressed }) => [styles.bell, pressed ? styles.pressed : null]}
        >
          <AppIcon
            name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
            size={22}
            color={colors.white}
          />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
          onPress={() => setMenuOpen((current) => !current)}
          style={({ pressed }) => [styles.avatar, pressed ? styles.pressed : null]}
        >
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </Pressable>
      </View>

      {menuOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close profile menu"
              onPress={closeMenu}
              style={styles.modalBackdrop}
            />
            <View style={[styles.menu, shadow, { top: insets.top + 8, right: 16 }]}>
              <Text style={styles.menuName} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.menuEmail} numberOfLines={1}>
                {user.email}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  closeMenu();
                  onOpenProfile();
                }}
                style={({ pressed }) => [styles.menuItem, pressed ? styles.menuItemPressed : null]}
              >
                <AppIcon name="person-outline" size={18} color={colors.text} />
                <Text style={styles.menuItemText}>Profile</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  closeMenu();
                  onOpenSettings();
                }}
                style={({ pressed }) => [styles.menuItem, pressed ? styles.menuItemPressed : null]}
              >
                <AppIcon name="settings-outline" size={18} color={colors.text} />
                <Text style={styles.menuItemText}>Settings</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log out"
                onPress={() => {
                  closeMenu();
                  onLogout();
                }}
                style={({ pressed }) => [styles.logoutButton, pressed ? styles.pressed : null]}
              >
                <AppIcon name="log-out-outline" size={18} color={colors.white} />
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.lg,
    zIndex: 30,
  },
  titles: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.2,
  },
  appName: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    zIndex: 31,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(31, 182, 166, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 42, 61, 0.38)',
  },
  menu: {
    position: 'absolute',
    width: 260,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 8,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  menuEmail: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  menuItem: {
    minHeight: touch.minHeight,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: '#eef7f8',
  },
  menuItemPressed: {
    backgroundColor: '#d8eef0',
  },
  menuItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    minHeight: touch.minHeight,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
