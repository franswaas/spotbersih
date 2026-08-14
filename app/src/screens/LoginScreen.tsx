import { useRef, useState } from "react";

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppButton from "../components/AppButton";
import FadeInView from "../components/FadeInView";
import { APP_LOGO } from "../constants/assets";
import { useAuth, authErrorMessage } from "../context/AuthContext";
import { colors, radius, shadow, spacing, typography } from "../theme";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isSignup = mode === "signup";

  const submit = async () => {
    const trimmed = email.trim();

    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      if (isSignup) {
        await signUp(trimmed, password);
        // Navigator now routes to the verification screen automatically.
      } else {
        await signIn(trimmed, password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    const trimmed = email.trim();

    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Enter your email above first, then tap Forgot password.");
      return;
    }

    setError(null);
    setResetting(true);

    try {
      await resetPassword(trimmed);
      Alert.alert(
        "Reset email sent",
        `If an account exists for ${trimmed}, a password reset link is on its way. Check your inbox and spam folder.`,
      );
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <FadeInView style={styles.logoWrap}>
            <Image
              source={{ uri: APP_LOGO }}
              style={styles.logoImage}
            />
            <Text style={styles.title}>SpotBersih</Text>
            <Text style={styles.subtitle}>
              Pantau Sampah, Bersihkan Bersama
            </Text>
          </FadeInView>

          <FadeInView delay={120} style={styles.card}>
            <View style={styles.modeToggle}>
              <ModeTab
                label="Sign in"
                active={!isSignup}
                onPress={() => switchMode("signin")}
              />
              <ModeTab
                label="Create account"
                active={isSignup}
                onPress={() => switchMode("signup")}
              />
            </View>

            <Text style={styles.hint}>
              {isSignup
                ? "Use a real email — we'll send a verification link before you can report."
                : "Sign in with your verified WasteWatch account."}
            </Text>

            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) {
                    setError(null);
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                blurOnSubmit={false}
                onFocus={() =>
                  scrollRef.current?.scrollTo({ y: 120, animated: true })
                }
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                accessibilityLabel="Email address"
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder={
                  isSignup ? "Password (min 6 characters)" : "Password"
                }
                placeholderTextColor={colors.textMuted}
                value={password}
                ref={passwordInputRef}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) {
                    setError(null);
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={isSignup ? "new-password" : "current-password"}
                returnKeyType="go"
                onFocus={() =>
                  scrollRef.current?.scrollTo({ y: 180, animated: true })
                }
                onSubmitEditing={() => void submit()}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.buttonWrap}>
              <AppButton
                title={
                  busy
                    ? isSignup
                      ? "Creating account..."
                      : "Signing in..."
                    : isSignup
                      ? "Create account"
                      : "Sign in"
                }
                icon={busy ? undefined : "arrow-forward"}
                loading={busy}
                disabled={email.trim().length === 0 || password.length === 0}
                onPress={submit}
              />
            </View>

            {!isSignup && (
              <TouchableOpacity
                onPress={() => void forgotPassword()}
                style={styles.forgotWrap}
                disabled={resetting}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotText}>
                  {resetting ? "Sending reset link..." : "Forgot password?"}
                </Text>
              </TouchableOpacity>
            )}
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeTab, active && styles.modeTabActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...typography.supporting,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg + 2,
    padding: spacing.lg + 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    ...typography.label,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  modeTabTextActive: {
    color: colors.white,
  },
  hint: {
    ...typography.supporting,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    backgroundColor: colors.background,
  },
  inputLabel: {
    ...typography.label,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    marginLeft: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  error: {
    fontSize: 12.5,
    color: colors.danger,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  buttonWrap: {
    marginTop: spacing.lg,
  },
  forgotWrap: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  forgotText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.primary,
  },
});
