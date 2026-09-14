import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, touch } from '@/theme';
import { AppIcon } from '@/ui/icon';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(value: string): string {
  const date = parseDateValue(value);
  if (!date) {
    return value;
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function mondayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function DateField({
  value,
  onChange,
  placeholder = 'Select date',
  allowClear = true,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const selected = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selected ?? startOfToday());

  function openCalendar() {
    setVisibleMonth(selected ?? startOfToday());
    setOpen(true);
  }

  function choose(date: Date) {
    onChange(formatDateValue(date));
    setOpen(false);
  }

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const first = new Date(year, month, 1);
    const blank = mondayIndex(first);
    const total = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: blank }, () => null);
    for (let day = 1; day <= total; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [visibleMonth]);

  const today = startOfToday();
  const label = selected ? formatDateLabel(value) : '';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={openCalendar}
        style={[styles.field, style]}
      >
        <AppIcon color={colors.primary} name="calendar-outline" size={18} />
        <Text numberOfLines={1} style={[styles.fieldText, label ? null : styles.placeholder]}>
          {label || placeholder}
        </Text>
        {allowClear && value ? (
          <Pressable
            accessibilityLabel="Clear date"
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onChange('');
            }}
          >
            <AppIcon color={colors.muted} name="close-circle" size={18} />
          </Pressable>
        ) : null}
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={styles.modalRoot}>
          <Pressable onPress={() => setOpen(false)} style={styles.backdrop} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Pressable
                accessibilityLabel="Previous year"
                onPress={() => setVisibleMonth((current) => shiftMonth(current, -12))}
                style={styles.nav}
              >
                <AppIcon color={colors.text} name="play-skip-back-outline" size={18} />
              </Pressable>
              <Pressable
                accessibilityLabel="Previous month"
                onPress={() => setVisibleMonth((current) => shiftMonth(current, -1))}
                style={styles.nav}
              >
                <AppIcon color={colors.text} name="chevron-back" size={20} />
              </Pressable>
              <Text style={styles.month}>
                {MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </Text>
              <Pressable
                accessibilityLabel="Next month"
                onPress={() => setVisibleMonth((current) => shiftMonth(current, 1))}
                style={styles.nav}
              >
                <AppIcon color={colors.text} name="chevron-forward" size={20} />
              </Pressable>
              <Pressable
                accessibilityLabel="Next year"
                onPress={() => setVisibleMonth((current) => shiftMonth(current, 12))}
                style={styles.nav}
              >
                <AppIcon color={colors.text} name="play-skip-forward-outline" size={18} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {days.map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const isSelected = selected ? sameDay(date, selected) : false;
                const isToday = sameDay(date, today);

                return (
                  <Pressable
                    key={formatDateValue(date)}
                    onPress={() => choose(date)}
                    style={[
                      styles.dayCell,
                      isToday ? styles.today : null,
                      isSelected ? styles.selected : null,
                    ]}
                  >
                    <Text style={[styles.dayText, isSelected ? styles.selectedText : null]}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Pressable onPress={() => choose(today)} style={styles.footerButton}>
                <Text style={styles.footerText}>Today</Text>
              </Pressable>
              {allowClear ? (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  style={styles.footerButton}
                >
                  <Text style={styles.footerText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setOpen(false)} style={[styles.footerButton, styles.done]}>
                <Text style={styles.doneText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: touch.minHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  fieldText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  placeholder: {
    color: '#9ca3af',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nav: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  month: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  today: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  selectedText: {
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
  },
  footerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: '#e8f0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontWeight: '700',
    color: colors.text,
  },
  done: {
    backgroundColor: colors.primary,
  },
  doneText: {
    fontWeight: '700',
    color: colors.white,
  },
});
