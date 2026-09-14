import { Alert, Platform } from 'react-native';

export function confirmEmployeeDelete(employeeCode: string): Promise<boolean> {
  const title = 'Delete employee';
  const message = `${employeeCode} will be removed. This code can be used again for a new employee.`;

  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`),
    );
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
