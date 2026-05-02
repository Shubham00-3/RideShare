import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, Car, Check, Shield, User, Users } from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const GENDER_OPTIONS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'non_binary', label: 'Non-binary' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const ACCOUNT_TYPE_OPTIONS = [
  {
    description: 'Book shared or solo rides.',
    icon: Users,
    id: 'rider',
    label: 'Normal user',
  },
  {
    description: 'Accept rider requests and manage trips.',
    icon: Car,
    id: 'driver',
    label: 'Driver',
  },
];

export default function CompleteProfileScreen() {
  const { completeProfile, error, loading, signOut, user } = useAuth();
  const [name, setName] = useState(user?.profileComplete ? user.name : '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [accountType, setAccountType] = useState(user?.role === 'driver' ? 'driver' : 'rider');
  const canContinue = useMemo(
    () =>
      name.trim().length >= 2 &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
      Boolean(gender) &&
      Boolean(accountType),
    [accountType, dateOfBirth, gender, name]
  );

  const handleSave = async () => {
    if (!canContinue || loading) {
      return;
    }

    try {
      await completeProfile({
        dateOfBirth,
        gender,
        name,
        role: accountType,
      });
    } catch (profileError) {
      Alert.alert('Profile not saved', profileError.message || 'Please check your details.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconShell}>
          <Shield size={30} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          Set up your identity, safety controls, and account type in one quick step.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputShell}>
              <User size={18} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={COLORS.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of birth</Text>
            <View style={styles.inputShell}>
              <Calendar size={18} color={COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numbers-and-punctuation"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderGrid}>
              {GENDER_OPTIONS.map((option) => {
                const isSelected = gender === option.id;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.genderButton, isSelected && styles.genderButtonActive]}
                    onPress={() => setGender(option.id)}
                  >
                    <Text style={[styles.genderText, isSelected && styles.genderTextActive]}>
                      {option.label}
                    </Text>
                    {isSelected ? <Check size={16} color={COLORS.textInverse} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account type</Text>
            <View style={styles.accountTypeGrid}>
              {ACCOUNT_TYPE_OPTIONS.map((option) => {
                const isSelected = accountType === option.id;
                const Icon = option.icon;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.accountTypeButton, isSelected && styles.accountTypeButtonActive]}
                    onPress={() => setAccountType(option.id)}
                  >
                    <View
                      style={[
                        styles.accountTypeIcon,
                        isSelected && styles.accountTypeIconActive,
                      ]}
                    >
                      <Icon
                        size={20}
                        color={isSelected ? COLORS.textInverse : COLORS.primary}
                      />
                    </View>
                    <View style={styles.accountTypeCopy}>
                      <Text
                        style={[
                          styles.accountTypeLabel,
                          isSelected && styles.accountTypeLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.accountTypeDescription,
                          isSelected && styles.accountTypeDescriptionActive,
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    {isSelected ? <Check size={16} color={COLORS.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, (!canContinue || loading) && styles.primaryButtonDisabled]}
          disabled={!canContinue || loading}
          onPress={handleSave}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.primaryButtonText}>Save and continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut} disabled={loading}>
          <Text style={styles.signOutText}>Use a different phone number</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 78,
    paddingBottom: 32,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.brandMist,
    ...SHADOWS.medium,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xxxl,
    marginTop: 24,
    ...FONTS.bold,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    lineHeight: 24,
    marginTop: 8,
    ...FONTS.regular,
  },
  form: {
    gap: 18,
    marginTop: 30,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: SIZES.radius_xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.medium,
  },
  genderGrid: {
    gap: 10,
  },
  accountTypeGrid: {
    gap: 10,
  },
  genderButton: {
    minHeight: 50,
    borderRadius: SIZES.radius_xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.brandInk,
  },
  genderText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  genderTextActive: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  accountTypeButton: {
    minHeight: 72,
    borderRadius: SIZES.radius_xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceSoft,
    ...SHADOWS.small,
  },
  accountTypeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}12`,
  },
  accountTypeIconActive: {
    backgroundColor: COLORS.primary,
  },
  accountTypeCopy: {
    flex: 1,
  },
  accountTypeLabel: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  accountTypeLabelActive: {
    color: COLORS.primary,
  },
  accountTypeDescription: {
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
    fontSize: SIZES.sm,
    ...FONTS.regular,
  },
  accountTypeDescriptionActive: {
    color: COLORS.textSecondary,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 18,
    textAlign: 'center',
    ...FONTS.medium,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: SIZES.radius_xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    ...SHADOWS.medium,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  signOutText: {
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
});
