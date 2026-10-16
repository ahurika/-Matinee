import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';
import { fontFamily, radius, space } from '../tokens';
import { Text } from './Text';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helper?: string;
  secure?: boolean;
  leading?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function Input({
  label,
  value,
  onChangeText,
  error,
  helper,
  secure = false,
  leading,
  containerStyle,
  disabled = false,
  placeholder,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = Boolean(error);

  const getBorderColor = () => {
    if (hasError) return colors.error;
    if (focused) return colors.primary;
    return colors.outline;
  };

  const borderWidth = focused || hasError ? 2 : 1;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text variant="label" color="onSurface" style={styles.label}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surfaceContainerHigh,
            borderColor: getBorderColor(),
            borderWidth,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {leading ? <View style={styles.leadingContainer}>{leading}</View> : null}

        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry={secure && !showPassword}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.textInput,
            {
              color: colors.onSurface,
              fontFamily: fontFamily.regular,
            },
          ]}
        />

        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.trailingContainer}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <View
          accessible
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.messageRow}
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={14}
            color={colors.error}
            style={styles.messageIcon}
          />
          <Text variant="caption" style={{ color: colors.error }}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text variant="caption" color="onSurfaceVariant" style={styles.helperText}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: space[1],
  },
  inputContainer: {
    height: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    paddingVertical: 0,
  },
  leadingContainer: {
    marginRight: space[2],
  },
  trailingContainer: {
    marginLeft: space[2],
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[1],
  },
  messageIcon: {
    marginRight: 4,
  },
  helperText: {
    marginTop: space[1],
  },
});
