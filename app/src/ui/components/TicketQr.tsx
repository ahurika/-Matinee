import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { radius, space } from '../tokens';

// A QR code must be dark on light to scan reliably, even in dark mode. These two values are the only
// intentional exception to "colors come from tokens". Keep a quiet zone (the padding) around it.
const QR_DARK = '#000000';
const QR_LIGHT = '#FFFFFF';

type Props = { token: string; size?: number; label: string };

// `token` is a signed, server-issued ticket token. The scanner calls the server to verify it. Never put
// plain seat or user data in the code.
export function TicketQr({ token, size = 220, label }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ backgroundColor: QR_LIGHT, padding: space[4], borderRadius: radius.lg, alignSelf: 'center' }}>
      <QRCode value={token} size={size} color={QR_DARK} backgroundColor={QR_LIGHT} ecl="M" />
    </View>
  );
}
