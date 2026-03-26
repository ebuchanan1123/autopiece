import * as SecureStore from "expo-secure-store";

const KEY = "profile_settings_v1";

export type NotificationSettings = {
  calendarReminders: boolean;
  emailUpdates: boolean;
  pushNotifications: boolean;
  importantUpdates: boolean;
  announcements: boolean;
  surpriseBagAlerts: boolean;
};

export type PaymentCardType =
  | "Carte Edahabia"
  | "Carte Bancaire Nationale"
  | "Visa"
  | "Mastercard";

export type PaymentCard = {
  id: string;
  holderName: string;
  last4: string;
  expiry: string;
  cardType: PaymentCardType;
};

export type ProfileSettings = {
  username: string;
  email: string;
  phone: string;
  country: string;
  gender: string;
  dietaryPreferences: string;
  birthday: string;
  preferredPickupTimes: string[];
  notifications: NotificationSettings;
  paymentCards: PaymentCard[];
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  calendarReminders: false,
  emailUpdates: false,
  pushNotifications: true,
  importantUpdates: true,
  announcements: true,
  surpriseBagAlerts: true,
};

function makeDefaultProfile(): ProfileSettings {
  return {
    username: "",
    email: "",
    phone: "",
    country: "Algeria",
    gender: "",
    dietaryPreferences: "",
    birthday: "",
    preferredPickupTimes: [],
    notifications: DEFAULT_NOTIFICATIONS,
    paymentCards: [],
  };
}

export async function getProfileSettings() {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return makeDefaultProfile();

  try {
    const parsed = JSON.parse(raw) as Partial<ProfileSettings>;
    return {
      ...makeDefaultProfile(),
      ...parsed,
      notifications: {
        ...DEFAULT_NOTIFICATIONS,
        ...(parsed.notifications ?? {}),
      },
      paymentCards: parsed.paymentCards ?? [],
      preferredPickupTimes: parsed.preferredPickupTimes ?? [],
    } satisfies ProfileSettings;
  } catch {
    return makeDefaultProfile();
  }
}

export async function saveProfileSettings(next: ProfileSettings) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}

export async function mergeProfileSettings(next: Partial<ProfileSettings>) {
  const current = await getProfileSettings();
  const merged: ProfileSettings = {
    ...current,
    ...next,
    notifications: {
      ...current.notifications,
      ...(next.notifications ?? {}),
    },
    paymentCards: next.paymentCards ?? current.paymentCards,
    preferredPickupTimes: next.preferredPickupTimes ?? current.preferredPickupTimes,
  };

  await saveProfileSettings(merged);
  return merged;
}

export async function syncProfileFromAuth(user: {
  username?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const current = await getProfileSettings();

  return saveProfileSettings({
    ...current,
    username: user.username?.trim() || current.username,
    email: user.email?.trim() || current.email,
    phone: user.phone?.trim() || current.phone,
  });
}

export async function syncProfileFromServer(user: {
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  gender?: string | null;
  dietaryPreferences?: string | null;
  birthday?: string | null;
  preferredPickupTimes?: string[] | null;
  notificationSettings?: Partial<NotificationSettings> | null;
}) {
  const current = await getProfileSettings();

  return saveProfileSettings({
    ...current,
    username: user.username?.trim() || current.username,
    email: user.email?.trim() || current.email,
    phone: user.phone?.trim() || current.phone,
    country: user.country?.trim() || current.country,
    gender: user.gender?.trim() || current.gender,
    dietaryPreferences:
      user.dietaryPreferences?.trim() || current.dietaryPreferences,
    birthday: user.birthday?.trim() || current.birthday,
    preferredPickupTimes: user.preferredPickupTimes ?? current.preferredPickupTimes,
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...current.notifications,
      ...(user.notificationSettings ?? {}),
    },
  });
}
