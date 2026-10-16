import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import { Text } from './Text';

export type ChipTone = 'neutral' | 'info' | 'warning' | 'error' | 'success';

export type ChipProps = {
  label: string;
  selected?: boolean;
  tone?: ChipTone;
  icon?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function Chip({
  label,
  selected = false,
  tone = 'neutral',
  icon,
  onPress,
  style,
  disabled = false,
}: ChipProps) {
  const { colors } = useTheme();

  const getPalette = () => {
    if (selected) {
      return {
        bg: colors.primaryContainer,
        border: colors.primary,
        fg: colors.onPrimaryContainer,
      };
    }

    switch (tone) {
      case 'info':
        return { bg: colors.infoContainer, border: 'transparent', fg: colors.onInfoContainer };
      case 'warning':
        return { bg: colors.warningContainer, border: 'transparent', fg: colors.onWarningContainer };
      case 'error':
        return { bg: colors.errorContainer, border: 'transparent', fg: colors.onErrorContainer };
      case 'success':
        return { bg: colors.successContainer, border: 'transparent', fg: colors.onSuccessContainer };
      case 'neutral':
      default:
        return { bg: colors.surfaceContainerHigh, border: colors.outlineVariant, fg: colors.onSurface };
    }
  };

  const palette = getPalette();

  const content = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text variant="label" style={{ color: palette.fg }}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: space[1],
  },
});
