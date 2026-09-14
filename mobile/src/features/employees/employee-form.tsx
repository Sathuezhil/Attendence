import type { ReactNode } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateField } from '@/ui/date-field';
import { EmployeeFormValues } from './schema';
import { employmentStatuses, genders } from './schema';
import { statusLabel } from './form-utils';

interface EmployeeFormProps {
  control: Control<EmployeeFormValues>;
  errors: FieldErrors<EmployeeFormValues>;
}

export function EmployeeForm({ control, errors }: EmployeeFormProps) {
  return (
    <View style={styles.form}>
      <Text style={styles.section}>Personal information</Text>
      <Field label="First name" error={errors.firstName?.message}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="First name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value}
            />
          )}
        />
      </Field>
      <Field label="Last name" error={errors.lastName?.message}>
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Last name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value}
            />
          )}
        />
      </Field>
      <Field label="Date of birth" error={errors.dateOfBirth?.message}>
        <Controller
          control={control}
          name="dateOfBirth"
          render={({ field: { onChange, value } }) => (
            <DateField onChange={onChange} placeholder="Select date of birth" value={value ?? ''} />
          )}
        />
      </Field>
      <Text style={styles.label}>Gender</Text>
      <Controller
        control={control}
        name="gender"
        render={({ field: { onChange, value } }) => (
          <View style={styles.chips}>
            {genders.map((option) => (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                style={[styles.chip, value === option ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, value === option ? styles.chipTextActive : null]}>
                  {statusLabel(option)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      />
      <Field label="Nationality" error={errors.nationality?.message}>
        <Controller
          control={control}
          name="nationality"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Nationality"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />
      </Field>

      <Text style={styles.section}>Contact</Text>
      <Field label="Email" error={errors.email?.message}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="email@company.com"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              keyboardType="phone-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="+971 50 000 0000"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />
      </Field>
      <Field label="Alternate phone" error={errors.alternatePhone?.message}>
        <Controller
          control={control}
          name="alternatePhone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              keyboardType="phone-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Optional"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />
      </Field>

      <Text style={styles.section}>Employment</Text>
      <Field label="Employee code" error={errors.employeeCode?.message}>
        <Controller
          control={control}
          name="employeeCode"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="characters"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="EMP-001"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value}
            />
          )}
        />
      </Field>
      <Field label="Job title" error={errors.jobTitle?.message}>
        <Controller
          control={control}
          name="jobTitle"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Job title"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />
      </Field>
      <Field label="Joining date" error={errors.joiningDate?.message}>
        <Controller
          control={control}
          name="joiningDate"
          render={({ field: { onChange, value } }) => (
            <DateField onChange={onChange} placeholder="Select joining date" value={value ?? ''} />
          )}
        />
      </Field>
      <Text style={styles.label}>Employment status</Text>
      <Controller
        control={control}
        name="employmentStatus"
        render={({ field: { onChange, value } }) => (
          <View style={styles.chips}>
            {employmentStatuses.map((option) => (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                style={[styles.chip, value === option ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, value === option ? styles.chipTextActive : null]}>
                  {statusLabel(option)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      />

      <Text style={styles.section}>Salary</Text>
      <Field label="Basic salary" error={errors.basicSalary?.message}>
        <Controller
          control={control}
          name="basicSalary"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              keyboardType="decimal-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />
      </Field>
    </View>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  section: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#111827',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
