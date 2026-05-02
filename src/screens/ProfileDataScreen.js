import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Check, CreditCard, MapPin, Plus, Shield, Trash2, X } from 'lucide-react-native';
import { COLORS, FONTS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  createEmergencyContact,
  createPaymentMethod,
  createSavedPlace,
  deleteEmergencyContact,
  deletePaymentMethod,
  deleteSavedPlace,
  fetchEmergencyContacts,
  fetchPaymentMethods,
  fetchSavedPlaces,
  updateEmergencyContact,
  updatePaymentMethod,
  updateSavedPlace,
} from '../services/api';

const DEFAULT_FORMS = {
  emergencyContacts: {
    name: '',
    phone: '',
    relationship: '',
  },
  paymentMethods: {
    type: 'UPI',
    label: '',
    isPrimary: false,
  },
  savedPlaces: {
    label: '',
    address: '',
  },
};

const CONFIGS = {
  savedPlaces: {
    title: 'Saved Places',
    subtitle: 'Keep pickup and dropoff shortcuts ready for faster ride searches.',
    addLabel: 'Add Place',
    emptyTitle: 'No saved places yet',
    emptyText: 'Add home, office, college, or any regular stop.',
    icon: MapPin,
    iconColor: COLORS.primary,
    list: fetchSavedPlaces,
    create: createSavedPlace,
    update: updateSavedPlace,
    remove: deleteSavedPlace,
    fields: [
      { key: 'label', label: 'Label', placeholder: 'Home' },
      { key: 'address', label: 'Address', placeholder: 'Sector 62, Noida' },
    ],
    describe: (item) => item.address,
  },
  paymentMethods: {
    title: 'Payment Methods',
    subtitle: 'Bookings can only use payment methods saved to your account.',
    addLabel: 'Add Method',
    emptyTitle: 'No payment methods yet',
    emptyText: 'Add a UPI, card, or wallet label before booking.',
    icon: CreditCard,
    iconColor: COLORS.success,
    list: fetchPaymentMethods,
    create: createPaymentMethod,
    update: updatePaymentMethod,
    remove: deletePaymentMethod,
    fields: [
      { key: 'type', label: 'Type', placeholder: 'UPI, Card, Wallet' },
      { key: 'label', label: 'Label', placeholder: 'GPay - name@oksbi' },
    ],
    describe: (item) => `${item.type}${item.isPrimary ? ' | Primary' : ''}`,
  },
  emergencyContacts: {
    title: 'Emergency Contacts',
    subtitle: 'These contacts are used by the SOS screen and trip safety tools.',
    addLabel: 'Add Contact',
    emptyTitle: 'No emergency contacts yet',
    emptyText: 'Add someone trusted who should be reachable during a ride.',
    icon: Shield,
    iconColor: COLORS.error,
    list: fetchEmergencyContacts,
    create: createEmergencyContact,
    update: updateEmergencyContact,
    remove: deleteEmergencyContact,
    fields: [
      { key: 'name', label: 'Name', placeholder: 'Mom' },
      { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
      { key: 'relationship', label: 'Relationship', placeholder: 'Parent' },
    ],
    describe: (item) => [item.phone, item.relationship].filter(Boolean).join(' | '),
  },
};

function cloneDefaultForm(kind) {
  return {
    ...DEFAULT_FORMS[kind],
  };
}

function buildFormFromItem(kind, item) {
  if (kind === 'paymentMethods') {
    return {
      type: item.type || 'UPI',
      label: item.label || '',
      isPrimary: Boolean(item.isPrimary),
    };
  }

  if (kind === 'emergencyContacts') {
    return {
      name: item.name || '',
      phone: item.phone || '',
      relationship: item.relationship || '',
    };
  }

  return {
    label: item.label || '',
    address: item.address || '',
  };
}

export default function ProfileDataScreen({ navigation, route }) {
  const kind = route.params?.kind || 'savedPlaces';
  const config = CONFIGS[kind] || CONFIGS.savedPlaces;
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(() => cloneDefaultForm(kind));
  const Icon = config.icon;
  const isEditing = Boolean(editingItem);

  const formTitle = useMemo(
    () => (isEditing ? `Edit ${config.title.slice(0, -1)}` : config.addLabel),
    [config.addLabel, config.title, isEditing]
  );

  const resetForm = useCallback(() => {
    setEditingItem(null);
    setForm(cloneDefaultForm(kind));
  }, [kind]);

  const loadItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await config.list(token);
      setItems(response.items || []);
    } catch (loadError) {
      setItems([]);
      setError(loadError.message || `Unable to load ${config.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [config, token]);

  useEffect(() => {
    resetForm();
    loadItems();
  }, [loadItems, resetForm]);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setForm(buildFormFromItem(kind, item));
  };

  const handleSave = async () => {
    if (!token) {
      setError('Sign in again before updating profile details.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingItem) {
        await config.update(editingItem.id, form, token);
      } else {
        await config.create(form, token);
      }

      resetForm();
      await loadItems();
    } catch (saveError) {
      setError(saveError.message || `Unable to save ${config.title.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert('Delete item?', `Remove ${item.label || item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setError(null);
            await config.remove(item.id, token);
            resetForm();
            await loadItems();
          } catch (deleteError) {
            setError(deleteError.message || `Unable to delete ${config.title.toLowerCase()}.`);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{config.title}</Text>
          <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.formPanel}>
          <View style={styles.formHeading}>
            <View style={[styles.formIcon, { backgroundColor: `${config.iconColor}14` }]}>
              <Icon size={18} color={config.iconColor} />
            </View>
            <Text style={styles.formTitle}>{formTitle}</Text>
            {isEditing ? (
              <TouchableOpacity style={styles.clearButton} onPress={resetForm}>
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {config.fields.map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.textTertiary}
                value={form[field.key]}
                onChangeText={(value) => updateField(field.key, value)}
                keyboardType={field.key === 'phone' ? 'phone-pad' : 'default'}
              />
            </View>
          ))}

          {kind === 'paymentMethods' ? (
            <View style={styles.primaryRow}>
              <View>
                <Text style={styles.primaryLabel}>Primary method</Text>
                <Text style={styles.primaryText}>Use this first on checkout.</Text>
              </View>
              <Switch
                value={Boolean(form.isPrimary)}
                onValueChange={(value) => updateField('isPrimary', value)}
                trackColor={{ true: `${COLORS.success}40`, false: COLORS.border }}
                thumbColor={form.isPrimary ? COLORS.success : COLORS.textTertiary}
              />
            </View>
          ) : null}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                {isEditing ? (
                  <Check size={18} color={COLORS.textInverse} />
                ) : (
                  <Plus size={18} color={COLORS.textInverse} />
                )}
                <Text style={styles.saveButtonText}>{isEditing ? 'Save Changes' : config.addLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listPanel}>
          <Text style={styles.listTitle}>Saved records</Text>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
              <Text style={styles.emptyText}>{config.emptyText}</Text>
            </View>
          ) : (
            items.map((item) => (
              <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => startEdit(item)}>
                <View style={[styles.itemIcon, { backgroundColor: `${config.iconColor}12` }]}>
                  <Icon size={17} color={config.iconColor} />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>{item.label || item.name}</Text>
                  <Text style={styles.itemSubtitle}>{config.describe(item)}</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item)}>
                  <Trash2 size={17} color={COLORS.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  iconButton: {
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
    marginTop: 5,
    lineHeight: 20,
    ...FONTS.regular,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  errorText: {
    color: COLORS.error,
    ...FONTS.medium,
  },
  formPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  formIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
  },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    marginBottom: 7,
    ...FONTS.medium,
  },
  input: {
    minHeight: 48,
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 13,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  primaryRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  primaryLabel: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  primaryText: {
    color: COLORS.textSecondary,
    marginTop: 3,
    ...FONTS.regular,
  },
  saveButton: {
    minHeight: 50,
    borderRadius: SIZES.radius_lg,
    backgroundColor: COLORS.brandInk,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  saveButtonText: {
    color: COLORS.textInverse,
    ...FONTS.semiBold,
  },
  listPanel: {
    gap: 10,
  },
  listTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  emptyState: {
    minHeight: 94,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    ...FONTS.regular,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius_lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  itemSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 3,
    ...FONTS.regular,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.error}10`,
  },
});
