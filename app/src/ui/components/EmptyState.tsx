import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { space } from '../tokens';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  icon = 'filmstrip-off',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.onSurfaceVariant} />
      </View>

      <Text variant="title2" color="onSurface" style={styles.title}>
        {title}
      </Text>

      <Text variant="bodySmall" color="onSurfaceVariant" style={styles.message}>
        {message}
      </Text>

      {actionLabel && onAction ? (
        <View style={styles.actionContainer}>
          <Button label={actionLabel} variant="outline" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  iconCircle: {
    marginBottom: space[4],
    opacity: 0.8,
  },
  title: {
    textAlign: 'center',
    marginBottom: space[2],
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: space[6],
  },
});
