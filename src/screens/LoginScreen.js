import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Shield, ArrowRight, CheckCircle } from 'lucide-react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { error, loading, requestOtp, setError, verifyOtp } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState(null);
  const [maskedPhone, setMaskedPhone] = useState('');
  const otpRefs = useRef([]);

  const formattedOtp = useMemo(() => otp.join(''), [otp]);
  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ''), [phone]);

  const handleSendOTP = async () => {
    if (normalizedPhone.length < 10 || loading) {
      return;
    }

    try {
      setError(null);
      const response = await requestOtp(normalizedPhone);
      setMaskedPhone(response.maskedPhone || `+91 ${normalizedPhone}`);
      setDevOtp(response.devOtp || null);
      setStep('otp');
    } catch (requestError) {
      Alert.alert('Unable to send OTP', requestError.message || 'Please try again.');
    }
  };

  const handleVerifyOTP = async (codeOverride) => {
    const code = codeOverride || formattedOtp;

    if (code.length !== 6 || loading) {
      return;
    }

    try {
      setError(null);
      await verifyOtp(normalizedPhone, code);
    } catch (verifyError) {
      Alert.alert('Unable to verify OTP', verifyError.message || 'Please try again.');
    }
  };

  const handleOTPChange = (text, index) => {
    const nextOtp = [...otp];
    nextOtp[index] = text.replace(/\D/g, '');
    setOtp(nextOtp);

    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (nextOtp.every((digit) => digit !== '')) {
      setTimeout(() => {
        handleVerifyOTP(nextOtp.join(''));
      }, 150);
    }
  };

  const handleOTPBackspace = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    await handleSendOTP();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>Ride</Text>
        </View>
        <Text style={styles.appName}>RideShare Connect</Text>
        <Text style={styles.tagline}>Phone OTP sign-in backed by the API and database</Text>
      </View>

      {step === 'phone' ? (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Welcome!</Text>
          <Text style={styles.formSubtitle}>
            Enter your mobile number to request a live OTP from the backend.
          </Text>

          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>IN</Text>
              <Text style={styles.codeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter mobile number"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (normalizedPhone.length < 10 || loading) && styles.buttonDisabled,
            ]}
            onPress={handleSendOTP}
            disabled={normalizedPhone.length < 10 || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Get OTP</Text>
                <ArrowRight size={20} color={COLORS.textInverse} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Shield size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Your rider identity is now stored in the backend
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Verify OTP</Text>
          <Text style={styles.formSubtitle}>
            We sent a 6-digit code to {maskedPhone || `+91 ${normalizedPhone}`}
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

          {devOtp ? (
            <View style={styles.devOtpCard}>
              <Text style={styles.devOtpLabel}>Local dev OTP</Text>
              <Text style={styles.devOtpValue}>{devOtp}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={loading}>
            <Text style={styles.resendText}>Didn't receive code? </Text>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (formattedOtp.length !== 6 || loading) && styles.buttonDisabled,
              { marginTop: 20 },
            ]}
            onPress={() => handleVerifyOTP()}
            disabled={formattedOtp.length !== 6 || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                <CheckCircle size={20} color={COLORS.textInverse} />
                <Text style={styles.primaryButtonText}>Verify & Continue</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
    fontSize: 20,
    color: COLORS.textInverse,
    ...FONTS.bold,
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
    textAlign: 'center',
    paddingHorizontal: 28,
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
    fontSize: 16,
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
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
  devOtpCard: {
    alignItems: 'center',
    marginTop: 22,
    borderRadius: SIZES.radius_lg,
    backgroundColor: '#F8FBFF',
    paddingVertical: 14,
  },
  devOtpLabel: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  devOtpValue: {
    color: COLORS.primary,
    marginTop: 6,
    fontSize: SIZES.xxl,
    letterSpacing: 4,
    ...FONTS.bold,
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
  errorText: {
    color: COLORS.error,
    paddingHorizontal: 24,
    paddingBottom: 12,
    textAlign: 'center',
    ...FONTS.medium,
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
