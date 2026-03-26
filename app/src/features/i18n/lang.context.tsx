import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPreferredLang, setPreferredLang } from "./lang";

export type AppLang = "en" | "fr" | "ar";

type LangContextValue = {
  lang: AppLang;
  ready: boolean;
  setLang: (next: AppLang) => Promise<void>;
  t: (key: string) => string;
};

const Ctx = createContext<LangContextValue | null>(null);

// UI strings (static app text)
const STRINGS: Record<AppLang, any> = {
  en: {
    common: {
      notFound: "Not found",
      invalidId: "Invalid listing id",
      loadFail: "Failed to load listing",
      loading: "Loading…",
      view: "View",
    },
    tabs: {
        discover: "Discover",
        browse: "Browse",
        favourites: "Favourites",
        profile: "Profile",
    },

    discover: {
        chosenLocation: "Chosen location",
        noListings: "No listings yet.",
        noMatchTitle: "We couldn't find a match",
        noMatchBody: "Try removing some of your filters to get more results.",
        removeAllFilters: "Remove all filters",
        yourFavourites: "Your Favourites",
        favouritesHint: "Tap the heart icon to add to your Favourites",
        topPicks: "Top picks near you",
        newBags: "New Surprise Bags",
        seeAll: "See all",
        categoryFilterLabel: "Applied filter",
        view: "View",
        categories: {
            all: "All",
            meals: "Meals",
            bread: "Bread & pastries",
            groceries: "Groceries",
            personalCare: "Personal care",
            flowers: "Flowers & plants",
            other: "Other",
        },
    },
    profile: {
        title: "Profile",
        subtitle: "MVP: profile info + manage account menu.",
        manageAccount: "Manage account",
        addYourName: "Add your name",
        yourOrders: "Your orders",
        totalBagsShort: "bags saved",
        moneySaved: "Money saved",
        settings: "SETTINGS",
        paymentCards: "Payment cards",
        vouchers: "Vouchers",
        specialRewards: "Special Rewards",
        support: "SUPPORT",
        community: "COMMUNITY",
        other: "OTHER",
        inviteFriends: "Invite your friends",
        recommendStore: "Recommend a store",
        customerSupport: "Customer support",
        signUpBusiness: "Sign up your food business",
        hiddenStores: "Hidden stores",
        comingSoon: "Coming soon",
        accountDetails: "Account details",
        preferences: "Preferences",
        notifications: "Notifications",
        myOrders: "My orders",
        helpOrder: "Help with an order",
        legal: "Legal",
        logout: "Log out",
        logoutTitle: "Log out",
        logoutConfirm: "Are you sure you want to log out?",
        cancel: "Cancel",
    },
    favourites: {
        title: "Favourites",
        subtitle: "Saved bags worth checking before they're gone.",
        empty: "No favourites yet.",
        soldOut: "Sold out",
        soldOutSection: "Sold out",
        pickupToday: "Pick up today",
        pickupTomorrow: "Pick up tomorrow",
        distanceAway: "away",
        alert: "Alerts",
        availableNow: "Still available",
    },


    browse: {
      title: "Browse",
      search: "Search",
      list: "List",
      map: "Map",
      empty: "No listings found.",
    },
    orders: {
      title: "Your orders",
      totalBagsLabel: "Total Surprise Bags",
      savedCount: "Saved",
      emptyTitle: "No orders yet",
      emptySubtitle: "Reserve a surprise bag and it will show up here.",
      browseListings: "Browse listings",
      loadError: "Failed to load orders",
    },
    preferences: {
      title: "Preferences",
      language: "Language",
      chooseLanguage: "Choose the language you prefer. Listings will auto-translate when available.",
    },
    listing: {
      details: "Details",
      translating: "Translating…",
      save: "Save",
      soldOut: "Sold out",
      left: "left",

      // Info rows
      category: "Category",
      rating: "Rating",
      pickUp: "Pick up",
      pickupTbd: "Pickup time TBD",

      // Sections
      about: "About this Surprise Bag",
      directions: "Directions",
      getDirections: "Get directions",
      pickupInstructionsTitle: "Pickup instructions",
      packaging: "Packaging",
      ingredientsAllergens: "Ingredients & allergens",

      // Defaults / placeholders
      addressTbd: "Address TBD",
      mapUnavailable: "Map preview unavailable",
      defaultPickupInstructions:
        "Show your order in the app to a staff member to pick up your Surprise Bag.",
      defaultAbout:
        "Rescue a Surprise Bag containing a selection of items.",
      defaultAllergens:
        "Ingredients and allergen information may vary. Ask staff in-store if you have allergies.",
      packagingNoteDefault: "We recommend bringing your own bag.",

      // Packaging cards (defaults)
      container: "Container",
      carrierBag: "Carrier bag",
      provided: "Provided",

      // Button
      reserve: "Reserve",
      tomorrow: "Tomorrow",
    },
  },

  fr: {
    common: {
      notFound: "Introuvable",
      invalidId: "ID d’annonce invalide",
      loadFail: "Impossible de charger l’annonce",
      loading: "Chargement…",
      view: "Voir",

    },
    tabs: {
        discover: "Découvrir",
        browse: "Explorer",
        favourites: "Favoris",
        profile: "Profil",
    },

    discover: {
        chosenLocation: "Lieu choisi",
        noListings: "Aucune annonce pour le moment.",
        noMatchTitle: "Nous n'avons trouvé aucun résultat",
        noMatchBody: "Essayez de retirer certains filtres pour obtenir plus de résultats.",
        removeAllFilters: "Retirer tous les filtres",
        yourFavourites: "Vos favoris",
        favouritesHint: "Touchez le coeur pour ajouter aux favoris",
        topPicks: "Meilleurs choix près de vous",
        newBags: "Nouveaux Sacs Surprise",
        seeAll: "Voir tout",
        categoryFilterLabel: "Filtre appliqué",
        view: "Voir",
        categories: {
            all: "Tout",
            meals: "Repas",
            bread: "Pain & pâtisseries",
            groceries: "Épicerie",
            personalCare: "Soins personnels",
            flowers: "Fleurs & plantes",
            other: "Autre",
        },
    },
    profile: {
        title: "Profil",
        subtitle: "MVP : infos profil + menu de gestion du compte.",
        manageAccount: "Gérer le compte",
        addYourName: "Ajoutez votre nom",
        yourOrders: "Vos commandes",
        totalBagsShort: "sacs sauvés",
        moneySaved: "Économies réalisées",
        settings: "PARAMÈTRES",
        paymentCards: "Cartes de paiement",
        vouchers: "Bons",
        specialRewards: "Récompenses spéciales",
        support: "ASSISTANCE",
        community: "COMMUNAUTÉ",
        other: "AUTRE",
        inviteFriends: "Invitez vos amis",
        recommendStore: "Recommander un commerce",
        customerSupport: "Support client",
        signUpBusiness: "Inscrire votre commerce alimentaire",
        hiddenStores: "Commerces masqués",
        comingSoon: "Bientôt disponible",
        accountDetails: "Détails du compte",
        preferences: "Préférences",
        notifications: "Notifications",
        myOrders: "Mes commandes",
        helpOrder: "Aide pour une commande",
        legal: "Mentions légales",
        logout: "Déconnexion",
        logoutTitle: "Déconnexion",
        logoutConfirm: "Voulez-vous vraiment vous déconnecter ?",
        cancel: "Annuler",
    },
    favourites: {
        title: "Favoris",
        subtitle: "Des sacs enregistrés à surveiller avant qu'ils disparaissent.",
        empty: "Aucun favori pour le moment.",
        soldOut: "Épuisé",
        soldOutSection: "Épuisés",
        pickupToday: "Retrait aujourd'hui",
        pickupTomorrow: "Retrait demain",
        distanceAway: "de distance",
        alert: "Alertes",
        availableNow: "Encore disponible",
    },

    browse: {
      title: "Explorer",
      search: "Rechercher",
      list: "Liste",
      map: "Carte",
      empty: "Aucune annonce trouvée.",
    },
    orders: {
      title: "Vos commandes",
      totalBagsLabel: "Sacs Surprise au total",
      savedCount: "Sauvés",
      emptyTitle: "Aucune commande pour le moment",
      emptySubtitle: "Réservez un Sac Surprise et il apparaîtra ici.",
      browseListings: "Explorer les annonces",
      loadError: "Impossible de charger les commandes",
    },
    preferences: {
      title: "Préférences",
      language: "Langue",
      chooseLanguage:
        "Choisissez votre langue. Les annonces seront traduites automatiquement si possible.",
    },
    listing: {
      details: "Détails",
      translating: "Traduction…",
      save: "Économisez",
      soldOut: "Épuisé",
      left: "restants",

      category: "Catégorie",
      rating: "Note",
      pickUp: "Retrait",
      pickupTbd: "Heure de retrait à confirmer",

      about: "À propos de ce Sac Surprise",
      directions: "Itinéraire",
      getDirections: "Obtenir l’itinéraire",
      pickupInstructionsTitle: "Instructions de retrait",
      packaging: "Emballage",
      ingredientsAllergens: "Ingrédients et allergènes",

      addressTbd: "Adresse à confirmer",
      mapUnavailable: "Aperçu de la carte indisponible",
      defaultPickupInstructions:
        "Montrez votre commande dans l’application à un membre du personnel pour récupérer votre Sac Surprise.",
      defaultAbout:
        "Sauvez un Sac Surprise contenant une sélection d’articles.",
      defaultAllergens:
        "Les ingrédients et allergènes peuvent varier. Demandez au personnel sur place si vous avez des allergies.",
      packagingNoteDefault: "Nous recommandons d’apporter votre propre sac.",

      container: "Contenant",
      carrierBag: "Sac de transport",
      provided: "Fourni",

      reserve: "Réserver",
      tomorrow: "Demain",
    },
  },

  ar: {
    common: {
      notFound: "غير موجود",
      invalidId: "معرّف الإعلان غير صالح",
      loadFail: "تعذر تحميل الإعلان",
      loading: "جارٍ التحميل…",
      view: "عرض",
    },
    tabs: {
        discover: "استكشاف",
        browse: "تصفح",
        favourites: "المفضلة",
        profile: "الملف الشخصي",
    },
    discover: {
        chosenLocation: "الموقع المختار",
        noListings: "لا توجد إعلانات بعد.",
        noMatchTitle: "لم نتمكن من العثور على نتيجة",
        noMatchBody: "جرّب إزالة بعض عوامل التصفية للحصول على نتائج أكثر.",
        removeAllFilters: "إزالة كل عوامل التصفية",
        yourFavourites: "مفضلاتك",
        favouritesHint: "اضغط على القلب للإضافة إلى المفضلة",
        topPicks: "أفضل الاختيارات بالقرب منك",
        newBags: "حقائب مفاجأة جديدة",
        seeAll: "عرض الكل",
        categoryFilterLabel: "الفلتر المطبق",
        view: "عرض",
        categories: {
            all: "الكل",
            meals: "وجبات",
            bread: "خبز ومعجنات",
            groceries: "بقالة",
            personalCare: "عناية شخصية",
            flowers: "زهور ونباتات",
            other: "أخرى",
        },
    },
    profile: {
        title: "الملف الشخصي",
        subtitle: "نسخة MVP: معلومات الملف + قائمة إدارة الحساب.",
        manageAccount: "إدارة الحساب",
        addYourName: "أضف اسمك",
        yourOrders: "طلباتك",
        totalBagsShort: "أكياس محفوظة",
        moneySaved: "المبلغ الموفَّر",
        settings: "الإعدادات",
        paymentCards: "بطاقات الدفع",
        vouchers: "القسائم",
        specialRewards: "مكافآت خاصة",
        support: "الدعم",
        community: "المجتمع",
        other: "أخرى",
        inviteFriends: "ادعُ أصدقاءك",
        recommendStore: "رشّح متجرًا",
        customerSupport: "دعم العملاء",
        signUpBusiness: "سجّل نشاطك الغذائي",
        hiddenStores: "المتاجر المخفية",
        comingSoon: "قريبًا",
        accountDetails: "تفاصيل الحساب",
        preferences: "التفضيلات",
        notifications: "الإشعارات",
        myOrders: "طلباتي",
        helpOrder: "مساعدة بخصوص طلب",
        legal: "قانوني",
        logout: "تسجيل الخروج",
        logoutTitle: "تسجيل الخروج",
        logoutConfirm: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
        cancel: "إلغاء",
    },
    favourites: {
        title: "المفضلة",
        subtitle: "حقائب محفوظة تستحق المتابعة قبل نفادها.",
        empty: "لا توجد مفضلات بعد.",
        soldOut: "نفدت الكمية",
        soldOutSection: "نفدت الكمية",
        pickupToday: "الاستلام اليوم",
        pickupTomorrow: "الاستلام غدًا",
        distanceAway: "بعيد",
        alert: "تنبيهات",
        availableNow: "ما زالت متاحة",
    },

    browse: {
      title: "استكشف",
      search: "بحث",
      list: "قائمة",
      map: "خريطة",
      empty: "لا توجد إعلانات.",
    },
    orders: {
      title: "طلباتك",
      totalBagsLabel: "إجمالي أكياس المفاجأة",
      savedCount: "تم إنقاذ",
      emptyTitle: "لا توجد طلبات بعد",
      emptySubtitle: "احجز حقيبة مفاجأة وستظهر هنا.",
      browseListings: "تصفح العروض",
      loadError: "تعذر تحميل الطلبات",
    },
    preferences: {
      title: "الإعدادات",
      language: "اللغة",
      chooseLanguage:
        "اختر لغتك المفضلة. سيتم ترجمة الإعلانات تلقائياً عند توفرها.",
    },
    listing: {
      details: "التفاصيل",
      translating: "جارٍ الترجمة…",
      save: "وفر",
      soldOut: "نفد",
      left: "متبقي",

      category: "الفئة",
      rating: "التقييم",
      pickUp: "الاستلام",
      pickupTbd: "وقت الاستلام غير محدد",

      about: "حول حقيبة المفاجأة",
      directions: "الاتجاهات",
      getDirections: "الحصول على الاتجاهات",
      pickupInstructionsTitle: "تعليمات الاستلام",
      packaging: "التغليف",
      ingredientsAllergens: "المكونات ومسببات الحساسية",

      addressTbd: "العنوان غير محدد",
      mapUnavailable: "معاينة الخريطة غير متاحة",
      defaultPickupInstructions:
        "اعرض طلبك في التطبيق لموظف المتجر لاستلام حقيبة المفاجأة.",
      defaultAbout:
        "أنقذ حقيبة مفاجأة تحتوي على مجموعة من العناصر.",
      defaultAllergens:
        "قد تختلف المكونات ومسببات الحساسية. اسأل موظفي المتجر إذا كانت لديك حساسية.",
      packagingNoteDefault: "ننصح بإحضار حقيبتك الخاصة.",

      container: "حاوية",
      carrierBag: "حقيبة حمل",
      provided: "متوفر",

      reserve: "احجز",
      tomorrow: "غداً",
    },
  },
};

function getByPath(obj: any, path: string): string | undefined {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await getPreferredLang();
        setLangState(saved);
        if (saved) setLangState(saved);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function setLang(next: AppLang) {
    setLangState(next);
    await setPreferredLang(next);
  }

  const t = useCallback((key: string) => {
    const v = getByPath(STRINGS[lang], key);
    const fallback = getByPath(STRINGS.en, key);
    return v ?? fallback ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, ready, setLang, t }), [lang, ready, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used within <LangProvider>");
  return v;
}
