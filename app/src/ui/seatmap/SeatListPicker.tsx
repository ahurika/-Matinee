import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import { LABELS, visualFor } from './seatStyles';
import type { Seat } from './types';

type Props = {
  visible: boolean;
  onClose: () => void;
  seats: Seat[];
  selectedIds: ReadonlySet<string>;
  onToggle: (seat: Seat, nextSelected: boolean) => void;
};

export function SeatListPicker({ visible, onClose, seats, selectedIds, onToggle }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Extract unique rows
  const rowLabels = useMemo(() => Array.from(new Set(seats.map((s) => s.row))).sort(), [seats]);
  const [selectedRow, setSelectedRow] = useState<string>(rowLabels[0] || 'A');

  const rowSeats = useMemo(
    () => seats.filter((s) => s.row === selectedRow).sort((a, b) => a.number - b.number),
    [seats, selectedRow],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View
        accessible
        accessibilityViewIsModal
        style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + space[3] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="title2" color="onSurface">
              Accessible Seat Picker
            </Text>
            <Text variant="caption" color="onSurfaceVariant">
              List-based seat selection for screen readers
            </Text>
          </View>

          <Button label="Done" variant="outline" size="md" onPress={onClose} />
        </View>

        {/* Row Selector Chips */}
        <View style={styles.rowSelector}>
          <Text variant="label" color="onSurface" style={{ marginBottom: space[2], paddingHorizontal: space[4] }}>
            Select Row
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={rowLabels}
            keyExtractor={(r) => r}
            contentContainerStyle={{ paddingHorizontal: space[4], gap: space[2] }}
            renderItem={({ item: row }) => (
              <Chip
                label={`Row ${row}`}
                selected={selectedRow === row}
                onPress={() => setSelectedRow(row)}
              />
            )}
          />
        </View>

        {/* Seat Items List */}
        <FlatList
          data={rowSeats}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: space[4], gap: space[2], paddingBottom: insets.bottom + space[6] }}
          renderItem={({ item: seat }) => {
            const isSelected = selectedIds.has(seat.id);
            const isAvailable = seat.status === 'available';
            const visual = visualFor(seat, isSelected);
            const label = LABELS[visual];

            const a11yLabel = `Row ${seat.row}, seat ${seat.number}, ${label}. ${
              isSelected ? 'Selected. Double tap to deselect.' : isAvailable ? 'Available. Double tap to select.' : 'Unavailable.'
            }`;

            return (
              <Pressable
                accessible
                accessibilityRole="checkbox"
                accessibilityLabel={a11yLabel}
                accessibilityState={{ checked: isSelected, disabled: !isAvailable }}
                disabled={!isAvailable}
                onPress={() => onToggle(seat, !isSelected)}
                style={[
                  styles.seatItem,
                  {
                    backgroundColor: isSelected
                      ? colors.primaryContainer
                      : isAvailable
                      ? colors.surfaceContainerLow
                      : colors.surfaceContainerHigh,
                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    opacity: isAvailable ? 1 : 0.45,
                  },
                ]}
              >
                <View style={styles.seatItemLeft}>
                  <MaterialCommunityIcons
                    name={
                      isSelected
                        ? 'checkbox-marked-circle'
                        : isAvailable
                        ? 'checkbox-blank-circle-outline'
                        : 'close-circle-outline'
                    }
                    size={22}
                    color={isSelected ? colors.primary : colors.onSurfaceVariant}
                  />

                  <View style={{ marginLeft: space[3] }}>
                    <Text
                      variant="label"
                      style={{ color: isSelected ? colors.onPrimaryContainer : colors.onSurface }}
                    >
                      Seat {seat.row}{seat.number}
                    </Text>
                    <Text variant="caption" color="onSurfaceVariant">
                      {label}
                    </Text>
                  </View>
                </View>

                <View style={styles.seatItemRight}>
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                      fontWeight: '700',
                    }}
                  >
                    {isSelected ? 'SELECTED' : isAvailable ? 'CHOOSE' : 'TAKEN'}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowSelector: {
    paddingVertical: space[3],
  },
  seatItem: {
    minHeight: 52, // Exceeds 44 dp minimum touch target
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatItemRight: {
    alignItems: 'flex-end',
  },
});
