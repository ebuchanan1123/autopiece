import { apiFetch } from "@/src/lib/api";
import { syncProfileFromServer, type NotificationSettings } from "@/src/features/profile/profile.store";

export type ProfileUser = {
  id: number;
  username: string;
  email: string;
  role: "client" | "seller" | "admin";
  phone?: string | null;
  country?: string | null;
  gender?: string | null;
  dietaryPreferences?: string | null;
  birthday?: string | null;
  preferredPickupTimes?: string[] | null;
  notificationSettings?: Partial<NotificationSettings> | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfilePayload = {
  email?: string;
  phone?: string;
  country?: string;
  gender?: string;
  dietaryPreferences?: string;
  birthday?: string;
  preferredPickupTimes?: string[];
  notificationSettings?: NotificationSettings;
};

type ProfileResponse = {
  user: ProfileUser;
};

export async function getMyProfile() {
  const data = await apiFetch<ProfileResponse>("/users/me");
  await syncProfileFromServer(data.user);
  return data.user;
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  const data = await apiFetch<ProfileResponse>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await syncProfileFromServer(data.user);
  return data.user;
}
