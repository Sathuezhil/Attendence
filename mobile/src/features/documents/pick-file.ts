import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { PickedDocument } from './types';

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png'];
const EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export function isAllowedDocumentName(name: string): boolean {
  const lower = name.toLowerCase();
  return EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export async function pickDocumentFile(): Promise<PickedDocument | null> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return pickFromWebInput();
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPT,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name ?? 'document',
    mimeType: asset.mimeType ?? null,
    size: asset.size,
  };
}

function pickFromWebInput(): Promise<PickedDocument | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      resolve({
        uri: URL.createObjectURL(file),
        name: file.name,
        mimeType: file.type || null,
        size: file.size,
        file,
      });
    };
    input.click();
  });
}
