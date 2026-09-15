import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/lib/api';
import { PickedDocument } from './types';

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png'];
const EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export function isAllowedDocumentName(name: string): boolean {
  const lower = name.toLowerCase();
  return EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function mimeFromName(name: string, fallback: string | null): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return fallback && fallback.length > 0 ? fallback : 'application/octet-stream';
}

export async function pickDocumentFile(): Promise<PickedDocument | null> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return pickFromWebInput(['.pdf', '.jpg', '.jpeg', '.png']);
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
  const name = asset.name ?? 'document';
  return {
    uri: asset.uri,
    name,
    mimeType: mimeFromName(name, asset.mimeType ?? null),
    size: asset.size,
  };
}

export async function pickPdfFile(): Promise<PickedDocument | null> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return pickFromWebInput(['.pdf']);
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const name = asset.name ?? 'document.pdf';
  return {
    uri: asset.uri,
    name,
    mimeType: mimeFromName(name, asset.mimeType ?? 'application/pdf'),
    size: asset.size,
  };
}

function pickFromWebInput(accept: string[]): Promise<PickedDocument | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept.join(',');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      resolve({
        uri: URL.createObjectURL(file),
        name: file.name,
        mimeType: file.type || mimeFromName(file.name, null),
        size: file.size,
        file,
      });
    };
    input.click();
  });
}

export async function captureDocumentPhoto(): Promise<PickedDocument | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new ApiError('Camera permission is required to scan Emirates ID.', 400);
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect: [85, 54],
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const name = asset.fileName ?? `emirates-id-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    mimeType: mimeFromName(name, asset.mimeType ?? 'image/jpeg'),
    size: asset.fileSize,
  };
}
