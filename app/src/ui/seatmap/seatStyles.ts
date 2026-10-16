import type { ColorScheme } from '../tokens';
import type { Seat, SeatVisual } from './types';

export function visualFor(seat: Seat, selected: boolean): SeatVisual {
  if (seat.status === 'sold') return 'sold';
  if (seat.status === 'held') return 'held';
  if (seat.kind === 'wheelchair') return selected ? 'wheelchairSelected' : 'wheelchair';
  if (selected) return 'selected';
  return seat.kind === 'premium' ? 'premium' : 'available';
}

// Every state differs by fill, border, AND icon or shape, never by color alone.
export function paletteFor(v: SeatVisual, c: ColorScheme) {
  switch (v) {
    case 'available': return { bg: c.surfaceContainerHigh, border: c.outline, icon: null, fg: c.onSurface };
    case 'premium': return { bg: c.secondaryContainer, border: c.secondary, icon: null, fg: c.onSecondaryContainer };
    case 'selected': return { bg: c.primary, border: c.primary, icon: 'check', fg: c.onPrimary };
    case 'held': return { bg: c.warningContainer, border: c.warning, icon: 'clock-outline', fg: c.onWarningContainer };
    case 'sold': return { bg: c.surfaceContainerLowest, border: c.outlineVariant, icon: 'close', fg: c.outline };
    case 'wheelchair': return { bg: c.infoContainer, border: c.info, icon: 'wheelchair-accessibility', fg: c.onInfoContainer };
    case 'wheelchairSelected': return { bg: c.primary, border: c.primary, icon: 'wheelchair-accessibility', fg: c.onPrimary };
  }
}

export const LABELS: Record<SeatVisual, string> = {
  available: 'available',
  premium: 'premium, available',
  selected: 'selected',
  held: 'held by another customer',
  sold: 'sold',
  wheelchair: 'wheelchair accessible, available',
  wheelchairSelected: 'wheelchair accessible, selected',
};
