import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'tw' | 'ee' | 'ga' | 'dag' | 'fr';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  badge: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', badge: 'En', flag: '🇬🇧' },
  { code: 'tw', label: 'Twi (Akan)', nativeLabel: 'Asante Twi', badge: 'Tw', flag: '🇬🇭' },
  { code: 'ee', label: 'Ewe', nativeLabel: 'Eʋegbe', badge: 'Ee', flag: '🇬🇭' },
  { code: 'ga', label: 'Ga', nativeLabel: 'Gã', badge: 'Ga', flag: '🇬🇭' },
  { code: 'dag', label: 'Dagbani', nativeLabel: 'Dagbanli', badge: 'Dag', flag: '🇬🇭' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', badge: 'Fr', flag: '🇫🇷' },
];

export interface Translations {
  appName: string;
  tagline: string;
  navHome: string;
  navWeather: string;
  navPrices: string;
  navOffline: string;
  navAdvisory: string;
  navMarket: string;
  navRental: string;
  navWallet: string;
  navForum: string;
  navDiagnose: string;
  navAdmin: string;
  navOrders: string;
  navProfile: string;
  welcome: string;
  welcomeSub: string;
  offlineBanner: string;
  openOfflineHub: string;
  onlineRestored: string;
  offlineGuideTitle: string;
  offlineGuideDesc: string;
  weatherTitle: string;
  weatherDesc: string;
  pricesTitle: string;
  pricesDesc: string;
  advisoryTitle: string;
  advisoryDesc: string;
  marketTitle: string;
  marketDesc: string;
  rentalTitle: string;
  rentalDesc: string;
  forumTitle: string;
  forumDesc: string;
  walletTitle: string;
  walletDesc: string;
  diagnoseTitle: string;
  diagnoseDesc: string;
  metWatchTitle: string;
  metWatchSub: string;
  refresh: string;
  precacheAll: string;
  cachedOffline: string;
  selectCrop: string;
  search: string;
  save: string;
  languageSelect: string;
}

const TRANSLATIONS: Record<LanguageCode, Translations> = {
  en: {
    appName: 'Ghana Farmers Market℠',
    tagline: 'Your Partner in Farming Success!',
    navHome: 'Home',
    navWeather: 'Weather',
    navPrices: 'Prices',
    navOffline: 'Offline Hub',
    navAdvisory: 'Advisory',
    navMarket: 'Marketplace',
    navRental: 'Rental',
    navWallet: 'Wallet',
    navForum: 'Forum',
    navDiagnose: 'Diagnose',
    navAdmin: 'Admin',
    navOrders: 'Orders',
    navProfile: 'Profile',
    welcome: 'Welcome!, Mía Woezɔ̃!, Yɛma Mo Akwaaba!',
    welcomeSub: 'Select a feature below to get started.',
    offlineBanner: 'Offline Mode: Displaying cached weather, market prices, and saved offline farming guides.',
    openOfflineHub: 'Open Offline Hub',
    onlineRestored: 'You are back online! Syncing live agricultural data.',
    offlineGuideTitle: 'Offline Farm Guide',
    offlineGuideDesc: 'Access saved weather, prices & tips without internet.',
    weatherTitle: 'Weather Forecast',
    weatherDesc: 'Get hyper-local regional weather predictions.',
    pricesTitle: 'Market Prices',
    pricesDesc: 'Check daily wholesale prices across Ghana.',
    advisoryTitle: 'Crop Advisory',
    advisoryDesc: 'Personalized, stage-by-stage farming guidance.',
    marketTitle: 'Marketplace',
    marketDesc: 'Find certified seeds, fertilizers, and tools.',
    rentalTitle: 'Equipment Rental',
    rentalDesc: 'Rent tractors, plows, and farm machinery.',
    forumTitle: 'Community Forum',
    forumDesc: 'Connect with fellow Ghanaian farmers.',
    walletTitle: 'Mobile Money & Wallet',
    walletDesc: 'P2P transfers, loans, bills & insurance.',
    diagnoseTitle: 'Pest Diagnosis',
    diagnoseDesc: 'Identify crop diseases with a quick photo.',
    metWatchTitle: 'Global Meteorological Watch',
    metWatchSub: 'Live Updates from Trusted Agricultural Sources',
    refresh: 'Refresh',
    precacheAll: 'Pre-cache All Crops',
    cachedOffline: 'Cached Offline',
    selectCrop: 'Select Crop',
    search: 'Search',
    save: 'Save',
    languageSelect: 'Select Language'
  },
  tw: {
    appName: 'Ghana Farmers Market℠',
    tagline: 'Wo Hokafo wɔ Kuadwuma Nkunimdi mu!',
    navHome: 'Fie',
    navWeather: 'Wiemu Nsɛm',
    navPrices: 'Nnoɔma Boɔ',
    navOffline: 'Offline Hub',
    navAdvisory: 'Akwankyerɛ',
    navMarket: 'Dwamu',
    navRental: 'Mfirinsee',
    navWallet: 'Kotokuo',
    navForum: 'Nkɔmmɔbɔ',
    navDiagnose: 'Yareɛ Hwehwɛ',
    navAdmin: 'Panin',
    navOrders: 'Nnoɔma',
    navProfile: 'Me Ho Nsɛm',
    welcome: 'Akwaaba! Yɛma mo akwaaba ba kuadwuma mu!',
    welcomeSub: 'Paw beaeɛ a wopɛ sɛ wokɔ wɔ fam ha.',
    offlineBanner: 'Wontumi nnya intanɛte: Yɛde wiemu nsɛm, boɔ ne akwankyerɛ a yɛakora so na ɛrekyerɛ wo.',
    openOfflineHub: 'Bue Offline Hub',
    onlineRestored: 'Intanɛte asan aba! Yɛresesa nnoɔma foforɔ.',
    offlineGuideTitle: 'Offline Akwankyerɛ',
    offlineGuideDesc: 'Kora wiemu nsɛm, nnoɔma boɔ ne akwankyerɛ so a intanɛte nni ho.',
    weatherTitle: 'Wiemu Nsɛm',
    weatherDesc: 'Nya osuo ne awia ho amanneɛbɔ.',
    pricesTitle: 'Nnoɔma Boɔ',
    pricesDesc: 'Hwɛ aburo, bayerɛ, kookoo ne nnoɔma boɔ.',
    advisoryTitle: 'Kuafoɔ Akwankyerɛ',
    advisoryDesc: 'Aduane dua ne hwɛ ho afotuo pɔtee.',
    marketTitle: 'Dwamu Kɛseɛ',
    marketDesc: 'Tɔ aba pa, nnuro ne mfirinsee a ɛho teɛ.',
    rentalTitle: 'Trakta ne Mfirinsee',
    rentalDesc: 'Gye trakta, asau ne afiri foforɔ firi afoforɔ hɔ.',
    forumTitle: 'Kuafoɔ Nkɔmmɔbɔ',
    forumDesc: 'Kasa kyerɛ wo mfɛfoɔ akuafoɔ wɔ Ghana baabiara.',
    walletTitle: 'Sika Kotokuo (MoMo)',
    walletDesc: 'Momo sika kɔ, fɛm sika, tua nneɛma ka ntɛm.',
    diagnoseTitle: 'Afifideɛ Yareɛ Hwehwɛ',
    diagnoseDesc: 'Twa ahaban mfoni na hu yareɛ a ɛwɔ mu ntɛm.',
    metWatchTitle: 'Wiemu Nsɛm Kɔkɔbɔ',
    metWatchSub: 'Amanneɛbɔ pa firi wiemu ahwɛfoɔ nkyɛn',
    refresh: 'Foforɔ',
    precacheAll: 'Kora Boɔ Nyinaa So',
    cachedOffline: 'Akora So Wɔ Fon So',
    selectCrop: 'Paw Afifideɛ',
    search: 'Hwehwɛ',
    save: 'Kora So',
    languageSelect: 'Paw Kasa'
  },
  ee: {
    appName: 'Ghana Farmers Market℠',
    tagline: 'Wò zɔhɛ le agbledeɖe ƒe dzidzedzekpɔkpɔ me!',
    navHome: 'Aƒeme',
    navWeather: 'Yame Nɔnɔme',
    navPrices: 'Nuwo ƒe Asi',
    navOffline: 'Offline Hub',
    navAdvisory: 'Aɖaŋuɖoɖo',
    navMarket: 'Asi me',
    navRental: 'Dɔwɔnu Dodo',
    navWallet: 'Gakotoku',
    navForum: 'Nyanyrɔƒe',
    navDiagnose: 'Dɔléle Kpekpe',
    navAdmin: 'Kplɔla',
    navOrders: 'Nudɔdɔwo',
    navProfile: 'Nye Nyatakakadzraɖoƒe',
    welcome: 'Mía Woezɔ̃! Woezɔ̃ va míaƒe agbledede habɔbɔ me!',
    welcomeSub: 'Tia teƒe si nàdi be yeakpɔ le ete.',
    offlineBanner: 'Miele ka dzi o: Míele yame nɔnɔme kple nuwo ƒe asi siwo wòdzra ɖo la fiam.',
    openOfflineHub: 'Ʋu Offline Hub',
    onlineRestored: 'Ka ga va! Míele nyatakaka yeyewo dzram ɖo.',
    offlineGuideTitle: 'Offline Agble Dɔwɔnu',
    offlineGuideDesc: 'Kpɔ yame nɔnɔme kple asiwo ne internet mele asiwò o.',
    weatherTitle: 'Yame ƒe Nɔnɔme',
    weatherDesc: 'Kpɔ tsi kple ŋdɔ ƒe nyatakakawo le afisi nànɔ.',
    pricesTitle: 'Agblenuwo ƒe Asi',
    pricesDesc: 'Kpɔ bli, te, kple kookoo ƒe asi gbe sia gbe.',
    advisoryTitle: 'Agbledeɖe ƒe Aɖaŋu',
    advisoryDesc: 'Nusrɔ̃lawo ƒe aɖaŋuɖoɖo na nuku vovovowo.',
    marketTitle: 'Asi me',
    marketDesc: 'Ƒle nuku nyuiwo, aɖiwo kple agbledɔwɔnuwo.',
    rentalTitle: 'Trakta Dodo',
    rentalDesc: 'Do trakta kple dɔwɔnu gãwo na wò agble.',
    forumTitle: 'Agbledelawo ƒe Nyagbɔgblɔ',
    forumDesc: 'Ɖo dze kple agbledela bubuwo le Ghana katã.',
    walletTitle: 'Ga Kotoku (MoMo)',
    walletDesc: 'Ɖo ga, biabia gadodo, kple agbledede ƒe gazazãwo.',
    diagnoseTitle: 'Ati ƒe Dɔléle Kpɔkpɔ',
    diagnoseDesc: 'De atikpa ƒe fotɔ be nànya dɔ si lée.',
    metWatchTitle: 'Yame ƒe Nɔnɔme Ŋuti Nuxlɔ̃ame',
    metWatchSub: 'Nyatakaka tso yamenutomekplɔlawo gbɔ',
    refresh: 'Yeyewɔwɔ',
    precacheAll: 'Dzra Asiwo Katã Ɖo',
    cachedOffline: 'Wodzrae ɖo ɖe mɔ̃a me',
    selectCrop: 'Tia Nuku',
    search: 'Di Nane',
    save: 'Dzra ɖo',
    languageSelect: 'Tia Gbe'
  },
  ga: {
    appName: 'Ghana Farmers Market℠',
    tagline: 'Otsɔɔlɔ kɛmiŋ le ngbɔkuamɔ mli!',
    navHome: 'Shĩa',
    navWeather: 'Kɔɔyɔɔŋ Nii',
    navPrices: 'Nibii Ajilɔ',
    navOffline: 'Offline Hub',
    navAdvisory: 'Kaa-woo',
    navMarket: 'Jaa lɔ',
    navRental: 'Nitsumɔ Nii',
    navWallet: 'Shika Kotoku',
    navForum: 'Sane Gbaa',
    navDiagnose: 'Helatse Kɛlemɔ',
    navAdmin: 'Onukpa',
    navOrders: 'Nibii ni ahala',
    navProfile: 'Minaa Sane',
    welcome: 'Atuu! Oobaa mi! Wɔŋɔ bo baa ngbɔkuamɔ jala lɛ mli!',
    welcomeSub: 'Halamɔ nɔ ni otaoɔ yɛ shishi nɛɛ.',
    offlineBanner: 'Kɔmputa nɛtwɛk bɛ: Wɔtsɔɔ nibii kɛ kɔɔyɔɔŋ sane ni ewo mli momo.',
    openOfflineHub: 'Gblemɔ Offline Hub',
    onlineRestored: 'Intanɛt eba ekoŋŋ! Nibii hee eba.',
    offlineGuideTitle: 'Offline Ngbɔkuamɔ Wolo',
    offlineGuideDesc: 'Kwɛmɔ jala kɛ kɔɔyɔɔŋ nibii kɛji bɛ intanɛt.',
    weatherTitle: 'Kɔɔyɔɔŋ Nibii',
    weatherDesc: 'Nuu kɛ hulu shishi kɔɔyɔɔŋ sane.',
    pricesTitle: 'Nibii Ajilɔ',
    pricesDesc: 'Ablɛ, yɛlɛ, kookoo kɛ nibii ajilɔ gbi fɛɛ gbi.',
    advisoryTitle: 'Kuafoi Akwankyerɛ',
    advisoryDesc: 'Kaa-woo kɛtsɔɔ bɔ ni aduu nibii.',
    marketTitle: 'Jaa Lɔ',
    marketDesc: 'He wui kpakpa kɛ ngbɔkuamɔ tsɔji.',
    rentalTitle: 'Trakta Kɛ Tsɔji',
    rentalDesc: 'Kɔ trakta kɛ agbami tsɔji fɛmɔ.',
    forumTitle: 'Kuafoi Agbaa',
    forumDesc: 'Gba sane kɛ kuafoi krokomɛi yɛ Ghana.',
    walletTitle: 'Shika Kotoku (MoMo)',
    walletDesc: 'Kɛ shika tsu nitsumɔ oyayaay.',
    diagnoseTitle: 'Helai Kɛlemɔ',
    diagnoseDesc: 'Tswaa baa fɔto kɛna hela ni mli.',
    metWatchTitle: 'Kɔɔyɔɔŋ Kɔkɔbɔɔ',
    metWatchSub: 'Sane kpakpa kɛjɛ kɔɔyɔɔŋ nitsulɔi adɛŋ',
    refresh: 'Ha efee he',
    precacheAll: 'To Jala Fɛɛ Mli',
    cachedOffline: 'Eto mli yɛ fon nɔ',
    selectCrop: 'Halamɔ Nii',
    search: 'Taomɔ',
    save: 'Tomɔ',
    languageSelect: 'Halamɔ Wiɛmɔ'
  },
  dag: {
    appName: 'Ghana Farmers Market℠',
    tagline: 'A kparilim kpaŋmaŋ zosimli!',
    navHome: 'Yiŋ',
    navWeather: 'Ania Kpeha',
    navPrices: 'Daarima',
    navOffline: 'Offline Hub',
    navAdvisory: 'Saɣisigu',
    navMarket: 'Daa',
    navRental: 'Kuribu',
    navWallet: 'Laɣifu Kotoku',
    navForum: 'Laɣingu',
    navDiagnose: 'Doro Vihigu',
    navAdmin: 'Kpambaliba',
    navOrders: 'Daaha Nima',
    navProfile: 'M Maŋ',
    welcome: 'Maraba! Ti paɣi a kana kparilim tuma ni!',
    welcomeSub: 'Piimi a ni bɔri shɛli gbunni ŋɔ.',
    offlineBanner: 'Netwɛk kani: Ti zaŋla ania kpeha mini daarima n-wuhiri a.',
    openOfflineHub: 'Yooli Offline Hub',
    onlineRestored: 'Netwɛk labina! Ti kpaɣila yɛla pala.',
    offlineGuideTitle: 'Offline Kparilim Wolo',
    offlineGuideDesc: 'Kpahi ania kpeha mini daarima yoli.',
    weatherTitle: 'Saa Mini Ania Kpeha',
    weatherDesc: 'Baanli saa mini wuntaŋ yɛla.',
    pricesTitle: 'Bindirigu Daarima',
    pricesDesc: 'Baanli kawana, nyoya, kookoo mini bindirigu daa.',
    advisoryTitle: 'Kpariba Saɣisigu',
    advisoryDesc: 'Baanli bɛ ni duri bindirigu shɛm.',
    marketTitle: 'Daa Ni',
    marketDesc: 'Damma bimbiila suŋ mini kparilim nɛma.',
    rentalTitle: 'Trakta Samli',
    rentalDesc: 'Kuri trakta mini kparilim nɛma.',
    forumTitle: 'Kpariba Yɛtoɣa',
    forumDesc: 'Tɔɣisima kpariba kpee Ghana puuni.',
    walletTitle: 'Laɣifu Kotoku (MoMo)',
    walletDesc: 'Tim laɣifu, deemi samli vienyelinga.',
    diagnoseTitle: 'Vihiri Bimbila Doro',
    diagnoseDesc: 'Gbaami vari anfooni ka baŋ doro maa.',
    metWatchTitle: 'Saa Mini Ania Yɛla',
    metWatchSub: 'Yɛtɔɣa n-yina ania vihiliba sani',
    refresh: 'Labisi Neem',
    precacheAll: 'Zaŋ Daa Nima Zaa',
    cachedOffline: 'Di kpalimla fon ŋɔ ni',
    selectCrop: 'Piimi Bimbili',
    search: 'Bɔma',
    save: 'Zaŋ Soŋ',
    languageSelect: 'Piimi Balli'
  },
  fr: {
    appName: 'Ghana Farmers Market℠',
    tagline: 'Votre Partenaire pour la Réussite Agricole !',
    navHome: 'Accueil',
    navWeather: 'Météo',
    navPrices: 'Prix du Marché',
    navOffline: 'Centre Hors-ligne',
    navAdvisory: 'Conseils',
    navMarket: 'Marché',
    navRental: 'Location',
    navWallet: 'Portefeuille',
    navForum: 'Forum',
    navDiagnose: 'Diagnostiquer',
    navAdmin: 'Admin',
    navOrders: 'Commandes',
    navProfile: 'Profil',
    welcome: 'Bienvenue !, Mía Woezɔ̃ !, Yɛma Mo Akwaaba !',
    welcomeSub: 'Sélectionnez une fonctionnalité ci-dessous pour commencer.',
    offlineBanner: 'Mode hors-ligne : Affichage des prévisions météo, prix et guides agricoles enregistrés.',
    openOfflineHub: 'Ouvrir le Centre Hors-ligne',
    onlineRestored: 'Connexion rétablie ! Synchronisation des données agricoles en cours.',
    offlineGuideTitle: 'Guide Agricole Hors-ligne',
    offlineGuideDesc: 'Consultez la météo, les prix et les fiches pratiques sans internet.',
    weatherTitle: 'Prévisions Météo',
    weatherDesc: 'Obtenez des prévisions météorologiques locales et fiables.',
    pricesTitle: 'Cours des Produits',
    pricesDesc: 'Suivez les prix de gros des denrées à travers le Ghana.',
    advisoryTitle: 'Conseils aux Cultures',
    advisoryDesc: 'Accompagnement agronomique étape par étape.',
    marketTitle: 'Place de Marché',
    marketDesc: 'Achetez des semences certifiées, engrais et outillages.',
    rentalTitle: 'Location de Matériel',
    rentalDesc: 'Louez des tracteurs, charrues et machines agricoles.',
    forumTitle: 'Forum Communautaire',
    forumDesc: 'Échangez avec les agriculteurs à travers le pays.',
    walletTitle: 'Portefeuille & Mobile Money',
    walletDesc: 'Transferts d\'argent instantanés, prêts et micro-assurance.',
    diagnoseTitle: 'Diagnostic Phyto / Ravageurs',
    diagnoseDesc: 'Identifiez maladies et parasites d\'une simple photo.',
    metWatchTitle: 'Veille Météorologique Globale',
    metWatchSub: 'Informations en direct des services météorologiques officiels',
    refresh: 'Actualiser',
    precacheAll: 'Télécharger Tous les Prix',
    cachedOffline: 'Enregistré Hors-ligne',
    selectCrop: 'Choisir une Culture',
    search: 'Rechercher',
    save: 'Enregistrer',
    languageSelect: 'Changer de Langue'
  }
};

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: Translations;
  currentOption: LanguageOption;
  availableLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'agro_user_preferred_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['en', 'tw', 'ee', 'ga', 'dag', 'fr'].includes(saved)) {
        return saved as LanguageCode;
      }
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const currentOption = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      currentOption,
      availableLanguages: LANGUAGES
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
