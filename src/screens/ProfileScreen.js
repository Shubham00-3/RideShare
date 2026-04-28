import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  MapPin,
  Phone,
  Plus,
  Shield,
  Star,
  Trash2,
} from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  createEmergencyContact,
  createSavedPlace,
  deleteEmergencyContact,
  deleteSavedPlace,
  fetchProfile,
  updateNotificationPreferences,
  updateProfile,
} from '../services/api';

const EMPTY_PLACE = {
  address: '',
  label: '',
};

const EMPTY_CONTACT = {
  name: '',
  phone: '',
  relationship: '',
};

export default function ProfileScreen({ navigation }) {
  const { refreshSession, signOut, token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    email: '',
    gender: 'unspecified',
    name: '',
  });
  const [newPlace, setNewPlace] = useState(EMPTY_PLACE);
  const [newContact, setNewContact] = useState(EMPTY_CONTACT);

  const loadProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);

    try {
      const payload = await fetchProfile(token);
      setProfile(payload);
      setProfileDraft({
        email: payload.user?.email || '',
        gender: payload.user?.gender || 'unspecified',
        name: payload.user?.name || '',
      });
    } catch (error) {
      Alert.alert('Profile unavailable', error.message || 'Unable to load your profile right now.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const notificationPreferences = profile?.notificationPreferences || {};
  const savedPlaces = profile?.savedPlaces || [];
  const emergencyContacts = profile?.emergencyContacts || [];
  const stats = profile?.stats || {};

  const statsCards = useMemo(
    () => [
      ['Trips', String(stats.totalRides || 0)],
      ['Saved', `Rs ${stats.totalSavings || 0}`],
      ['Open help', String(stats.openSupportTickets || 0)],
    ],
    [stats.openSupportTickets, stats.totalRides, stats.totalSavings]
  );

  const handleSaveProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    setSavingProfile(true);

    try {
      const payload = await updateProfile(profileDraft, token);
      setProfile(payload);
      await refreshSession().catch(() => null);
      Alert.alert('Profile saved', 'Your account details are up to date.');
    } catch (error) {
      Alert.alert('Unable to save profile', error.message || 'Try again shortly.');
    } finally {
      setSavingProfile(false);
    }
  }, [profileDraft, refreshSession, token]);

  const handlePreferenceToggle = useCallback(async (key, value) => {
    if (!token) {
      return;
    }

    setProfile((previous) => ({
      ...(previous || {}),
      notificationPreferences: {
        ...(previous?.notificationPreferences || {}),
        [key]: value,
      },
    }));

    try {
      const nextPreferences = await updateNotificationPreferences(
        {
          [key]: value,
        },
        token
      );
      setProfile((previous) => ({
        ...(previous || {}),
        notificationPreferences: nextPreferences,
      }));
    } catch (error) {
      Alert.alert('Preference update failed', error.message || 'Try again in a moment.');
      loadProfile();
    }
  }, [loadProfile, token]);

  const handleAddPlace = useCallback(async () => {
    if (!token || !newPlace.label.trim() || !newPlace.address.trim()) {
      return;
    }

    try {
      const item = await createSavedPlace(newPlace, token);
      setProfile((previous) => ({
        ...(previous || {}),
        savedPlaces: [item, ...(previous?.savedPlaces || [])],
      }));
      setNewPlace(EMPTY_PLACE);
    } catch (error) {
      Alert.alert('Unable to add place', error.message || 'Try again shortly.');
    }
  }, [newPlace, token]);

  const handleDeletePlace = useCallback(async (placeId) => {
    if (!token) {
      return;
    }

    try {
      await deleteSavedPlace(placeId, token);
      setProfile((previous) => ({
        ...(previous || {}),
        savedPlaces: (previous?.savedPlaces || []).filter((place) => place.id !== placeId),
      }));
    } catch (error) {
      Alert.alert('Unable to delete place', error.message || 'Try again shortly.');
    }
  }, [token]);

  const handleAddContact = useCallback(async () => {
    if (!token || !newContact.name.trim() || !newContact.phone.trim()) {
      return;
    }

    try {
      const item = await createEmergencyContact(newContact, token);
      setProfile((previous) => ({
        ...(previous || {}),
        emergencyContacts: [item, ...(previous?.emergencyContacts || [])],
      }));
      setNewContact(EMPTY_CONTACT);
    } catch (error) {
      Alert.alert('Unable to add contact', error.message || 'Try again shortly.');
    }
  }, [newContact, token]);

  const handleDeleteContact = useCallback(async (contactId) => {
    if (!token) {
      return;
    }

    try {
      await deleteEmergencyContact(contactId, token);
      setProfile((previous) => ({
        ...(previous || {}),
        emergencyContacts: (previous?.emergencyContacts || []).filter(
          (contact) => contact.id !== contactId
        ),
      }));
    } catch (error) {
      Alert.alert('Unable to delete contact', error.message || 'Try again shortly.');
    }
  }, [token]);

  if (!profile && loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your account...</Text>
      </View>
    );
  }

  const displayName = profile?.user?.name || user?.name || 'RideShare user';
  const displayEmail = profile?.user?.email || profile?.user?.phone || user?.phone || '';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile} />}
      >
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Star size={12} color={COLORS.star} fill={COLORS.star} />
              <Text style={styles.badgeText}>{profile?.user?.rating || 5}</Text>
            </View>
            <View style={styles.badge}>
              <Shield size={12} color={COLORS.success} />
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          {statsCards.map(([label, value]) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statVal}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account details</Text>
          <TextInput
            placeholder="Full name"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={profileDraft.name}
            onChangeText={(value) => setProfileDraft((previous) => ({ ...previous, name: value }))}
          />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={profileDraft.email}
            onChangeText={(value) => setProfileDraft((previous) => ({ ...previous, email: value }))}
          />
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderOptions}>
            {[
              ['female', 'Female'],
              ['male', 'Male'],
              ['non_binary', 'Non-binary'],
              ['unspecified', 'Prefer not to say'],
            ].map(([value, label]) => {
              const isSelected = profileDraft.gender === value;

              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.genderChip, isSelected && styles.genderChipActive]}
                  onPress={() => setProfileDraft((previous) => ({ ...previous, gender: value }))}
                >
                  <Text style={[styles.genderChipText, isSelected && styles.genderChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.primaryButton} disabled={savingProfile} onPress={handleSaveProfile}>
            <Text style={styles.primaryButtonText}>
              {savingProfile ? 'Saving...' : 'Save profile'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Saved places</Text>
          </View>
          {savedPlaces.map((place) => (
            <View key={place.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>
                  {place.label}
                  {place.isDefault ? ' • Default' : ''}
                </Text>
                <Text style={styles.listSubtitle}>{place.address}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeletePlace(place.id)}>
                <Trash2 size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            placeholder="Label"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={newPlace.label}
            onChangeText={(value) => setNewPlace((previous) => ({ ...previous, label: value }))}
          />
          <TextInput
            placeholder="Address"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={newPlace.address}
            onChangeText={(value) => setNewPlace((previous) => ({ ...previous, address: value }))}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={handleAddPlace}>
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Add place</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Phone size={18} color={COLORS.success} />
            <Text style={styles.cardTitle}>Emergency contacts</Text>
          </View>
          {emergencyContacts.map((contact) => (
            <View key={contact.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{contact.name}</Text>
                <Text style={styles.listSubtitle}>
                  {contact.phone}
                  {contact.relationship ? ` • ${contact.relationship}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteContact(contact.id)}>
                <Trash2 size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            placeholder="Contact name"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={newContact.name}
            onChangeText={(value) => setNewContact((previous) => ({ ...previous, name: value }))}
          />
          <TextInput
            keyboardType="phone-pad"
            placeholder="Phone number"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={newContact.phone}
            onChangeText={(value) => setNewContact((previous) => ({ ...previous, phone: value }))}
          />
          <TextInput
            placeholder="Relationship"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            value={newContact.relationship}
            onChangeText={(value) => setNewContact((previous) => ({ ...previous, relationship: value }))}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={handleAddContact}>
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Add contact</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={18} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Notifications</Text>
          </View>
          {[
            ['pushEnabled', 'Push notifications'],
            ['tripUpdatesEnabled', 'Trip updates'],
            ['safetyAlertsEnabled', 'Safety alerts'],
            ['marketingEnabled', 'Offers and announcements'],
          ].map(([key, label]) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{label}</Text>
              <Switch
                value={Boolean(notificationPreferences[key])}
                onValueChange={(value) => handlePreferenceToggle(key, value)}
                trackColor={{ true: COLORS.primary + '40', false: COLORS.border }}
                thumbColor={Boolean(notificationPreferences[key]) ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={18} color={COLORS.warning} />
            <Text style={styles.cardTitle}>Payments</Text>
          </View>
          <Text style={styles.disabledText}>Payments coming soon. Booking works today without in-app settlement.</Text>
        </View>

        <TouchableOpacity style={styles.cardLink} onPress={() => navigation.navigate('Support')}>
          <HelpCircle size={18} color={COLORS.primary} />
          <Text style={styles.cardLinkText}>Open support center</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <LogOut size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  loadingText: { color: COLORS.textSecondary, ...FONTS.medium },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingBottom: 30,
    paddingTop: 60,
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: 12,
    width: 80,
  },
  avatarText: { color: '#FFF', fontSize: 32, ...FONTS.bold },
  name: { color: '#FFF', fontSize: SIZES.xxl, ...FONTS.bold },
  email: { color: 'rgba(255,255,255,0.7)', marginTop: 4, ...FONTS.regular },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 99,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#FFF', fontSize: SIZES.xs, ...FONTS.semiBold },
  statsRow: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -16,
    padding: 16,
    ...SHADOWS.medium,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { color: COLORS.textPrimary, fontSize: SIZES.lg, ...FONTS.bold },
  statLabel: { color: COLORS.textTertiary, fontSize: SIZES.xs, marginTop: 4, ...FONTS.regular },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    ...SHADOWS.small,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 12 },
  cardTitle: { color: COLORS.textPrimary, fontSize: SIZES.lg, ...FONTS.semiBold },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    color: COLORS.textPrimary,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...FONTS.regular,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    marginTop: 14,
    ...FONTS.semiBold,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  genderChip: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_full,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  genderChipActive: {
    backgroundColor: COLORS.primary,
  },
  genderChipText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    ...FONTS.medium,
  },
  genderChipTextActive: {
    color: COLORS.textInverse,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_lg,
    marginTop: 14,
    paddingVertical: 14,
  },
  primaryButtonText: { color: COLORS.textInverse, ...FONTS.semiBold },
  secondaryButton: {
    alignItems: 'center',
    borderColor: COLORS.primary + '30',
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: COLORS.primary, ...FONTS.semiBold },
  listRow: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_lg,
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    padding: 12,
  },
  listCopy: { flex: 1 },
  listTitle: { color: COLORS.textPrimary, ...FONTS.semiBold },
  listSubtitle: { color: COLORS.textSecondary, marginTop: 4, ...FONTS.regular },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  toggleLabel: { color: COLORS.textPrimary, flex: 1, marginRight: 12, ...FONTS.medium },
  disabledText: { color: COLORS.textSecondary, lineHeight: 22, ...FONTS.regular },
  cardLink: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    ...SHADOWS.small,
  },
  cardLinkText: { color: COLORS.textPrimary, ...FONTS.semiBold },
  logoutBtn: {
    alignItems: 'center',
    borderColor: COLORS.error + '30',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
  },
  logoutText: { color: COLORS.error, fontSize: SIZES.lg, ...FONTS.semiBold },
});
