import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import { ApiError } from '@/lib/api';
import { PickedDocument } from './types';

interface EmiratesIdScannerProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (file: PickedDocument) => void;
}

export function EmiratesIdScanner({ visible, onClose, onCapture }: EmiratesIdScannerProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    if (!cameraRef.current || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        shutterSound: false,
      });
      if (!photo?.uri) {
        throw new ApiError('Could not capture the ID. Try again.', 400);
      }
      onCapture({
        uri: photo.uri,
        name: `emirates-id-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to scan Emirates ID.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.screen}>
        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centered}>
            <Text style={styles.title}>Camera needed</Text>
            <Text style={styles.hint}>Allow camera to scan the Emirates ID like a scanner.</Text>
            <Pressable onPress={() => void requestPermission()} style={styles.button}>
              <Text style={styles.buttonText}>Allow camera</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.ghost}>
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              facing="back"
              mode="picture"
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.maskTop} />
              <View style={styles.middle}>
                <View style={styles.maskSide} />
                <View style={styles.frame}>
                  <View style={[styles.corner, styles.cornerTl]} />
                  <View style={[styles.corner, styles.cornerTr]} />
                  <View style={[styles.corner, styles.cornerBl]} />
                  <View style={[styles.corner, styles.cornerBr]} />
                </View>
                <View style={styles.maskSide} />
              </View>
              <View style={styles.maskBottom} />
            </View>
            <View style={styles.topBar}>
              <Text style={styles.guide}>Place Emirates ID inside the frame</Text>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.bottomBar}>
              <Pressable onPress={onClose} style={styles.ghost}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => void capture()}
                style={[styles.shutter, busy ? styles.shutterBusy : null]}
              >
                {busy ? <ActivityIndicator color="#0c4a62" /> : <View style={styles.shutterInner} />}
              </Pressable>
              <View style={styles.ghostSpacer} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const FRAME_HEIGHT = 210;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  middle: {
    height: FRAME_HEIGHT,
    flexDirection: 'row',
  },
  maskSide: {
    width: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  frame: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1fb6a6',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#ffffff',
  },
  cornerTl: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTr: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBl: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBr: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  guide: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  error: {
    position: 'absolute',
    bottom: 140,
    left: 24,
    right: 24,
    color: '#fecdd3',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1fb6a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  ghost: {
    minWidth: 72,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostSpacer: {
    minWidth: 72,
  },
  ghostText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutterBusy: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
  },
});
