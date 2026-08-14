import { useEffect, useRef, type ReactNode } from "react";

import { Animated, type StyleProp, type ViewStyle } from "react-native";

interface Props {
  children: ReactNode;
  // stagger entries by passing an increasing delay per list index
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

// Fades + slides content in on mount. Used to stagger list cards.
export default function FadeInView({ children, delay = 0, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        speed: 14,
        bounciness: 5,
      }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
