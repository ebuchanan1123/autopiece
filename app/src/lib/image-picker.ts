import * as ImagePicker from "expo-image-picker";

type PickImageOptions = {
  aspect?: [number, number];
  quality?: number;
};

function inferMimeType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType;
  const uri = asset.uri.toLowerCase();
  if (uri.endsWith(".png")) return "image/png";
  if (uri.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function pickImageDataUrl(options?: PickImageOptions) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Allow photo library access to upload images.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: options?.aspect,
    quality: options?.quality ?? 0.45,
    base64: true,
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset?.base64) {
    throw new Error("Could not read that image. Please try a different one.");
  }

  return `data:${inferMimeType(asset)};base64,${asset.base64}`;
}
