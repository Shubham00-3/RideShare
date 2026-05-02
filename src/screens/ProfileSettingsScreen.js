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
import { ArrowLeft, Calendar, Car, Check, User, Users } from 'lucide-react-native';
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

export default function ProfileSettingsScreen({ navigation }) {
  const { completeProfile, error, loading, user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [accountType, setAccountType] = useState(user?.role === 'driver' ? 'driver' : 'rider');
  const canSave = useMemo(
    () =>
      name.trim().length >= 2 &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
      Boolean(gender) &&
      Boolean(accountType),
    [accountType, dateOfBirth, gender, name]
  );

  const handleSave = async () => {
    if (!canSave || loading) {
      return;
    }

    try {
      await completeProfile({
        dateOfBirth,
        gender,
        name,
        role: accountType,
      });
      navigation.goBack();
    } catch (profileError) {
      Alert.alert('Profile not saved', profileError.message || 'Please check your details.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <Text style={styles.headerSubtitle}>Update your personal details and account type.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <View style={styles.optionGrid}>
              {GENDER_OPTIONS.map((option) => {
                const isSelected = gender === option.id;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                    onPress={() => setGender(option.id)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
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
            <View style={styles.accountGrid}>
              {ACCOUNT_TYPE_OPTIONS.map((option) => {
                const isSelected = accountType === option.id;
                const Icon = option.icon;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.accountButton, isSelected && styles.accountButtonActive]}
                    onPress={() => setAccountType(option.id)}
                  >
                    <View style={[styles.accountIcon, isSelected && styles.accountIconActive]}>
                      <Icon size={20} color={isSelected ? COLORS.textInverse : COLORS.primary} />
                    </View>
                    <View style={styles.accountCopy}>
                      <Text style={[styles.accountLabel, isSelected && styles.accountLabelActive]}>
                        {option.label}
                      </Text>
                      <Text style={styles.accountDescription}>{option.description}</Text>
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
          style={[styles.saveButton, (!canSave || loading) && styles.saveButtonDisabled]}
          disabled={!canSave || loading}
          onPress={handleSave}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.xxl,
    ...FONTS.bold,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 5,
    ...FONTS.regular,
  },
  content: {
    padding: 18,
    paddingBottom: 34,
  },
  form: {
    gap: 18,
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
  optionGrid: {
    gap: 10,
  },
  optionButton: {
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
  optionButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.brandInk,
  },
  optionText: {
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  optionTextActive: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  accountGrid: {
    gap: 10,
  },
  accountButton: {
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
  accountButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceSoft,
    ...SHADOWS.small,
  },
  accountIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}12`,
  },
  accountIconActive: {
    backgroundColor: COLORS.primary,
  },
  accountCopy: {
    flex: 1,
  },
  accountLabel: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  accountLabelActive: {
    color: COLORS.primary,
  },
  accountDescription: {
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
    fontSize: SIZES.sm,
    ...FONTS.regular,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 18,
    textAlign: 'center',
    ...FONTS.medium,
  },
  saveButton: {
    minHeight: 56,
    borderRadius: SIZES.radius_xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    ...SHADOWS.medium,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  saveButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
});
