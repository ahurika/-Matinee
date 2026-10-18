import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import { Button } from './Button';
import { Text } from './Text';

export type DialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function Dialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onDismiss,
}: DialogProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View
        accessible
        accessibilityViewIsModal
        accessibilityRole="alert"
        style={styles.overlay}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
          onPress={loading ? undefined : onDismiss}
          style={styles.scrim}
        />

        <View
          style={[
            styles.dialogCard,
            {
              backgroundColor: colors.surfaceContainerLow,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <Text variant="title2" color="onSurface" style={styles.title}>
            {title}
          </Text>

          <Text variant="bodySmall" color="onSurfaceVariant" style={styles.message}>
            {message}
          </Text>

          <View style={styles.buttonRow}>
            {cancelLabel ? (
              <Button
                label={cancelLabel}
                variant="text"
                disabled={loading}
                onPress={onDismiss}
                style={styles.cancelButton}
              />
            ) : null}

            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              loading={loading}
              onPress={onConfirm}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[4],
  },
  scrim: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space[5],
    zIndex: 1,
  },
  title: {
    marginBottom: space[2],
  },
  message: {
    marginBottom: space[5],
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: space[2],
  },
  cancelButton: {
    minWidth: 80,
  },
  confirmButton: {
    minWidth: 100,
  },
});
