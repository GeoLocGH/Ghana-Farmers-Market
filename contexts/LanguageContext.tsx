import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

/**
 * Comprehensive UI phrase dictionary across all pages (Weather, Prices, Advisory,
 * Offline Guide, Marketplace, Equipment Rental, Wallet, Forum, Diagnosis, Orders, Profile, Auth, Admin).
 * Tuple order: [tw, ee, ga, dag, fr]
 */
const PHRASE_MAP: Record<string, [string, string, string, string, string]> = {
  // Auth & Navigation
  'Login': ['ura mu (Login)', 'Ge ɖe eme', 'Botemɔ', 'Kpɛma', 'Connexion'],
  'Register': ['Kyerɛw Din', 'Ŋlɔ ŋkɔ', 'Ŋmaa Gbɛi', 'Sabli Yuli', 'S\'inscrire'],
  'Logout': ['Pue', 'Do go', 'Je kpo', 'Yima', 'Déconnexion'],
  'Sign In': ['Kɔ Mu', 'Ge ɖe eme', 'Botemɔ', 'Kpɛma', 'Se connecter'],
  'Create Account': ['Bue Akawunti', 'Ʋu Akɔnta', 'Gblemɔ Akawunti', 'Yooli Akawunti', 'Créer un compte'],
  'Forgot password?': ['Wo werɛ afi password?', 'Èŋlɔ password bea?', 'Ohiɛje password nɔ?', 'A tam password?', 'Mot de passe oublié ?'],
  'Reset Password': ['Sesa Password', 'Trɔ Password', 'Tsake Password', 'Taɣi Password', 'Réinitialiser le mot de passe'],
  'Full Name': ['Wo Din Nyinaa', 'Ŋkɔ Blatɔ', 'Ogbɛi Fɛɛ', 'A Yuli Zaa', 'Nom complet'],
  'Phone Number': ['Fon Nɔma', 'Ka Xexlẽdzesi', 'Tɛlifon Nɔma', 'Fon Namba', 'Numéro de téléphone'],
  'Email': ['Email', 'Email', 'Email', 'Email', 'Adresse e-mail'],
  'Password': ['Password', 'Password', 'Password', 'Password', 'Mot de passe'],
  'Repeat Password': ['San Twerɛ Password', 'Gbugbɔ Ŋlɔ Password', 'Ŋmaa Password Ekoŋŋ', 'Labisi Password', 'Confirmer le mot de passe'],
  'I am a:': ['Meyɛ:', 'Menye:', 'Mi ji:', 'N nyɛla:', 'Je suis :'],
  'Buyer': ['Detɔfoɔ', 'Nuƒlela', 'Niihelɔ', 'Daadira', 'Acheteur'],
  'Seller': ['Dwadifoɔ', 'Nudzrala', 'Niihɔɔlɔ', 'Kohira', 'Vendeur'],
  'Farmer': ['Okuafoɔ', 'Agbledela', 'Okuafo', 'Kparilimda', 'Agriculteur'],
  'Push Alerts': ['Kɔkɔbɔ Nsɛm', 'Nuxlɔ̃amewo', 'Kɔkɔbɔɔ Sɛɛ', 'Laɣim Yɛla', 'Alertes Push'],

  // Dashboard
  'Scanning local meteorological conditions...': [
    'Yɛrehwehwɛ wiemu nsɛm wɔ wo mpɔtam...',
    'Míele yame nɔnɔme dim le nutowò me...',
    'Wɔkwɛɔ kɔɔyɔɔŋ nibii yɛ okutso mli...',
    'Ti vihiri ania kpeha a yaɣili ŋɔ...',
    'Analyse des conditions météorologiques locales...'
  ],
  'No active severe weather alerts at this time.': [
    'Wiemu kɔkɔbɔ bɔne biara nni hɔ seesei.',
    'Yame ƒe nuxlɔ̃ame sesẽ aɖeke meli fifia o.',
    'Kɔɔyɔɔŋ kɔkɔbɔɔ ko bɛ amrɔ nɛɛ.',
    'Ania kpeha yɛligola shɛli kani saha ŋɔ.',
    'Aucune alerte météo sévère en vigueur pour le moment.'
  ],

  // Weather Page & Trend Chart
  'Regional Weather & Agro-Advisory': [
    'Mpɔtam Wiemu Nsɛm ne Kuadwuma Afotuo',
    'Nutome Yame Nɔnɔme kple Agble Aɖaŋuɖoɖo',
    'Kɔɔyɔɔŋ Nibii kɛ Kuafoi Akwankyerɛ',
    'Yaɣili Ania Kpeha mini Kparilim Saɣisigu',
    'Météo Régionale & Conseils Agrométéorologiques'
  ],
  'Hyperlocal farming forecasts with offline field caching': [
    'Wiemu amanneɛbɔ ma akuafoɔ a ɛkora so wɔ fon so',
    'Agble yame nyatakaka si wodzrana ɖo ɖe mɔ̃ dzi',
    'Kɔɔyɔɔŋ sane ni atoɔ mli yɛ fon nɔ',
    'Kparilim ania kpeha din kpalimda fon ni',
    'Prévisions agricoles hyperlocales avec sauvegarde hors-ligne'
  ],
  '7-Day Trend Chart': [
    'Nna 7 Wiemu Mfoni',
    'Ŋkeke 7 Yame Nɔnɔme',
    'Gbii 7 Kɔɔyɔɔŋ Mfoni',
    'Dabisili 7 Ania Kpeha',
    'Graphique sur 7 Jours'
  ],
  'Refresh': ['Foforɔ', 'Yeyewɔwɔ', 'Ha efee he', 'Labisi Neem', 'Actualiser'],
  'Refreshing...': ['Ɛresesa...', 'Ele yeyewɔm...', 'Efeɔ ehee...', 'Di labisirimi...', 'Actualisation...'],
  'Offline Cached Forecast': [
    'Wiemu Nsɛm a Yɛakora So (Offline)',
    'Yame Nyatakaka si Wodzra Ɖo',
    'Kɔɔyɔɔŋ Sane ni Ato Mli',
    'Ania Kpeha Din Kpalim Fon Ni',
    'Prévisions Enregistrées Hors-ligne'
  ],
  'Live Regional Data Active': [
    'Mpɔtam Wiemu Nsɛm Foforɔ Gu So',
    'Nutome Nyatakaka Yeyewo Le Dɔ Wɔm',
    'Kɔɔyɔɔŋ Sane Hee Miitsu Nii',
    'Ania Kpeha Yɛla Pala Tumi',
    'Données Régionales en Direct Actives'
  ],
  '• Automatically saved for offline field visits': [
    '• Yɛakora so ama afuom akwantuo a intanɛte nni hɔ',
    '• Wodzrae ɖo na agbleyiɣi internet manɔmee',
    '• Ato mli kɛha ŋmɔshi yaa',
    '• Di kpalimla puuni chandi zuɣu',
    '• Sauvegardé automatiquement pour les visites au champ'
  ],
  'Detailed Day-by-Day Forecast': [
    'Da Biara Wiemu Nsɛm Pɔtee',
    'Ŋkeke Sia Ŋkeke Yame Nɔnɔme',
    'Gbi Fɛɛ Gbi Kɔɔyɔɔŋ Sane',
    'Dabisili Kam Ania Kpeha',
    'Prévisions Détaillées Jour par Jour'
  ],
  '7-Day Agrometeorological Trend: Temperature & Rainfall': [
    'Nna 7 Kuadwuma Wiemu Nsɛm: Ahuhuro ne Osuo',
    'Ŋkeke 7 Agble Yame Nɔnɔme: Dzoxɔxɔ kple Tsidzadza',
    'Gbii 7 Kɔɔyɔɔŋ Tsakemɔ: Hulu kɛ Nuu',
    'Dabisili 7 Kparilim Ania: Tulim mini Saa',
    'Tendance Agrométéorologique 7 Jours : Température & Pluie'
  ],
  'Empowering Ghanaian smallholders to schedule planting, soil preparation, fertilizer application, and spraying.': [
    'Ɛboa Ghana akuafoɔ ma wɔhyehyɛ dua berɛ, asase siesie, nnuro guo ne adubɔ.',
    'Ekpe ɖe Ghana agbledelawo ŋu be woatia nukuƒãɣi, anyigba dzadzraɖo kple atikewuwu.',
    'Eyeɔ ebuaa Ghana kuafoi kɛha dumɔ, shikpɔŋ saamɔ kɛ tsofawɔɔ.',
    'Di sɔŋdi Ghana kpariba ka bɛ baŋ bimbili dubu, tiŋ maabu mini tim pubu.',
    'Aide les exploitants ghanéens à planifier les semis, la préparation du sol, les engrais et les traitements.'
  ],
  'Combined Trend': ['Abom', 'Ɖekawɔwɔ', 'Ekomefeemɔ', 'Laɣim', 'Combiné'],
  'Rainfall (mm)': ['Osuo (mm)', 'Tsidzadza (mm)', 'Nuu (mm)', 'Saa (mm)', 'Pluie (mm)'],
  'Temp (°C)': ['Ahuhuro (°C)', 'Dzoxɔxɔ (°C)', 'Hulu (°C)', 'Tulim (°C)', 'Temp. (°C)'],
  '7-Day Rain Volume': ['Nna 7 Osuo Dodoɔ', 'Ŋkeke 7 Tsi Agbɔsɔsɔ', 'Gbii 7 Nuu Fɛɛ', 'Dabisili 7 Saa', 'Volume Pluie 7 Jours'],
  'Average Temp': ['Ahuhuro Nkyɛmu', 'Dzoxɔxɔ Mama', 'Hulu Teŋ', 'Tulim Sunsuuni', 'Temp. Moyenne'],
  'Sowing Windows': ['Dua Berɛ Pa', 'Nukuƒãɣi Nyui', 'Dumɔ Be Kpakpa', 'Dubu Saha', 'Jours de Semis'],
  'Dry / Spray Windows': ['Adubɔ Berɛ Pa', 'Atikewuɣi Nyui', 'Tsofawɔɔ Be', 'Tim Pubu Saha', 'Jours de Traitement'],
  'Today': ['Ɛnnɛ', 'Egbe', 'Ŋmɛnɛ', 'Zuŋɔ', 'Aujourd\'hui'],
  'Tomorrow': ['Ɔkyena', 'Etsɔ', 'Wɔ́', 'Biɛɣu', 'Demain'],
  'Sunny': ['Awia', 'Ŋdɔ', 'Hulu', 'Wuntaŋa', 'Ensoleillé'],
  'Rainy': ['Osuo', 'Tsidzadza', 'Nuu', 'Saa', 'Pluvieux'],
  'Cloudy': ['Mununkum', 'Alilikpo', 'Atatu', 'Sagbana', 'Nuageux'],
  'Stormy': ['Ahum ne Osuo', 'Ahomya', 'Kɔɔyɔɔ Kɛse', 'Saatahivili', 'Orageux'],
  'Good for Sowing': ['Ɛyɛ ma Dua', 'Enyo na Nukuƒãƒã', 'Ehi kɛha Dumɔ', 'Di viɛla Dubu', 'Bon pour les Semis'],
  'Good for Spraying': ['Ɛyɛ ma Adubɔ', 'Enyo na Atikewuwu', 'Ehi kɛha Tsofawɔɔ', 'Di viɛla Tim Pubu', 'Bon pour Pulvériser'],
  'Optimal': ['Ɛyɛ Paa', 'Enyo Kpataa', 'Ehi Jogbaŋŋ', 'Di Viɛla Pam', 'Optimal'],
  'Caution': ['Hwɛ Yie', 'Kpɔ Nyui', 'Kwɛmɔ Ojogbaŋŋ', 'Guuma A Maŋa', 'Prudence'],
  'Unfavorable': ['Ɛnyɛ ma Adwuma', 'Menyo o', 'Ehiii', 'Di Bi Viɛli', 'Défavorable'],

  // Market Prices Page
  'Nationwide Market Prices': [
    'Ghana Dwamu Nnoɔma Boɔ Nyinaa',
    'Ghana Asiwo Katã me Nuwo ƒe Asi',
    'Ghana Jaa Mli Nibii Ajilɔ',
    'Ghana Daa Nima Zaa Bindirigu Daa',
    'Prix des Marchés Nationaux'
  ],
  'Real-time commodity data with offline local caching': [
    'Nnoɔma boɔ foforɔ a ɛkora so wɔ fon so ma afuom',
    'Agblenuwo ƒe asi yeyewo si wodzrana ɖo ɖe mɔ̃ dzi',
    'Jaa mli nibii ajilɔ ni atoɔ mli yɛ fon nɔ',
    'Daa bindirigu daarima din kpalimda fon ni',
    'Cours des denrées en temps réel avec sauvegarde hors-ligne'
  ],
  'Pre-cache All Crops': [
    'Kora Boɔ Nyinaa So',
    'Dzra Asiwo Katã Ɖo',
    'To Jala Fɛɛ Mli',
    'Zaŋ Daa Nima Zaa',
    'Télécharger Tous les Prix'
  ],
  'Pre-caching...': [
    'Yɛrekora so...',
    'Míele edzram ɖo...',
    'Atoɔ mli...',
    'Di zaŋdila...',
    'Téléchargement...'
  ],
  'Live Market Prices': [
    'Dwamu Boɔ Foforɔ',
    'Asi Yeyewo',
    'Jaa Ajilɔ Hee',
    'Daa Daarima Pala',
    'Prix du Marché en Direct'
  ],
  '• Cached locally on your device': [
    '• Yɛakora so wɔ wo fon so',
    '• Wodzrae ɖo ɖe wò mɔ̃ dzi',
    '• Ato mli yɛ ofon nɔ',
    '• Di kpalimla a fon ni',
    '• Enregistré localement sur votre appareil'
  ],
  'Select Crop:': [
    'Paw Afifideɛ:',
    'Tia Nuku:',
    'Halamɔ Nii:',
    'Piimi Bimbili:',
    'Choisir une Culture :'
  ],
  'Select Crop': [
    'Paw Afifideɛ',
    'Tia Nuku',
    'Halamɔ Nii',
    'Piimi Bimbili',
    'Choisir une Culture'
  ],
  'Saved Offline for Field Visits:': [
    ' nea Yɛakora So Wɔ Fon So:',
    'Nu Siwo Wodzra Ɖo na Agbleyiɣi:',
    'Nibii ni Ato Mli yɛ Fon Nɔ:',
    'Binshɛŋ Din Kpalim Fon Ni:',
    'Enregistrés Hors-ligne pour le Terrain :'
  ],
  'Trading Market': ['Dwamu Beaeɛ', 'Asi Ŋkɔ', 'Jaa Gbɛi', 'Daa Yuli', 'Marché'],
  'Price (GHS)': ['Boɔ (GHS)', 'Asi (GHS)', 'Jara (GHS)', 'Daa (GHS)', 'Prix (GHS)'],
  'Standard Unit': ['Susudua', 'Dzidzenu', 'Susumɔ', 'Zahibu', 'Unité Standard'],
  'Trend': ['Nsakraeɛ', 'Tɔtrɔ', 'Tsakemɔ', 'Taɣibu', 'Tendance'],
  'Report Date': ['Da', 'Ŋkeke', 'Gbi', 'Dabisili', 'Date du Relevé'],
  'Rising': ['Ɛrekɔ Soro', 'Ele Dzidzim', 'Eyaa Ŋwɛi', 'Di Durimi', 'En hausse'],
  'Falling': ['Ɛreba Fam', 'Ele Điiɖim', 'Ebaa Shishi', 'Di Sheeri', 'En baisse'],
  'Stable': ['Ɛgyina Faako', 'Enɔ Teƒe Ɖeka', 'Edamɔ Shi', 'Di Zaŋ Tuhi', 'Stable'],
  'Cached': ['Akora So', 'Dzra Ɖo', 'To Mli', 'Kpalim', 'Enregistré'],

  // Offline Farm Guide
  'Offline Farm Guide & Local Storage Hub': [
    'Offline Kuadwuma Akwankyerɛ ne Siee Beaeɛ',
    'Offline Agbledede Mɔfiame kple Dzraɖoƒe',
    'Offline Ngbɔkuamɔ Wolo kɛ Tohe',
    'Offline Kparilim Wolo mini Soŋbu Shee',
    'Guide Agricole Hors-ligne & Stockage Local'
  ],
  'Guaranteed access to crucial farming information, prices, and weather when you have zero network coverage.': [
    'Nya kuadwuma ho nsɛm, nnoɔma boɔ ne wiemu nsɛm berɛ biara a intanɛte nni hɔ.',
    'Kpɔ agbledede nyatakakawo, asiwo kple yame nɔnɔme ne internet mele asiwò o.',
    'Kwɛmɔ ngbɔkuamɔ sane, jara kɛ kɔɔyɔɔŋ nibii kɛji intanɛt bɛ.',
    'Kpahi kparilim yɛla, daarima mini ania kpeha saha shɛli netwɛk ni kani.',
    'Accès garanti aux informations agricoles, aux prix et à la météo même sans couverture réseau.'
  ],
  'Online (Connected)': ['Intanɛte Wɔ Hɔ', 'Ka Le Dzi', 'Intanɛt Yɛ', 'Netwɛk Be Ni', 'En ligne (Connecté)'],
  'Offline Mode (Local Storage)': ['Offline (Fon So)', 'Offline (Mɔ̃ Dzi)', 'Offline (Fon Nɔ)', 'Offline (Fon Ni)', 'Mode Hors-ligne'],
  'Weather Cache': ['Wiemu Siee', 'Yame Dzraɖoƒe', 'Kɔɔyɔɔŋ Tohe', 'Ania Soŋbu', 'Cache Météo'],
  'Market Prices': ['Dwamu Boɔ', 'Asiwo', 'Jaa Ajilɔ', 'Daa Daarima', 'Prix du Marché'],
  'Saved Tips': ['Afotuo a Akora So', 'Aɖaŋu Dzraɖo', 'Kaa-woo ni Ato', 'Saɣisigu Soŋbu', 'Astuces Enregistrées'],
  'Device Storage': ['Fon So Beaeɛ', 'Mɔ̃ Dzi Teƒe', 'Fon Nɔ Gbɛhe', 'Fon Ni Polo', 'Stockage Appareil'],
  'Add Field Note / Custom Tip': [
    'Twerɛ Wo Ara Afuom Afotuo',
    'Ŋlɔ Agble Nya Yeye',
    'Ŋmaa Ŋmɔshi Sane Hee',
    'Sabli A Maŋa Kparilim Yɛla',
    'Ajouter une Note de Terrain'
  ],
  'Go to Prices': ['Kɔ Nnoɔma Boɔ', 'Yi Asiwo Me', 'Yaa Jara He', 'Chaŋ Daarima Ni', 'Voir les Prix'],
  'Go to Weather': ['Kɔ Wiemu Nsɛm', 'Yi Yame Nɔnɔme', 'Yaa Kɔɔyɔɔŋ He', 'Chaŋ Ania Ni', 'Voir la Météo'],
  'Reset Cache': ['Pepa Cache', 'Tutu Cache', 'Jiemɔ Cache', 'Nyɛhi Cache', 'Vider le Cache'],
  'All Tips': ['Afotuo Nyinaa', 'Aɖaŋuwo Katã', 'Kaa-woo Fɛɛ', 'Saɣisigu Zaa', 'Toutes les Astuces'],
  'Saved / Bookmarks': ['Nea Akora So', 'Siwo Wodzra Ɖo', 'Ni Ato Mli', 'Din Zaŋ Soŋ', 'Favoris Enregistrés'],
  'Pest & Diseases': ['Nkoekoemmoa ne Yareɛ', 'Nudzodzoewo kple Dɔléle', 'Helai kɛ Kooloi', 'Bimbila Doro', 'Ravageurs & Maladies'],
  'Soil & Water': ['Asase ne Nsuo', 'Anyigba kple Tsi', 'Shikpɔŋ kɛ Nu', 'Tiŋgbani mini Kom', 'Sol & Eau'],
  'Post-Harvest & Storage': ['Otwa Akyi Siee', 'Nuŋeŋe Megbe Dzraɖoɖo', 'Nikpamɔ Sɛɛ Tohe', 'Kpuɣibu Nyaaŋa Soŋbu', 'Post-Récolte & Stockage'],
  'MoFA Hotlines': ['MoFA Fon Nɔma', 'MoFA Ka Xexlẽdzesi', 'MoFA Tɛlifon', 'MoFA Fon Namba', 'Numéros Utiles MoFA'],
  'Crop Advisory Notes': ['Afifideɛ Akwankyerɛ', 'Nuku Aɖaŋuɖoɖo', 'Nii Dumɔ Wolo', 'Bimbili Saɣisigu', 'Notes de Conseils'],
  'Offline Storage Inventory': ['Nnoɔma a Yɛakora So Wɔ Fon So', 'Nu Siwo Le Mɔ̃a Dzi', 'Nibii ni Ato yɛ Fon Nɔ', 'Binshɛŋ Din Be Fon Ni', 'Inventaire du Stockage Hors-ligne'],

  // Crop Advisory Page
  'Smart Crop Advisory': [
    'Afifideɛ Akwankyerɛ Pa',
    'Nuku Aɖaŋuɖoɖo Nyui',
    'Nii Dumɔ Kaa-woo',
    'Bimbila Saɣisigu Suŋ',
    'Conseil Intelligent aux Cultures'
  ],
  'Tailored agricultural guidance saved for offline field visits': [
    'Kuadwuma akwankyerɛ pɔtee a yɛakora so ama afuom akwantuo',
    'Agbledede mɔfiame si wodzra ɖo na agbleyiɣi',
    'Ngbɔkuamɔ tsɔɔmɔ ni ato mli kɛha ŋmɔshi yaa',
    'Kparilim saɣisigu din kpalimda puuni chandi zuɣu',
    'Accompagnement agronomique sur mesure enregistré pour le terrain'
  ],
  'Planting / Sowing Date': ['Dua Da', 'Nukuƒãgbe', 'Dumɔ Gbi', 'Dubu Dabisili', 'Date de Semis / Plantation'],
  'Generate / Update Plan': ['Yɛ / Sesa Akwankyerɛ', 'Wɔ Aɖaŋuɖoɖo Yeye', 'Feemɔ Kaa-woo Hee', 'Maami Saɣisigu Palli', 'Générer / Mettre à jour le Plan'],
  'Generating Custom Plan...': ['Yɛreyɛ Akwankyerɛ...', 'Míele Aɖaŋuɖoɖo Wɔm...', 'Afeɔ Kaa-woo...', 'Ti Maanila Saɣisigu...', 'Génération du Plan...'],
  'Load Saved Offline Plan': ['Bue Offline Akwankyerɛ', 'Ʋu Offline Aɖaŋuɖoɖo', 'Gblemɔ Offline Wolo', 'Yooli Offline Saɣisigu', 'Charger le Plan Hors-ligne'],
  'Save to Offline Guide': ['Kora Wɔ Offline Guide', 'Dzra Ɖo Offline Guide', 'To Offline Wolo Mli', 'Zaŋ Niŋ Offline Wolo', 'Enregistrer dans le Guide Hors-ligne'],
  'Saved Offline': ['Akora So Wɔ Fon So', 'Wodzrae Ɖo', 'Ato Mli', 'Di Kpalimya', 'Enregistré Hors-ligne'],

  // Marketplace Page
  'Marketplace': ['Dwamu Kɛseɛ', 'Asi me', 'Jaa Lɔ', 'Daa Ni', 'Place de Marché'],
  'Buy and sell agricultural products.': [
    'Tɔ na tɔn kuadwuma nnoɔma ne nnɔbaeɛ.',
    'Ƒle eye nàdzra agblenuwo.',
    'He ni ohɔɔ ngbɔkuamɔ nibii.',
    'Damma ka kɔhi kparilim nɛma mini bindirigu.',
    'Achetez et vendez des produits et intrants agricoles.'
  ],
  'Handover QR': ['Nnoɔma Yi QR', 'Nudɔdɔ QR', 'Nibii Halamɔ QR', 'Deebu QR', 'QR de Remise'],
  'My Store': ['Me Dwa', 'Nye Asi', 'Mi Jaa', 'M Daa', 'Ma Boutique'],
  'Sell Item': ['Tɔn Adeɛ', 'Dzra Nu', 'Hɔɔ Nɔ', 'Kɔhi Binshɛli', 'Vendre un Article'],
  'My Listings': ['Me Nnoɔma a Metɔn', 'Nye Nudzraɖowo', 'Mi Nibii', 'M Nɛma', 'Mes Annonces'],
  'Switch to Buy': ['San Kɔ Tɔ Beaeɛ', 'Trɔ Yi Nuƒleƒe', 'Yaa Niihemɔ He', 'Labisi Daabu Shee', 'Passer en Mode Achat'],
  'Add Item': ['Fa Adeɛ Ka Ho', 'Tsɔ Nu Kpe Ɖe Eŋu', 'kɛ Nɔ Fata He', 'Pahi Binshɛli', 'Ajouter un Article'],
  'Add New Listing': ['Fa Adeɛ Foforɔ Gu Dwamu', 'De Nudzrala Yeye', 'Wo Nɔ Hee Jaa Mli', 'Niŋ Binshɛli Daa Ni', 'Nouvelle Annonce'],
  'Categories': ['Akuakuo', 'Ƒomeviwo', 'Kui', 'Pubu', 'Catégories'],
  'All': ['Nyinaa', 'Katã', 'Fɛɛ', 'Zaa', 'Tout'],
  'Seeds': ['Aba Pa', 'Nukuwo', 'Wui', 'Bimbiila', 'Semences'],
  'Fertilizers': ['Asase Nnuro (Fertilizer)', 'Anyigba Nyonu', 'Shikpɔŋ Tsofa', 'Tiŋgbani Tim', 'Engrais'],
  'Tools': ['Adwumayɛ Nnoɔma', 'Dɔwɔnuwo', 'Nitsumɔ Nii', 'Kparilim Nɛma', 'Outils'],
  'Produce': ['Nnɔbaeɛ', 'Agblenuwo', 'Ŋmɔshi Nibii', 'Bindirigu', 'Récoltes'],
  'Newest': ['Nea Ɛbaa Seesei', 'Yeyetɔwo', 'Ehee', 'Zaɣi Pala', 'Plus récents'],
  'Price: Low to High': ['Boɔ: Ketewa kɔ Kɛseɛ', 'Asi: Sue yi Gã', 'Jara: Bibioo kɛyaa Wulu', 'Daa: Pɔrilim hali Titali', 'Prix : Croissant'],
  'Price: High to Low': ['Boɔ: Kɛseɛ kɔ Ketewa', 'Asi: Gã yi Sue', 'Jara: Wulu kɛyaa Bibioo', 'Daa: Titali hali Pɔrilim', 'Prix : Décroissant'],
  'Name: A-Z': ['Din: A-Z', 'Ŋkɔ: A-Z', 'Gbɛi: A-Z', 'Yuli: A-Z', 'Nom : A-Z'],
  'View Details': ['Hwɛ Mu Nsɛm', 'Kpɔ Eme Nyawo', 'Kwɛmɔ Mli Sane', 'Kpahi Di Yɛla', 'Voir Détails'],
  'Less Info': ['Kata So', 'Ɣla Nyawo', 'ata Nɔ', 'Kpari Yɛla', 'Moins d\'infos'],
  'Contact': ['Di Nkitaho', 'Ƒo Ka', 'Bi Sane', 'Tɔɣisi', 'Contacter'],
  'Clear Filters': ['Yi Filter Firi Hɔ', 'Ɖe Filter Đaa', 'Jiemɔ Filter', 'Yihi Filter', 'Effacer les filtres'],

  // Equipment Rental Page
  'Equipment Rental & Sharing': [
    'Kuadwuma Mfirinsee ne Trakta Hanhan',
    'Agbledɔwɔnuwo kple Trakta Dodo',
    'Trakta kɛ Ngbɔkuamɔ Tsɔji Fɛmɔ',
    'Trakta mini Kparilim Nɛma Kuribu',
    'Location & Partage de Matériel Agricole'
  ],
  'List Equipment': ['Fa Afiri Gu So', 'De Dɔwɔnu Đe Eme', 'Wo Tsɔne Mli', 'Niŋ Nɛma Ni', 'Proposer un Matériel'],
  'All Types': ['Mfiri Nyinaa', 'Dɔwɔnu Katã', 'Tsɔji Fɛɛ', 'Nɛma Zaa', 'Tous les Types'],
  'Rent Now': ['Gye Seesei', 'Do Fifia', 'Fɛmɔ Amrɔ Nɛɛ', 'Kuri Saha Ŋɔ', 'Louer Maintenant'],
  'Rent Inquiry': ['Afiri Hanhan Bisa', 'Dɔwɔnu Dodo Biabia', 'Tsɔne Fɛmɔ Bimɔ', 'Nɛma Kuribu Bɔbu', 'Demande de Location'],
  'Send Request': ['Soma Abisadeɛ', 'Ɖo Biabia', 'Tsu Bimɔ', 'Tim Bɔbu', 'Envoyer la Demande'],
  'Save': ['Kora So', 'Dzra Ɖo', 'Tomɔ', 'Zaŋ Soŋ', 'Enregistrer'],
  'Cancel': ['Gyae', 'Dzudzɔ', 'Kpa', 'Chɛli', 'Annuler'],

  // Digital Wallet Page
  'Mobile Money & Digital Wallet': [
    'Mobile Money ne Sika Kotokuo',
    'Mobile Money kple Ga Kotoku',
    'Mobile Money kɛ Shika Kotoku',
    'Mobile Money mini Laɣifu Kotoku',
    'Mobile Money & Portefeuille Numérique'
  ],
  'Secure transactions via MTN MoMo, Vodafone Cash & AirtelTigo.': [
    'fa MTN MoMo, Telecel Cash ne AirtelTigo so soma na gye sika dwoodwoo.',
    'Ɖo ga dedie to MTN MoMo, Telecel Cash kple AirtelTigo dzi.',
    'Tsu shika hewalɛ mli yɛ MTN MoMo, Telecel Cash kɛ AirtelTigo nɔ.',
    'Tim laɣifu vienyelinga MTN MoMo, Telecel Cash mini AirtelTigo zuɣu.',
    'Transactions sécurisées via MTN MoMo, Telecel Cash et AirtelTigo.'
  ],
  'Available Balance': ['Sika a Ɛwɔ Kotokuo Mu', 'Ga Si Le Kotoku Me', 'Shika ni Yɔɔ Mli', 'Laɣifu Din Be Ni', 'Solde Disponible'],
  'Gold Tier User': ['Sikakɔkɔɔ Kuafoɔ', 'Sika Agbledela', 'Shika Okuafo', 'Salima Kparilimda', 'Membre Or'],
  'Deposit': ['Gu Sika Mu', 'De Ga Eme', 'Wo Shika Mli', 'Niŋ Laɣifu Ni', 'Dépôt'],
  'Withdraw': ['Yi Sika', 'Ɖe Ga', 'Jiemɔ Shika', 'Yihi Laɣifu', 'Retrait'],
  'Send': ['Soma Sika', 'Ɖo Ga', 'Tsu Shika', 'Tim Laɣifu', 'Envoyer'],
  'MoMo Pay': ['MoMo Tua Ka', 'MoMo Fexexe', 'MoMo Nyɔmɔwomɔ', 'MoMo Yɔri', 'MoMo Pay'],
  'Scan': ['Twa QR', 'Scan QR', 'Tswaa QR', 'Gbaai QR', 'Scanner'],
  'Loans': ['Bosea / Fɛm', 'Gadodo', 'Shika Fɛmɔ', 'Samli', 'Prêts'],
  'Bills': ['Tua Ka', 'Fexexewo', 'Nyɔmɔi', 'Samli Yɔri', 'Factures'],
  'Insurance': ['Ahobammɔ', 'Nudzɔdzɔ', 'Hewoo', 'Guubu', 'Assurance'],
  'Transaction History': ['Sika Ntoatoasoɔ Abakɔsɛm', 'Ga Dɔwɔwɔ Xoxowo', 'Shika Nitsumɔ Sɛɛ', 'Laɣifu Tuma Taarihi', 'Historique des Transactions'],
  'Link Bank/Card': ['Fa Sikakorabea Ka Ho', 'Tsɔ Gadzraɖoƒe Kpe Eŋu', 'Kɛ Banki Fata He', 'Pahi Banki', 'Lier Banque / Carte'],
  'Send Money (P2P)': ['Soma Sika Kɔma Obi', 'Ɖo Ga Na Ame', 'Tsu Shika Ha Mɔ', 'Tim Laɣifu Ninvuɣu', 'Envoyer de l\'Argent (P2P)'],
  'Recipient Network': ['Nea Ɔregye Network', 'Xɔla ƒe Ka', 'Mɔ ni Heɔ Network', 'Deera Netwɛk', 'Réseau du Destinataire'],
  'Recipient Number': ['Nea Ɔregye Fon Nɔma', 'Xɔla ƒe Ka Xexlẽdzesi', 'Mɔ ni Heɔ Tɛlifon', 'Deera Fon Namba', 'Numéro du Destinataire'],
  'Amount (GHS)': ['Sika Dodoɔ (GHS)', 'Ga Home (GHS)', 'Shika Fɛɛ (GHS)', 'Laɣifu (GHS)', 'Montant (GHS)'],
  'Reference (Optional)': ['Nsɛm Tiawa (Sɛ Wopɛ a)', 'Nya Kpui (Ne Èdi)', 'Sane Kuku', 'Yɛltɔɣa Bela', 'Référence (Optionnel)'],
  'Next': ['Toa So', 'Yi Edzi', 'Ya Nɔ', 'Chaŋ Tooni', 'Suivant'],

  // Community Forum Page
  'Community Farmer Discussions': [
    'Kuafoɔ Nkɔmmɔbɔ ne Afotuo Beaeɛ',
    'Agbledelawo ƒe Takpekpe kple Dzeɖoƒe',
    'Kuafoi Agbaa kɛ Kaa-woo He',
    'Kpariba Laɣingu mini Yɛltɔɣa Shee',
    'Discussions de la Communauté Agricole'
  ],
  'Ask questions, share organic remedies, and connect with fellow Ghanaian farmers.': [
    'Bisa nsɛm, kyɛ nhaban nnuro ho nimdeɛ na ne Ghana akuafoɔ mmɔ nkɔmmɔ.',
    'Bia nyawo, gblɔ atike nyuiwo ŋuti nya, eye nàɖo dze kple Ghana agbledelawo.',
    'Bi saji, tsɔɔ tsofa kpakpa, ni ogba sane kɛ Ghana kuafoi.',
    'Bɔhima bɔhisi, wuhimi tima suŋ, ka laɣim Ghana kpariba.',
    'Posez vos questions, partagez des remèdes naturels et échangez avec les agriculteurs ghanéens.'
  ],
  'New Post': ['Nkɔmmɔ Foforɔ', 'Nya Yeye', 'Sane Hee', 'Yɛltɔɣa Palli', 'Nouvelle Discussion'],
  'Back to Discussions': ['San Kɔ Nkɔmmɔbɔ Mu', 'Trɔ Yi Dzeɖoƒe', 'Ku Sɛɛ Kɛya Agbaa', 'Labisi Laɣingu Ni', 'Retour aux Discussions'],
  'Delete Post': ['Pepa Nkɔmmɔ Yi', 'Tutu Nya Sia', 'Jiemɔ Sane Nɛɛ', 'Nyɛhi Yɛltɔɣa Ŋɔ', 'Supprimer la Publication'],
  'Leave a Reply': ['Ma Mmuaeɛ', 'Ɖo Eŋu', 'Ha Hetoo', 'Labisi Yɛltɔɣa', 'Laisser une Réponse'],
  'Attach Photo': ['Fa Mfoni Ka Ho', 'De Fotɔ Kpe Eŋu', 'Kɛ Fɔto Fata He', 'Pahi Anfooni', 'Joindre une Photo'],
  'Post Reply': ['Soma Mmuaeɛ', 'Ɖo Ŋuɖoɖo', 'Tsu Hetoo', 'Tim Labisibu', 'Publier la Réponse'],
  'Create Discussion Post': ['Hyɛ Nkɔmmɔ Foforɔ Ase', 'Dze Dzeɖoɖo Yeye Gɔme', 'Je Sane Hee Shishi', 'Piini Yɛltɔɣa Palli', 'Créer une Discussion'],
  'Publish Discussion': ['Fa To Dwamu', 'Đe Gbeƒãe', 'Wo He Kpo', 'Yihi Polo', 'Publier la Discussion'],

  // Pest Diagnosis Page
  'Pest & Disease Diagnosis': [
    'Afifideɛ Nkoekoemmoa ne Yareɛ Hwehwɛ',
    'Ati ƒe Nudzodzoewo kple Dɔléle Kpɔkpɔ',
    'Kwɛɛnii Helai kɛ Kooloi Kɛlemɔ',
    'Bimbila Doro mini Binneema Vihigu',
    'Diagnostic des Ravageurs et Maladies'
  ],
  'Upload a photo of a diseased leaf to get a preliminary diagnosis and treatment advice.': [
    'Fa ahaban a yareɛ aka no mfoni bra ha na nya yareɛ no din ne nnuro a wode bɛsa.',
    'Tsɔ aŋgba si dɔ lé la ƒe fotɔ de eme ne nàkpɔ atike si nàwɔ nɛ.',
    'kɛ baa ni hela mli fɔto ba ní ona tsofa ni akɛbaatsu he nii.',
    'Zaŋmi vari din mali doro anfooni niŋ kpe ka nyɛ di alaafee bɔbu.',
    'Téléversez la photo d\'une feuille malade pour obtenir un diagnostic et un traitement recommandé.'
  ],
  'Log in to automatically save your diagnoses and images to your history.': [
    'Bra mu (Login) na yɛakora wo nhwehwɛmu ne mfoni nyinaa so wɔ wo akawunti mu.',
    'Ge ɖe eme be míadzra wò fotɔwo kple dɔléle kpɔkpɔwo ɖo.',
    'Botemɔ koni ato ofɔtoi kɛ helaiia ashishi yɛ o-akawunti mli.',
    'Kpɛma ka ti zaŋ a anfooni mini doro vihigu soŋ a akawunti ni.',
    'Connectez-vous pour enregistrer automatiquement vos diagnostics et photos dans votre historique.'
  ],
  'Click to select image': ['Mia ha na paw mfoni', 'Zi afii nàtia fotɔ', 'Mia biɛ ni ohala fɔto', 'Dihimi kpe ka pii anfooni', 'Cliquez pour choisir une image'],
  'Diagnose Plant': ['Hwehwɛ Afifideɛ Yareɛ', 'Kpɔ Ati ƒe Dɔléle', 'Kwɛmɔ Kwɛɛnii Hela', 'Vihimi Bimbila Doro', 'Diagnostiquer la Plante'],
  'Analyzing...': ['Yɛrehwehwɛ mu...', 'Míele eme kpɔm...', 'Akwɛɔ mli...', 'Ti vihirimi...', 'Analyse en cours...'],
  'Analyzing image, please wait...': [
    'Yɛrehwehwɛ mfoni no mu, yɛsrɛ wo twɛn kakra...',
    'Míele fotɔa me kpɔm, lala vie...',
    'Wɔkwɛɔ fɔto lɛ mli, mɛɛ fioo...',
    'Ti vihiri anfooni maa, guuma bela...',
    'Analyse de l\'image en cours, veuillez patienter...'
  ],
  'Diagnosis Result': ['Nhwehwɛmu Mmuaeɛ', 'Dɔléle Kpɔkpɔ Ŋuɖoɖo', 'Hela Kɛlemɔ Hetoo', 'Vihigu Labisibu', 'Résultat du Diagnostic'],

  // Orders Page
  'Orders & Deliveries': [
    'Nnoɔma a Woatɔ ne Nea Wɔde Rebrɛ Wo',
    'Nudɔdɔwo kple Nuɖoɖowo',
    'Nibii ni Ahala kɛ Majemɔ',
    'Daaha Nima mini Nɛma Tahibu',
    'Commandes & Livraisons'
  ],
  'Track and manage your agricultural purchases and sales.': [
    'Hwɛ nnoɔma a woatɔ ne nea woatɔn so wɔ ha.',
    'Kpɔ wò agblenu ƒeƒlewo kple dzradzrawo dzi.',
    'Kwɛmɔ onibii ni ohe kɛ nɔ ni ohɔɔ nɔ.',
    'Kpahi a ni da mini a ni kɔhi binshɛŋ zuɣu.',
    'Suivez et gérez vos achats et ventes de produits agricoles.'
  ],
  'Scan Handover QR': ['Twa Handover QR', 'Scan Handover QR', 'Tswaa Handover QR', 'Gbaai Handover QR', 'Scanner le QR de Remise'],
  'Handover Hub': ['Nnoɔma Yi Beaeɛ', 'Nudɔdɔ Teƒe', 'Nibii Halamɔ He', 'Deebu Shee', 'Centre de Remise'],
  'New Order': ['Tɔ Adeɛ Foforɔ', 'Dɔ Nu Yeye', 'Halamɔ Nɔ Hee', 'Da Binshɛli Palli', 'Nouvelle Commande'],
  'All Orders': ['Nnoɔma Nyinaa', 'Nudɔdɔ Katã', 'Nibii Fɛɛ', 'Daaha Zaa', 'Toutes les Commandes'],
  'Sales (Received)': ['Nea Woatɔn', 'Nudzradzrawo', 'Nibii ni Ahɔɔ', 'Kɔhibu', 'Ventes Reçues'],
  'Purchases': ['Nea Woatɔ', 'Nuƒleƒlewo', 'Nibii ni Ahe', 'Daabu', 'Achats'],
  'Processing': ['Yɛreyɛ Ho Adwuma', 'Wole Eŋu Dɔ Wɔm', 'Atsuɔ He Nii', 'Bɛ Tumdi Di Zuɣu', 'En traitement'],
  'Shipped': ['Ɛnam Kwan So', 'Ele Mɔ Dzi', 'Enyiɛ Gbɛ Nɔ', 'Di Be Soli Zuɣu', 'Expédié'],
  'Delivered': ['inya Aba Wie', 'Eva Đp', 'Ebashɛ', 'Di Paaya', 'Livré'],
  'Total Amount': ['Sika Dodoɔ Nyinaa', 'Ga Katã', 'Shika Fɛɛ', 'Laɣifu Zaa', 'Montant Total'],

  // Profile Page
  'My Profile': ['Me Ho Nsɛm', 'Nye Nyatakaka', 'Minaa Sane', 'M Maŋ Yɛla', 'Mon Profil'],
  'Manage your account and activities': [
    'Hwɛ wo akawunti ne wo dwumadie so',
    'Kpɔ wò akɔnta kple dɔwɔnawo dzi',
    'Kwɛmɔ o-akawunti kɛ onitsumɔi anɔ',
    'Kpahi a akawunti mini a tuma zuɣu',
    'Gérez votre compte et vos activités'
  ],
  'Edit Profile': ['Sesa Me Ho Nsɛm', 'Trɔ Nye Nyawo', 'Tsake Minaa Sane', 'Taɣi M Maŋ Yɛla', 'Modifier le Profil'],
  'Delete Account': ['Gu Akawunti', 'Tutu Akɔnta', 'Jiemɔ Akawunti', 'Nyɛhi Akawunti', 'Supprimer le Compte'],
  'Account Details': ['Akawunti Mu Nsɛm', 'Akɔnta Nyawo', 'Akawunti Mli Sane', 'Akawunti Yɛla', 'Détails du Compte'],
  'Contact Email': ['Email', 'Email', 'Email', 'Email', 'E-mail de Contact'],
  'User ID': ['User ID', 'User ID', 'User ID', 'User ID', 'Identifiant'],
  'Account Type': ['Akawunti Su', 'Akɔnta Ƒomevi', 'Akawunti Henɔ', 'Akawunti Balibu', 'Type de Compte'],
  'Marketplace Items': ['Dwamu Nnoɔma', 'Asi me Nuwo', 'Jaa Mli Nibii', 'Daa Nɛma', 'Articles du Marché'],
  'Equipment Rentals': ['Mfirinsee Hanhan', 'Dɔwɔnu Dodo', 'Tsɔji Fɛmɔ', 'Nɛma Kuribu', 'Locations de Matériel'],
  'Files saved from Pest Diagnosis, Equipment Rentals, and more appear here.': [
    'Mfoni ne nwoma a efi Afifideɛ Yareɛ Hwehwɛ, Mfirinsee ne Dwamu ba ha.',
    'Fotɔwo kple agbalẽ siwo wodzra ɖo la dzena le afii.',
    'Fɔtoi kɛ woloi ni ato mli lɛ jeɔ kpo yɛ biɛ.',
    'Anfooni mini kundunima din zaŋ soŋ yirina kpe.',
    'Les fichiers enregistrés depuis les diagnostics, locations et annonces apparaissent ici.'
  ],

  // Admin Console
  'Admin Access': ['Panin Kwan', 'Kplɔla Mɔnu', 'Onukpa Gbɛ', 'Kpambaliba Soli', 'Accès Administrateur'],
  'Admin Console': ['Panin Dwumadibea', 'Kplɔla Dɔwɔƒe', 'Onukpa Nitsumɔhe', 'Kpambaliba Tuma Shee', 'Console d\'Administration'],
  'Access Dashboard': ['Bue Panin Beaeɛ', 'Ʋu Kplɔla Teƒe', 'Gblemɔ Onukpa He', 'Yooli Kpambaliba Shee', 'Accéder au Tableau de Bord'],
  'Refresh Health Status': ['Hwɛ System Ahoɔden Bio', 'Kpɔ Mɔ̃a ƒe Dɔwɔwɔ', 'Kwɛmɔ System Hewalɛ', 'Vihimi System Alaafee', 'Actualiser l\'État du Système'],
  'Total Users': ['Nnipa Dodoɔ', 'Ezãlawo Katã', 'Gbɔmɛi Fɛɛ', 'Salinima Zaa', 'Total Utilisateurs'],
  'Market Listings': ['Dwamu Nnoɔma', 'Asi Nudzraɖowo', 'Jaa Nibii', 'Daa Nɛma', 'Annonces Marché'],
  'Total Volume': ['Sika a Adi Ahyia', 'Ga Katã', 'Shika Fɛɛ', 'Laɣifu Zaa', 'Volume Total'],
};

const CROP_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  'Maize': { en: 'Maize', tw: 'Aburo (Maize)', ee: 'Bli (Maize)', ga: 'Ablɛ (Maize)', dag: 'Kawana (Maize)', fr: 'Maïs (Maize)' },
  'Cassava': { en: 'Cassava', tw: 'Bankye (Cassava)', ee: 'Agbeli (Cassava)', ga: 'Duade (Cassava)', dag: 'Banchi (Cassava)', fr: 'Manioc (Cassava)' },
  'Yam': { en: 'Yam', tw: 'Bayerɛ (Yam)', ee: 'Te (Yam)', ga: 'Yɛlɛ (Yam)', dag: 'Nyuli (Yam)', fr: 'Igname (Yam)' },
  'Cocoa': { en: 'Cocoa', tw: 'Kookoo (Cocoa)', ee: 'Kookoo (Cocoa)', ga: 'Kookoo (Cocoa)', dag: 'Kookoo (Cocoa)', fr: 'Cacao (Cocoa)' },
  'Rice': { en: 'Rice', tw: 'Emo (Rice)', ee: 'Mɔli (Rice)', ga: 'Omɔ (Rice)', dag: 'Shinkafa (Rice)', fr: 'Riz (Rice)' },
  'Tomato': { en: 'Tomato', tw: 'Ntɔɔs (Tomato)', ee: 'Timati (Tomato)', ga: 'Amɔɔ (Tomato)', dag: 'Kamantoosi (Tomato)', fr: 'Tomate (Tomato)' },
  'Pepper': { en: 'Pepper', tw: 'Mako (Pepper)', ee: 'Atadi (Pepper)', ga: 'Shito (Pepper)', dag: 'Naanzua (Pepper)', fr: 'Piment (Pepper)' },
  'Okro': { en: 'Okro', tw: 'Nkruma (Okro)', ee: 'Fetri (Okro)', ga: 'Enmomi (Okro)', dag: 'Mana (Okro)', fr: 'Gombo (Okro)' },
  'Eggplant (Garden Eggs)': { en: 'Eggplant (Garden Eggs)', tw: 'Nyaadoa (Garden Eggs)', ee: 'Agbitsa (Garden Eggs)', ga: 'Sɛbɛ (Garden Eggs)', dag: 'Kpimba (Garden Eggs)', fr: 'Aubergine Africaine' },
  'Plantain': { en: 'Plantain', tw: 'Bɔdeɛ (Plantain)', ee: 'Abladu (Plantain)', ga: 'Amadaa (Plantain)', dag: 'Boridɛ (Plantain)', fr: 'Banane Plantain' },
  'Banana': { en: 'Banana', tw: 'Kwadu (Banana)', ee: 'Akɔɖu (Banana)', ga: 'Akwadu (Banana)', dag: 'Kodu (Banana)', fr: 'Banane Douce' },
  'KpakpoShito': { en: 'Kpakpo Shito (Pepper)', tw: 'Kpakpo Shito (Mako)', ee: 'Kpakpo Shito (Atadi)', ga: 'Kpakpo Shito', dag: 'Kpakpo Shito', fr: 'Piment Kpakpo Shito' },
  'Kpakpo Shito (Pepper)': { en: 'Kpakpo Shito (Pepper)', tw: 'Kpakpo Shito (Mako)', ee: 'Kpakpo Shito (Atadi)', ga: 'Kpakpo Shito', dag: 'Kpakpo Shito', fr: 'Piment Kpakpo Shito' },
  'Onion': { en: 'Onion', tw: 'Gyeene (Onion)', ee: 'Sabala (Onion)', ga: 'Sabola (Onion)', dag: 'Alibaasa (Onion)', fr: 'Oignon (Onion)' },
  'Orange': { en: 'Orange', tw: 'Ankaa (Orange)', ee: 'Aŋuti (Orange)', ga: 'Akutu (Orange)', dag: 'leemu (Orange)', fr: 'Orange' },
  'Ginger': { en: 'Ginger', tw: 'Akekaduro (Ginger)', ee: 'Nkrawusa (Ginger)', ga: 'Kakaduro (Ginger)', dag: 'Chinchini (Ginger)', fr: 'Gingembre (Ginger)' },
  'Sorghum': { en: 'Sorghum', tw: 'Atokoɔ (Sorghum)', ee: 'Fo (Sorghum)', ga: 'Akoko (Sorghum)', dag: 'Chi (Sorghum)', fr: 'Sorgho (Sorghum)' },
  'Soyabean': { en: 'Soyabean', tw: 'Soya Adua (Soyabean)', ee: 'Soya Ayii (Soyabean)', ga: 'Soya Yoo (Soyabean)', dag: 'Salinvɔɣu (Soyabean)', fr: 'Soja (Soyabean)' },
  'Millet': { en: 'Millet', tw: 'Ewio (Millet)', ee: 'lu (Millet)', ga: 'Ŋmaa (Millet)', dag: 'Za (Millet)', fr: 'Mil (Millet)' },
};

const LANG_INDEX: Record<Exclude<LanguageCode, 'en'>, number> = {
  tw: 0,
  ee: 1,
  ga: 2,
  dag: 3,
  fr: 4,
};

export const translateTextForLanguage = (text: string, lang: LanguageCode): string => {
  if (!text || lang === 'en') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const idx = LANG_INDEX[lang];

  // 1. Direct lookup in PHRASE_MAP
  if (PHRASE_MAP[trimmed]) {
    return text.replace(trimmed, PHRASE_MAP[trimmed][idx]);
  }

  // 2. Direct lookup in CROP_TRANSLATIONS
  if (CROP_TRANSLATIONS[trimmed]?.[lang]) {
    return text.replace(trimmed, CROP_TRANSLATIONS[trimmed][lang]);
  }

  // 3. Pattern-based dynamic phrases
  if (trimmed.startsWith('Wholesale Prices: ')) {
    const crop = trimmed.replace('Wholesale Prices: ', '').trim();
    const localizedCrop = CROP_TRANSLATIONS[crop]?.[lang] || crop;
    const prefix = ['Dwamu Boɔ: ', 'Asiwo: ', 'Jaa Ajilɔ: ', 'Daa Daarima: ', 'Prix de Gros : '][idx];
    return `${prefix}${localizedCrop}`;
  }

  if (trimmed.startsWith('Offline Cached Prices for ')) {
    const crop = trimmed.replace('Offline Cached Prices for ', '').trim();
    const localizedCrop = CROP_TRANSLATIONS[crop]?.[lang] || crop;
    const prefix = [
      'Offline Boɔ a Yɛakora So ma ',
      'Offline Asi Siwo Wodzra Ɖo na ',
      'Offline Jara ni Ato Mli kɛha ',
      'Offline Daa Din Kpalim ',
      'Prix Hors-ligne Enregistrés pour '
    ][idx];
    return `${prefix}${localizedCrop}`;
  }

  if (trimmed.startsWith('Sector: ')) {
    const sec = trimmed.replace('Sector: ', '');
    const prefix = ['Mpɔtam: ', 'Nutome: ', 'Kutso: ', 'Yaɣili: ', 'Secteur : '][idx];
    return `${prefix}${sec}`;
  }

  if (trimmed.startsWith('Wind: ')) {
    const val = trimmed.replace('Wind: ', '');
    const prefix = ['Mframa: ', 'Ya: ', 'Kɔɔyɔɔ: ', 'Pɔhim: ', 'Vent : '][idx];
    return `${prefix}${val}`;
  }

  if (trimmed.startsWith('Humidity: ')) {
    const val = trimmed.replace('Humidity: ', '');
    const prefix = ['Nwunu: ', 'Fafa: ', 'Bɔ́ɔ: ', 'Maasim: ', 'Humidité : '][idx];
    return `${prefix}${val}`;
  }

  return text;
};

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: Translations;
  tr: (text: string) => string;
  translateCrop: (crop: string) => string;
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

  const tr = useCallback(
    (text: string): string => translateTextForLanguage(text, language),
    [language]
  );

  const translateCrop = useCallback(
    (crop: string): string => CROP_TRANSLATIONS[crop]?.[language] || crop,
    [language]
  );

  // Automatic DOM text & attribute translator so all rendered pages, modals, and inputs
  // immediately reflect the selected language across the entire application.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language === 'fr' ? 'fr' : 'en';

    const translateNodeTree = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node: Text | null = walker.nextNode() as Text | null;

      while (node) {
        const parentTag = node.parentElement?.tagName;
        if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'CODE' && parentTag !== 'PRE') {
          const anyNode = node as any;
          const currentVal = node.nodeValue || '';

          if (anyNode.__agroOrigText === undefined) {
            anyNode.__agroOrigText = currentVal;
          } else if (
            anyNode.__agroLastTranslated !== undefined &&
            currentVal !== anyNode.__agroLastTranslated &&
            currentVal !== anyNode.__agroOrigText
          ) {
            // React updated the underlying text dynamically
            anyNode.__agroOrigText = currentVal;
          }

          const origText: string = anyNode.__agroOrigText;
          const nextText =
            language === 'en' ? origText : translateTextForLanguage(origText, language);

          if (node.nodeValue !== nextText) {
            anyNode.__agroLastTranslated = nextText;
            node.nodeValue = nextText;
          }
        }
        node = walker.nextNode() as Text | null;
      }
    };

    let isMutating = false;
    const runTranslationPass = () => {
      if (isMutating) return;
      isMutating = true;
      try {
        translateNodeTree(document.body);
      } finally {
        isMutating = false;
      }
    };

    runTranslationPass();

    const observer = new MutationObserver(() => {
      if (!isMutating) {
        runTranslationPass();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });

    return () => observer.disconnect();
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      tr,
      translateCrop,
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
