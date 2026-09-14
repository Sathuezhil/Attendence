import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchSettings, updateSettings } from '@/features/settings/api';
import { AppSettings, UpdateAppSettings } from '@/features/settings/types';
import { leaveTypes } from '@/features/leave/format';
import { ApiError } from '@/lib/api';
import { colors, radius, space, touch } from '@/theme';
import { ErrorState, LoadingState } from '@/ui/screen-state';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TITLES: Record<string, string> = {
  company: 'Company',
  hours: 'Working hours',
  leave: 'Leave',
  payroll: 'Payroll',
  notifications: 'Notifications',
  documents: 'Documents',
};

export default function SettingsSectionScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { section } = useLocalSearchParams<{ section: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    enabled: isReady && isAuthenticated,
  });

  useEffect(() => {
    navigation.setOptions({ title: TITLES[section] ?? 'Settings' });
  }, [navigation, section]);

  useEffect(() => {
    if (query.data) {
      setDraft(query.data);
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: (payload: UpdateAppSettings) => updateSettings(payload),
    async onSuccess(result) {
      setDraft(result);
      setMessage('Settings saved');
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (!isReady || !isAuthenticated || query.isPending || !draft) {
    return <LoadingState message="Loading settings…" />;
  }

  if (query.error) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Unable to load settings.'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  function persist() {
    if (!draft) {
      return;
    }
    setMessage(null);
    if (section === 'company') {
      save.mutate({ company: draft.company });
      return;
    }
    if (section === 'hours') {
      save.mutate({ workingHours: draft.workingHours });
      return;
    }
    if (section === 'leave') {
      save.mutate({ leave: draft.leave });
      return;
    }
    if (section === 'payroll') {
      save.mutate({ payroll: draft.payroll });
      return;
    }
    if (section === 'notifications') {
      save.mutate({ notifications: draft.notifications });
      return;
    }
    if (section === 'documents') {
      save.mutate({ documents: draft.documents });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {section === 'company' ? (
          <>
            <Field
              label="Company name"
              value={draft.company.name}
              onChange={(name) => setDraft({ ...draft, company: { ...draft.company, name } })}
            />
            <Field
              label="Address"
              value={draft.company.address}
              onChange={(address) => setDraft({ ...draft, company: { ...draft.company, address } })}
              multiline
            />
            <Field
              label="Phone"
              value={draft.company.phone}
              onChange={(phone) => setDraft({ ...draft, company: { ...draft.company, phone } })}
            />
            <Field
              label="Email"
              value={draft.company.email}
              keyboardType="email-address"
              onChange={(email) => setDraft({ ...draft, company: { ...draft.company, email } })}
            />
            <Field
              label="Website"
              value={draft.company.website}
              onChange={(website) => setDraft({ ...draft, company: { ...draft.company, website } })}
            />
            <Field
              label="VAT / tax number"
              value={draft.company.vatNumber}
              onChange={(vatNumber) =>
                setDraft({ ...draft, company: { ...draft.company, vatNumber } })
              }
            />
            <Field
              label="Logo URL"
              value={draft.company.logoUrl}
              onChange={(logoUrl) => setDraft({ ...draft, company: { ...draft.company, logoUrl } })}
            />
          </>
        ) : null}

        {section === 'hours' ? (
          <>
            <Field
              label="Start time (HH:MM)"
              value={draft.workingHours.start}
              onChange={(start) =>
                setDraft({ ...draft, workingHours: { ...draft.workingHours, start } })
              }
            />
            <Field
              label="End time (HH:MM)"
              value={draft.workingHours.end}
              onChange={(end) =>
                setDraft({ ...draft, workingHours: { ...draft.workingHours, end } })
              }
            />
            <Field
              label="Break duration (minutes)"
              value={String(draft.workingHours.breakDurationMinutes)}
              keyboardType="number-pad"
              onChange={(value) =>
                setDraft({
                  ...draft,
                  workingHours: {
                    ...draft.workingHours,
                    breakDurationMinutes: Number(value) || 0,
                  },
                })
              }
            />
            <Field
              label="Late threshold (minutes)"
              value={String(draft.workingHours.lateThresholdMinutes)}
              keyboardType="number-pad"
              onChange={(value) =>
                setDraft({
                  ...draft,
                  workingHours: {
                    ...draft.workingHours,
                    lateThresholdMinutes: Number(value) || 0,
                  },
                })
              }
            />
            <Text style={styles.label}>Working days</Text>
            <View style={styles.chips}>
              {DAY_LABELS.map((label, day) => {
                const selected = draft.workingHours.workingDays.includes(day);
                return (
                  <Pressable
                    key={label}
                    onPress={() => {
                      const workingDays = selected
                        ? draft.workingHours.workingDays.filter((item) => item !== day)
                        : [...draft.workingHours.workingDays, day].sort((a, b) => a - b);
                      setDraft({
                        ...draft,
                        workingHours: { ...draft.workingHours, workingDays },
                      });
                    }}
                    style={[styles.chip, selected ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {section === 'leave' ? (
          <>
            {leaveTypes.map((type) => (
              <Field
                key={type}
                label={`${type.replaceAll('_', ' ')} limit (days)`}
                value={String(draft.leave.limits[type] ?? 0)}
                keyboardType="number-pad"
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    leave: {
                      limits: { ...draft.leave.limits, [type]: Number(value) || 0 },
                    },
                  })
                }
              />
            ))}
          </>
        ) : null}

        {section === 'payroll' ? (
          <>
            <Field
              label="Working days / month"
              value={String(draft.payroll.workingDaysPerMonth)}
              keyboardType="number-pad"
              onChange={(value) =>
                setDraft({
                  ...draft,
                  payroll: {
                    ...draft.payroll,
                    workingDaysPerMonth: Number(value) || 1,
                  },
                })
              }
            />
            <Toggle
              label="Overtime enabled"
              value={draft.payroll.overtimeEnabled}
              onChange={(overtimeEnabled) =>
                setDraft({ ...draft, payroll: { ...draft.payroll, overtimeEnabled } })
              }
            />
          </>
        ) : null}

        {section === 'notifications' ? (
          <>
            <Toggle
              label="Notifications enabled"
              value={draft.notifications.enabled}
              onChange={(enabled) =>
                setDraft({ ...draft, notifications: { ...draft.notifications, enabled } })
              }
            />
            <Toggle
              label="Document expiry"
              value={draft.notifications.documentExpiry}
              onChange={(documentExpiry) =>
                setDraft({ ...draft, notifications: { ...draft.notifications, documentExpiry } })
              }
            />
            <Toggle
              label="Leave"
              value={draft.notifications.leave}
              onChange={(leave) =>
                setDraft({ ...draft, notifications: { ...draft.notifications, leave } })
              }
            />
            <Toggle
              label="Attendance alerts"
              value={draft.notifications.attendance}
              onChange={(attendance) =>
                setDraft({ ...draft, notifications: { ...draft.notifications, attendance } })
              }
            />
            <Toggle
              label="Payroll created"
              value={draft.notifications.payroll}
              onChange={(payroll) =>
                setDraft({ ...draft, notifications: { ...draft.notifications, payroll } })
              }
            />
            <Toggle
              label="Invoice overdue"
              value={draft.notifications.invoices}
              onChange={(invoices) =>
                setDraft({ ...draft, notifications: { ...draft.notifications, invoices } })
              }
            />
          </>
        ) : null}

        {section === 'documents' ? (
          <>
            <Field
              label="Expiry warning days"
              value={String(draft.documents.expiryWarningDays)}
              keyboardType="number-pad"
              onChange={(value) =>
                setDraft({
                  ...draft,
                  documents: {
                    ...draft.documents,
                    expiryWarningDays: Number(value) || 1,
                  },
                })
              }
            />
            <Field
              label="Expiry urgent days"
              value={String(draft.documents.expiryUrgentDays)}
              keyboardType="number-pad"
              onChange={(value) =>
                setDraft({
                  ...draft,
                  documents: {
                    ...draft.documents,
                    expiryUrgentDays: Number(value) || 1,
                  },
                })
              }
            />
          </>
        ) : null}

        {save.error ? (
          <Text style={styles.error}>
            {save.error instanceof ApiError ? save.error.message : 'Unable to save settings.'}
          </Text>
        ) : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable disabled={save.isPending} onPress={persist} style={styles.button}>
          <Text style={styles.buttonText}>{save.isPending ? 'Saving…' : 'Save settings'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: 'email-address' | 'number-pad' | 'default';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
        placeholderTextColor="#9ca3af"
        style={[styles.input, multiline ? styles.multiline : null]}
      />
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: space.lg,
    paddingBottom: 40,
    gap: space.lg,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    minHeight: touch.minHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontWeight: '700',
    color: '#374151',
  },
  chipTextActive: {
    color: colors.white,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    minHeight: touch.minHeight,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    paddingRight: space.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
  },
  success: {
    color: colors.success,
    fontWeight: '600',
  },
});
