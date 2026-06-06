import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { useLang, type AppLang } from "@/src/features/i18n/lang.context";

function LanguageRow({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: AppLang;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.card, active ? styles.cardActive : null]}>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.cardSub}>{value.toUpperCase()}</Text>
      </View>
      <View style={[styles.checkWrap, active ? styles.checkWrapActive : null]}>
        {active ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

export default function PreferencesScreen() {
  const { lang, setLang, ready, t } = useLang();

  return (
    <>
      <ScreenHeader title={t("preferences.title")} showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t("preferences.language")}</Text>
          <Text style={styles.description}>{t("preferences.chooseLanguage")}</Text>

          {!ready ? (
            <Text style={styles.loading}>{t("common.loading")}</Text>
          ) : (
            <View style={styles.list}>
              <LanguageRow label="English" value="en" active={lang === "en"} onPress={() => setLang("en")} />
              <LanguageRow label="Français" value="fr" active={lang === "fr"} onPress={() => setLang("fr")} />
              <LanguageRow label="العربية" value="ar" active={lang === "ar"} onPress={() => setLang("ar")} />
            </View>
          )}
        </ScrollView>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 36, backgroundColor: "#FFFDF8" },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#1F2C2B" },
  description: { marginTop: 10, color: "#2F3A38", fontSize: 17, lineHeight: 28 },
  loading: { marginTop: 18, color: "#72817F", fontWeight: "700" },
  list: { marginTop: 18, gap: 14 },
  card: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardActive: { borderColor: "#0C766F", backgroundColor: "#F6FBF9" },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#1F2C2B" },
  cardSub: { marginTop: 6, color: "#72817F", fontWeight: "700" },
  checkWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C9D6D2",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkWrapActive: { backgroundColor: "#0C766F", borderColor: "#0C766F" },
  checkMark: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
});
