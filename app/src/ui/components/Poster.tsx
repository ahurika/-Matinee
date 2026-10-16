import { Image } from 'expo-image';
import { View } from 'react-native';

import { useTheme } from '../theme';
import { radius as r } from '../tokens';

type Props = {
  uri: string | null; // built by the backend from TMDB's image base url and a size. The app never builds TMDB urls.
  title: string; // used for the accessibility label
  width: number;
  radius?: keyof typeof r;
};

// Poster with a solid placeholder, a short fade in, and memory plus disk caching.
// Aspect ratio 2:3. If there is no image, show the placeholder block (an empty tone, not a broken image icon).
export function Poster({ uri, title, width, radius = 'md' }: Props) {
  const { colors } = useTheme();
  const height = Math.round((width * 3) / 2);
  return (
    <View style={{ width, height, borderRadius: r[radius], overflow: 'hidden', backgroundColor: colors.surfaceContainerHigh }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width, height }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          accessibilityLabel={`Poster for ${title}`}
        />
      ) : null}
    </View>
  );
}
