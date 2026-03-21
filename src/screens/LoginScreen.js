import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Shield, Phone, ArrowRight, CheckCircle } from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleSendOTP = () => {
    if (phone.length >= 10) {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setStep('otp'));
    }
  };

  const handleOTPChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== '')) {
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 500);
    }
  };

  const handleOTPBackspace = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🚗</Text>
        </View>
        <Text style={styles.appName}>RideShare Connect</Text>
        <Text style={styles.tagline}>Smart Carpooling, Smart Savings</Text>
      </View>

      {step === 'phone' ? (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Welcome!</Text>
          <Text style={styles.formSubtitle}>
            Enter your mobile number to get started
          </Text>

          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.codeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter mobile number"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              phone.length < 10 && styles.buttonDisabled,
            ]}
            onPress={handleSendOTP}
            disabled={phone.length < 10}
          >
            <Text style={styles.primaryButtonText}>Get OTP</Text>
            <ArrowRight size={20} color={COLORS.textInverse} />
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Shield size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Your number is safe & secure with us
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialEmoji}>📧</Text>
              <Text style={styles.socialText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialEmoji}>G</Text>
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Verify OTP</Text>
          <Text style={styles.formSubtitle}>
            We sent a 6-digit code to +91 {phone}
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (otpRefs.current[index] = ref)}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleOTPChange(text, index)}
                onKeyPress={({ nativeEvent: { key } }) =>
                  handleOTPBackspace(key, index)
                }
              />
            ))}
          </View>

          <TouchableOpacity style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive code? </Text>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 20 }]}
            onPress={() => navigation.replace('MainTabs')}
          >
            <CheckCircle size={20} color={COLORS.textInverse} />
            <Text style={styles.primaryButtonText}>Verify & Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 80,
    paddingBottom: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 36,
  },
  appName: {
    fontSize: SIZES.xxl,
    color: COLORS.textInverse,
    ...FONTS.bold,
  },
  tagline: {
    fontSize: SIZES.md,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    ...FONTS.regular,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  formTitle: {
    fontSize: SIZES.xxxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  formSubtitle: {
    fontSize: SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 28,
    ...FONTS.regular,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    gap: 6,
  },
  flag: {
    fontSize: 20,
  },
  codeText: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: SIZES.xl,
    color: COLORS.textPrimary,
    ...FONTS.medium,
    letterSpacing: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: SIZES.radius_lg,
    marginTop: 24,
    gap: 8,
    ...SHADOWS.medium,
  },
  buttonDisabled: {
    backgroundColor: COLORS.textTertiary,
    ...SHADOWS.small,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.xl,
    ...FONTS.semiBold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textTertiary,
    fontSize: SIZES.sm,
    ...FONTS.regular,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.small,
  },
  socialEmoji: {
    fontSize: 18,
  },
  socialText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: SIZES.radius_md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    textAlign: 'center',
    fontSize: SIZES.xxl,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    ...SHADOWS.small,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF5FF',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.regular,
  },
  resendLink: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  terms: {
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    color: COLORS.textTertiary,
    fontSize: SIZES.xs,
    lineHeight: 16,
    ...FONTS.regular,
  },
  termsLink: {
    color: COLORS.primary,
    ...FONTS.medium,
  },
});
