import { z } from 'zod';

export const employmentStatuses = ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'] as const;
export const genders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;

function isEmpty(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

export const employeeFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  dateOfBirth: z
    .string()
    .optional()
    .refine((value) => isEmpty(value) || /^\d{4}-\d{2}-\d{2}$/.test(value ?? ''), {
      message: 'Use YYYY-MM-DD',
    }),
  gender: z.enum(genders).optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((value) => isEmpty(value) || z.string().email().safeParse(value).success, {
      message: 'Enter a valid email',
    }),
  phone: z
    .string()
    .optional()
    .refine((value) => isEmpty(value) || /^\+?[0-9\s()-]{7,20}$/.test(value ?? ''), {
      message: 'Enter a valid phone number',
    }),
  alternatePhone: z
    .string()
    .optional()
    .refine((value) => isEmpty(value) || /^\+?[0-9\s()-]{7,20}$/.test(value ?? ''), {
      message: 'Enter a valid phone number',
    }),
  employeeCode: z.string().trim().min(2, 'Employee code is required'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z
    .string()
    .optional()
    .refine((value) => isEmpty(value) || /^\d{4}-\d{2}-\d{2}$/.test(value ?? ''), {
      message: 'Use YYYY-MM-DD',
    }),
  employmentStatus: z.enum(employmentStatuses),
  basicSalary: z
    .string()
    .optional()
    .refine((value) => isEmpty(value) || !Number.isNaN(Number(value)), {
      message: 'Enter a valid salary',
    }),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
