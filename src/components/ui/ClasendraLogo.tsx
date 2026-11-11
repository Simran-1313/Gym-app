import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, {
  G,
  Path,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  Rect,
  Filter,
  FeGaussianBlur,
} from 'react-native-svg';

interface Props {
  size?: number;
  idPrefix?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Clasendra symbol, ported from clasendra.com's /logo-symbol.svg: a "C"
 * folded from layered green sheets, lime at the top to forest at the bottom.
 * Each fold has a blurred shadow stroke beneath it and a thin highlight on its
 * edge, which is what gives the sheets their depth.
 */
export const ClasendraLogo: React.FC<Props> = ({
  size = 32,
  idPrefix = 'clasendra-rn-logo',
  style,
}) => {
  const id = (name: string) => `${idPrefix}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <Svg width={size} height={size * (1080 / 1055)} viewBox="10 20 1055 1080" style={style}>
      <Defs>
        <ClipPath id={id('shape')}>
          <Path d="M590 25C760 25 920 120 1010 260C1035 300 1050 330 1052 352C1052 368 1040 376 1028 380C960 420 880 445 800 428C740 415 700 385 660 368C560 360 470 410 425 470C390 520 392 620 430 685C480 760 580 775 670 752C760 728 820 690 900 684C960 680 1020 700 1045 735C1060 755 1058 768 1048 790C1000 900 900 1010 760 1060C640 1100 480 1095 360 1040C200 960 40 820 25 600C15 380 150 170 330 80C410 40 500 25 590 25Z" />
        </ClipPath>
        <LinearGradient id={id('top')} gradientUnits="userSpaceOnUse" x1="180" y1="320" x2="980" y2="160">
          <Stop offset="0" stopColor="#8ED952" />
          <Stop offset="0.5" stopColor="#BDEB58" />
          <Stop offset="1" stopColor="#E6FA68" />
        </LinearGradient>
        <LinearGradient id={id('left')} gradientUnits="userSpaceOnUse" x1="40" y1="420" x2="420" y2="660">
          <Stop offset="0" stopColor="#86DB6C" />
          <Stop offset="0.55" stopColor="#5EC757" />
          <Stop offset="1" stopColor="#3A9E47" />
        </LinearGradient>
        <LinearGradient id={id('core')} gradientUnits="userSpaceOnUse" x1="260" y1="640" x2="560" y2="560">
          <Stop offset="0" stopColor="#174A25" />
          <Stop offset="1" stopColor="#2D7D3F" />
        </LinearGradient>
        <LinearGradient id={id('lower')} gradientUnits="userSpaceOnUse" x1="520" y1="900" x2="1050" y2="740">
          <Stop offset="0" stopColor="#2A7A3E" />
          <Stop offset="0.6" stopColor="#3F9B53" />
          <Stop offset="1" stopColor="#52B064" />
        </LinearGradient>
        <LinearGradient id={id('base')} gradientUnits="userSpaceOnUse" x1="250" y1="1000" x2="850" y2="1040">
          <Stop offset="0" stopColor="#5DC664" />
          <Stop offset="1" stopColor="#46AC56" />
        </LinearGradient>
        <Filter id={id('blur')} x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation="14" />
        </Filter>
      </Defs>

      <G clipPath={url('shape')}>
        <Rect x="0" y="0" width="1083" height="1120" fill={url('core')} />

        {/* Base fold */}
        <Path d="M120 760C170 860 260 940 380 985C500 1025 650 1030 820 1005" fill="none" stroke="#0B2E14" strokeOpacity={0.7} strokeWidth={34} filter={url('blur')} />
        <Path d="M120 760C170 860 260 940 380 985C500 1025 650 1030 820 1005L1100 1000L1100 1200L0 1200L0 760Z" fill={url('base')} />

        {/* Lower fold */}
        <Path d="M420 640C460 760 560 880 700 960C760 995 820 1010 880 1012" fill="none" stroke="#0B2E14" strokeOpacity={0.85} strokeWidth={40} filter={url('blur')} />
        <Path d="M420 640C460 760 560 880 700 960C760 995 820 1010 880 1012L1150 1012L1150 600L420 600Z" fill={url('lower')} />
        <Path d="M420 640C460 760 560 880 700 960C760 995 820 1010 880 1012" fill="none" stroke="#9CEBA0" strokeOpacity={0.55} strokeWidth={3} />

        {/* Left fold */}
        <Path d="M600 330C500 395 390 480 310 580C240 670 195 760 200 850C205 910 230 950 265 975" fill="none" stroke="#071F0D" strokeOpacity={0.9} strokeWidth={46} filter={url('blur')} />
        <Path d="M600 330C500 395 390 480 310 580C240 670 195 760 200 850C205 910 230 950 265 975L0 1000L0 0L600 0Z" fill={url('left')} />
        <Path d="M600 330C500 395 390 480 310 580C240 670 195 760 200 850C205 910 230 950 265 975" fill="none" stroke="#C9F7A0" strokeOpacity={0.7} strokeWidth={3.5} />

        {/* Top fold */}
        <Path d="M1028 380C960 420 880 445 800 428C740 415 700 385 660 368C580 330 480 260 400 220C330 190 240 188 150 232" fill="none" stroke="#123F1C" strokeOpacity={0.75} strokeWidth={40} filter={url('blur')} />
        <Path d="M1028 380C960 420 880 445 800 428C740 415 700 385 660 368C580 330 480 260 400 220C330 190 240 188 150 232L100 180L0 0L1100 0L1100 380Z" fill={url('top')} />
        <Path d="M1028 380C960 420 880 445 800 428C740 415 700 385 660 368C580 330 480 260 400 220C330 190 240 188 150 232" fill="none" stroke="#F6FFC0" strokeOpacity={0.65} strokeWidth={3} />
      </G>
    </Svg>
  );
};
