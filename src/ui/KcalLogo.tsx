import Svg, { G, Path, Rect } from 'react-native-svg';
import { logoColors } from '../theme/tokens';

interface Props { size?: number; variant?: 'dark' | 'sage' }

/** K flame mark on a rounded tile (64x64 grid). */
export function KcalLogo({ size = 64, variant = 'dark' }: Props) {
  const sage = variant === 'sage';
  const tile = sage ? logoColors.sageTile : logoColors.tile;
  const ink = sage ? logoColors.sageK : logoColors.k;
  const hi = sage ? logoColors.sageFlame : logoColors.flame;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Kcal Coach">
      <Rect width={64} height={64} rx={10} fill={tile} />
      <G transform="translate(-1.5 0)">
        <Rect x={15} y={10} width={10} height={44} rx={1.5} fill={ink} />
        <Path fill={ink} d="M15 31H28L51 54H38Z" />
        <Path fill={ink} d="M15 34H28L42 20H29Z" />
        <Path
          fill={hi}
          transform="translate(39.5 15.5) rotate(45) scale(.92)"
          d="M0 -12C7 -4 8 2 8 5C8 10 4 13 0 13C-4 13 -8 10 -8 5C-8 2 -7 -4 0 -12Z"
        />
      </G>
    </Svg>
  );
}
