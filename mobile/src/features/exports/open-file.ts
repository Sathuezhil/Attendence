import { Linking, Platform, Share } from 'react-native';
import { ApiError, apiRequestBinary } from '@/lib/api';

function sanitizeFileName(name: string): string {
  return name.replaceAll(/[^a-zA-Z0-9._-]/g, '_') || 'export.bin';
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  view.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return globalThis.btoa(binary);
}

export async function downloadAndOpenExport(path: string): Promise<void> {
  const file = await apiRequestBinary(path);
  const fileName = sanitizeFileName(file.fileName ?? 'export.bin');

  if (Platform.OS === 'web') {
    const blob = new Blob([file.bytes], { type: file.contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = await import('expo-file-system/legacy');
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(dest, bytesToBase64(file.bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest, {
        mimeType: file.contentType,
        dialogTitle: fileName,
      });
      return;
    }
  } catch {
    // Fall through to platform share / open.
  }

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { url: dest, title: fileName }
        : { message: dest, title: fileName },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('permission')) {
      throw new ApiError('File permission was denied. Allow storage access and try again.', 0);
    }
    try {
      await Linking.openURL(dest);
    } catch {
      throw new ApiError('Unable to open the exported file on this device.', 0);
    }
  }
}
