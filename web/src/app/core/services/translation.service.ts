import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'mk' | 'en';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  mk: {
    // Nav
    'nav.deals': 'Понуди',
    'nav.weddings': 'Свадби',
    'nav.prewedding': 'Девојачко / Момачко',
    'nav.bands': 'Бендови',
    'nav.about': 'За нас',
    'nav.help': 'Помош',
    'auth.logout': 'Одјава',
    'auth.login': 'Најава',
    'auth.register': 'Регистрација',
    'auth.orDivider': 'или',
    'lang.toggle': 'EN',

    // Common
    'common.search': 'Пребарувајте по име, град или опис...',
    'common.loading': 'Вчитување...',
    'common.noResults': 'Нема пронајдени објекти.',
    'common.back': '← Назад',
    'common.backHome': 'Назад на почетна',
    'common.guests': 'До {{n}} гости',
    'common.from': 'Од {{n}} МКД',
    'common.cancel': 'Откажи',
    'common.save': 'Зачувај',
    'common.error': 'Грешка',
    'common.featured': 'Издвоено',

    // Home
    'home.hero.title': 'Пронајдете го совршеното место за вашиот посебен ден',
    'home.hero.subtitle': 'Прегледајте стотици ресторани и сали за свадби и преддвечерни прослави',
    'home.feature1.title': 'Сали за свадби',
    'home.feature1.desc': 'Пронајдете елегантни сали и ресторани кои ќе го направат вашиот ден незаборавен.',
    'home.feature1.link': 'Погледни понуди',
    'home.feature2.title': 'Девојачко / Момачко',
    'home.feature2.desc': 'Совршени места за прослави пред свадбата со вашите најблиски.',
    'home.feature2.link': 'Погледни понуди',
    'home.feature3.title': 'Бендови',
    'home.feature3.desc': 'Пронајдете бенд кој ќе ја озвучи вашата свадба или прослава.',
    'home.feature3.link': 'Погледни бендови',

    // Weddings
    'weddings.title': 'Сали за свадби',
    'weddings.subtitle': 'Пронајдете совршено место за вашиот голем ден',

    // Prewedding
    'prewedding.title': 'Девојачко / Момачко вечер',
    'prewedding.subtitle': 'Совршени места за прослави пред свадбата',

    // Deals (combined browse page)
    'deals.title': 'Сите понуди',
    'deals.subtitle': 'Сали, бендови и локации на едно место — филтрирајте по тоа што ви треба',

    // Bands
    'bands.title': 'Бендови за свадби',
    'bands.subtitle': 'Пронајдете бенд кој ќе ја озвучи вашата прослава',
    'bands.noResults': 'Нема пронајдени бендови.',

    // Band detail
    'band.about': 'За бендот',
    'band.genre': 'Жанр',
    'band.pricePerEvent': 'Цена по настан',
    'band.contact': 'Контакт',
    'band.notFound': 'Бендот не е пронајден.',

    // Venue detail
    'venue.wedding': 'Свадба',
    'venue.prewedding': 'Преддвечерна прослава',
    'venue.about': 'За објектот',
    'venue.mealPlans': 'Мени планови',
    'venue.noMealPlans': 'Сопственикот сè уште не додал мени планови.',
    'venue.perPerson': 'МКД / лице',
    'venue.drinksIncluded': '🍾 Вклучени пијалоци',
    'venue.capacity': 'Капацитет',
    'venue.capacityVal': 'До {{n}} гости',
    'venue.basePrice': 'Основна цена',
    'venue.phone': 'Телефон',
    'venue.website': 'Веб',
    'venue.visitSite': 'Посети страна',
    'venue.owner': 'Сопственик',
    'venue.location': 'Локација',
    'venue.openMaps': '🗺️ Отвори Google Maps',
    'venue.notFound': 'Објектот не е пронајден.',

    // Reviews
    'reviews.title': 'Оценки и коментари',
    'reviews.noReviews': 'Сè уште нема коментари.',
    'reviews.loginLink': 'Најавете се',
    'reviews.loginPrompt': 'за да оставите коментар и оценка.',
    'reviews.commentPlaceholder': 'Споделете го вашето искуство...',
    'reviews.submit': 'Објави коментар',
    'reviews.update': 'Ажурирај коментар',

    // Login
    'login.title': 'Најава',
    'login.subtitle': 'Добредојдовте назад!',
    'login.email': 'Е-пошта',
    'login.emailPlaceholder': 'vas@email.com',
    'login.password': 'Лозинка',
    'login.passwordPlaceholder': '••••••••',
    'login.submit': 'Најави се',
    'login.loading': 'Најавување...',
    'login.emailError': 'Внесете правилна е-пошта',
    'login.passwordError': 'Лозинката е задолжителна',
    'login.noAccount': 'Немате сметка?',
    'login.registerLink': 'Регистрирајте се',

    // Register
    'register.title': 'Регистрација',
    'register.subtitle': 'Создадете нова сметка',
    'register.fullName': 'Име и презиме',
    'register.email': 'Е-пошта',
    'register.password': 'Лозинка',
    'register.passwordHint': 'Мин. 6 карактери',
    'register.roleLabel': 'Тип на сметка',
    'register.visitorLabel': 'Гостин / Посетител',
    'register.visitorDesc': 'Прегледување на понуди',
    'register.ownerLabel': 'Сопственик на објект',
    'register.ownerDesc': 'Додавање на понуди',
    'register.bandLabel': 'Бенд',
    'register.bandDesc': 'Понудете се за свадби',
    'register.submit': 'Регистрирај се',
    'register.loading': 'Регистрирање...',
    'register.nameError': 'Името е задолжително',
    'register.emailError': 'Внесете правилна е-пошта',
    'register.passwordError': 'Лозинката мора да има најмалку 6 карактери',
    'register.hasAccount': 'Веќе имате сметка?',
    'register.loginLink': 'Најавете се',

    // Dashboard
    'dashboard.title': 'Мои објекти',
    'dashboard.welcome': 'Добредојдовте, {{name}}',
    'dashboard.addVenue': '+ Додај објект',
    'dashboard.noVenues': 'Немате додадени објекти.',
    'dashboard.addFirst': 'Додај прв објект',
    'dashboard.addMenu': '+ Мени',
    'dashboard.edit': 'Уреди',
    'dashboard.delete': 'Избриши',
    'dashboard.confirmDelete': 'Да се избрише објектот?',
    'dashboard.venueAdded': 'Објектот е додаден!',
    'dashboard.venueUpdated': 'Објектот е ажуриран!',
    'dashboard.menuAdded': 'Менито е додадено!',
    'dashboard.newListing': 'Нова понуда',
    'dashboard.editListing': 'Уреди понуда',
    'dashboard.submitListing': 'Додај понуда',
    'dashboard.venueName': 'Назив на објект *',
    'dashboard.type': 'Тип *',
    'dashboard.typeWedding': 'Свадба',
    'dashboard.typePrewedding': 'Девојачко / Момачко',
    'dashboard.description': 'Опис',
    'dashboard.address': 'Адреса *',
    'dashboard.city': 'Град *',
    'dashboard.capacity': 'Капацитет',
    'dashboard.basePrice': 'Основна цена (МКД)',
    'dashboard.phone': 'Телефон',
    'dashboard.website': 'Веб-страна',
    'dashboard.latitude': 'Географска ширина (GPS)',
    'dashboard.longitude': 'Географска должина (GPS)',
    'dashboard.imageUrl': 'Слика',
    'dashboard.imageUrlPlaceholder': 'или залепете URL на слика',
    'dashboard.uploadingPhoto': 'Се вчитува...',
    'dashboard.addMealPlanTitle': 'Додај мени план',
    'dashboard.menuName': 'Назив на менито *',
    'dashboard.menuDesc': 'Опис',
    'dashboard.pricePerPerson': 'Цена по лице (МКД) *',
    'dashboard.includesDrinks': 'Вклучува пијалоци',
    'dashboard.addMenuBtn': 'Додај мени',

    // Dashboard — bands
    'dashboard.bandTitle': 'Мојот бенд',
    'dashboard.addBand': '+ Додај бенд профил',
    'dashboard.noBand': 'Сè уште немате додадено бенд профил.',
    'dashboard.addFirstBand': 'Додај бенд профил',
    'dashboard.bandName': 'Име на бендот *',
    'dashboard.bandGenre': 'Жанр',
    'dashboard.pricePerEvent': 'Цена по настан (МКД)',
    'dashboard.bandAdded': 'Бенд профилот е додаден!',
    'dashboard.bandUpdated': 'Бенд профилот е ажуриран!',
    'dashboard.confirmDeleteBand': 'Да се избрише бенд профилот?',
    'dashboard.featureListing': '★ Истакни (плаќање)',
    'dashboard.redirecting': 'Пренасочување...',
    'dashboard.paymentSuccess': 'Плаќањето е успешно! Понудата ќе биде истакната наскоро.',
    'dashboard.paymentCancelled': 'Плаќањето е откажано.',

    // About
    'about.title': 'За нас',
    'about.subtitle': 'Дознајте повеќе за MyWeddingDay платформата',
    'about.missionTitle': 'Нашата мисија',
    'about.missionText': 'MyWeddingDay е платформа која поврзува двојки кои планираат свадба или преддвечерна прослава со најдобрите ресторани и сали во Македонија. Нашата цел е секој посебен ден да стане незаборавен.',
    'about.offerTitle': 'Што нудиме?',
    'about.f1title': 'Преглед на сали и ресторани',
    'about.f1desc': 'Бесплатен пристап до сите понуди без регистрација.',
    'about.f2title': 'Детален приказ на мени',
    'about.f2desc': 'Секое место прикажува достапни мenii и цени по лице.',
    'about.f3title': 'Google Maps навигација',
    'about.f3desc': 'Директна рута до секој објект со еден клик.',
    'about.f4title': 'За сопствениците на објекти',
    'about.f4desc': 'Едноставно додавање и управување со вашите понуди.',
    'about.contactTitle': 'Контакт',
    'about.phone': 'Телефон: +389 2 123 4567',

    // Help
    'help.title': 'Центар за помош',
    'help.subtitle': 'Чести прашања и одговори',
    'help.faqTitle': 'Чести прашања',
    'help.q1': 'Дали мора да се регистрирам за да ги прегледам понудите?',
    'help.a1': 'Не, сите понуди се достапни за сите посетители без регистрација. Регистрацијата е потребна само ако сакате да додадете објект или да ги користите напредните функции.',
    'help.q2': 'Како да го додадам мојот ресторан или сала?',
    'help.a2': 'Регистрирајте се како „Сопственик на објект", најавете се и одете на страницата Мои Објекти. Таму можете да додадете објект со сите детали, вклучително и мени планови и цени.',
    'help.q3': 'Како функционира рутата на Google Maps?',
    'help.a3': 'На страницата на секој објект има копче „Отвори Google Maps" кое отвора директна рута до адресата на објектот.',
    'help.q4': 'Дали можам да го контактирам сопственикот на објектот?',
    'help.a4': 'Да, на страницата на секој објект се прикажани контакт информации — телефон и веб-страна на сопственикот.',
    'help.q5': 'Дали апликацијата е бесплатна?',
    'help.a5': 'Да, користењето на платформата е целосно бесплатно за сите корисници.',
    'help.q6': 'Како да пријавам проблем?',
    'help.a6': 'Пишете ни на support&#64;myweddingday.mk и ќе одговориме во најкраток рок.',
    'help.contactTitle': 'Потребна дополнителна помош?',
    'help.contactDesc': 'Нашиот тим е достапен работните денови од 9ч до 17ч.',
    'help.contactBtn': 'Контактирајте нè',
  },

  en: {
    // Nav
    'nav.deals': 'Deals',
    'nav.weddings': 'Weddings',
    'nav.prewedding': 'Bachelorette / Bachelor',
    'nav.bands': 'Bands',
    'nav.about': 'About Us',
    'nav.help': 'Help',
    'auth.logout': 'Logout',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.orDivider': 'or',
    'lang.toggle': 'MK',

    // Common
    'common.search': 'Search by name, city, or description...',
    'common.loading': 'Loading...',
    'common.noResults': 'No venues found.',
    'common.back': '← Back',
    'common.backHome': 'Back to home',
    'common.guests': 'Up to {{n}} guests',
    'common.from': 'From {{n}} MKD',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.error': 'Error',
    'common.featured': 'Featured',

    // Home
    'home.hero.title': 'Find the perfect venue for your special day',
    'home.hero.subtitle': 'Browse hundreds of restaurants and halls for weddings and pre-wedding parties',
    'home.feature1.title': 'Wedding Halls',
    'home.feature1.desc': 'Find elegant halls and restaurants that will make your big day unforgettable.',
    'home.feature1.link': 'View offers',
    'home.feature2.title': 'Bachelorette / Bachelor',
    'home.feature2.desc': 'Perfect venues for pre-wedding celebrations with your closest friends.',
    'home.feature2.link': 'View offers',
    'home.feature3.title': 'Bands',
    'home.feature3.desc': 'Find a band to soundtrack your wedding or celebration.',
    'home.feature3.link': 'View bands',

    // Weddings
    'weddings.title': 'Wedding Halls',
    'weddings.subtitle': 'Find the perfect venue for your big day',

    // Prewedding
    'prewedding.title': 'Bachelorette / Bachelor Party',
    'prewedding.subtitle': 'Perfect venues for pre-wedding celebrations',

    // Deals (combined browse page)
    'deals.title': 'All Deals',
    'deals.subtitle': 'Halls, bands, and venues in one place — filter for exactly what you need',

    // Bands
    'bands.title': 'Wedding Bands',
    'bands.subtitle': 'Find a band to soundtrack your celebration',
    'bands.noResults': 'No bands found.',

    // Band detail
    'band.about': 'About the Band',
    'band.genre': 'Genre',
    'band.pricePerEvent': 'Price per event',
    'band.contact': 'Contact',
    'band.notFound': 'Band not found.',

    // Venue detail
    'venue.wedding': 'Wedding',
    'venue.prewedding': 'Pre-wedding Party',
    'venue.about': 'About the Venue',
    'venue.mealPlans': 'Meal Plans',
    'venue.noMealPlans': 'The owner has not added any meal plans yet.',
    'venue.perPerson': 'MKD / person',
    'venue.drinksIncluded': '🍾 Drinks included',
    'venue.capacity': 'Capacity',
    'venue.capacityVal': 'Up to {{n}} guests',
    'venue.basePrice': 'Base Price',
    'venue.phone': 'Phone',
    'venue.website': 'Website',
    'venue.visitSite': 'Visit site',
    'venue.owner': 'Owner',
    'venue.location': 'Location',
    'venue.openMaps': '🗺️ Open Google Maps',
    'venue.notFound': 'Venue not found.',

    // Reviews
    'reviews.title': 'Reviews',
    'reviews.noReviews': 'No reviews yet.',
    'reviews.loginLink': 'Log in',
    'reviews.loginPrompt': 'to leave a comment and rating.',
    'reviews.commentPlaceholder': 'Share your experience...',
    'reviews.submit': 'Post review',
    'reviews.update': 'Update review',

    // Login
    'login.title': 'Login',
    'login.subtitle': 'Welcome back!',
    'login.email': 'Email address',
    'login.emailPlaceholder': 'your@email.com',
    'login.password': 'Password',
    'login.passwordPlaceholder': '••••••••',
    'login.submit': 'Login',
    'login.loading': 'Logging in...',
    'login.emailError': 'Enter a valid email address',
    'login.passwordError': 'Password is required',
    'login.noAccount': "Don't have an account?",
    'login.registerLink': 'Register',

    // Register
    'register.title': 'Register',
    'register.subtitle': 'Create a new account',
    'register.fullName': 'Full name',
    'register.email': 'Email address',
    'register.password': 'Password',
    'register.passwordHint': 'Min. 6 characters',
    'register.roleLabel': 'Account type',
    'register.visitorLabel': 'Guest / Visitor',
    'register.visitorDesc': 'Browse offers',
    'register.ownerLabel': 'Venue Owner',
    'register.ownerDesc': 'Add offers',
    'register.bandLabel': 'Band',
    'register.bandDesc': 'Offer yourself for weddings',
    'register.submit': 'Register',
    'register.loading': 'Registering...',
    'register.nameError': 'Name is required',
    'register.emailError': 'Enter a valid email address',
    'register.passwordError': 'Password must be at least 6 characters',
    'register.hasAccount': 'Already have an account?',
    'register.loginLink': 'Login',

    // Dashboard
    'dashboard.title': 'My Venues',
    'dashboard.welcome': 'Welcome, {{name}}',
    'dashboard.addVenue': '+ Add Venue',
    'dashboard.noVenues': 'You have no venues added.',
    'dashboard.addFirst': 'Add first venue',
    'dashboard.addMenu': '+ Menu',
    'dashboard.edit': 'Edit',
    'dashboard.delete': 'Delete',
    'dashboard.confirmDelete': 'Delete this venue?',
    'dashboard.venueAdded': 'Venue added!',
    'dashboard.venueUpdated': 'Venue updated!',
    'dashboard.menuAdded': 'Menu added!',
    'dashboard.newListing': 'New Listing',
    'dashboard.editListing': 'Edit Listing',
    'dashboard.submitListing': 'Add listing',
    'dashboard.venueName': 'Venue name *',
    'dashboard.type': 'Type *',
    'dashboard.typeWedding': 'Wedding',
    'dashboard.typePrewedding': 'Bachelorette / Bachelor',
    'dashboard.description': 'Description',
    'dashboard.address': 'Address *',
    'dashboard.city': 'City *',
    'dashboard.capacity': 'Capacity',
    'dashboard.basePrice': 'Base Price (MKD)',
    'dashboard.phone': 'Phone',
    'dashboard.website': 'Website',
    'dashboard.latitude': 'Latitude (GPS)',
    'dashboard.longitude': 'Longitude (GPS)',
    'dashboard.imageUrl': 'Photo',
    'dashboard.imageUrlPlaceholder': 'or paste an image URL',
    'dashboard.uploadingPhoto': 'Uploading...',
    'dashboard.addMealPlanTitle': 'Add Meal Plan',
    'dashboard.menuName': 'Menu name *',
    'dashboard.menuDesc': 'Description',
    'dashboard.pricePerPerson': 'Price per person (MKD) *',
    'dashboard.includesDrinks': 'Includes drinks',
    'dashboard.addMenuBtn': 'Add menu',

    // Dashboard — bands
    'dashboard.bandTitle': 'My Band',
    'dashboard.addBand': '+ Add Band Profile',
    'dashboard.noBand': "You haven't added a band profile yet.",
    'dashboard.addFirstBand': 'Add band profile',
    'dashboard.bandName': 'Band name *',
    'dashboard.bandGenre': 'Genre',
    'dashboard.pricePerEvent': 'Price per event (MKD)',
    'dashboard.bandAdded': 'Band profile added!',
    'dashboard.bandUpdated': 'Band profile updated!',
    'dashboard.confirmDeleteBand': 'Delete this band profile?',
    'dashboard.featureListing': '★ Feature (paid)',
    'dashboard.redirecting': 'Redirecting...',
    'dashboard.paymentSuccess': 'Payment successful! Your listing will be featured shortly.',
    'dashboard.paymentCancelled': 'Payment was cancelled.',

    // About
    'about.title': 'About Us',
    'about.subtitle': 'Learn more about the MyWeddingDay platform',
    'about.missionTitle': 'Our Mission',
    'about.missionText': 'MyWeddingDay is a platform connecting couples planning a wedding or pre-wedding celebration with the best restaurants and halls in Macedonia. Our goal is to make every special day unforgettable.',
    'about.offerTitle': 'What do we offer?',
    'about.f1title': 'Browse halls and restaurants',
    'about.f1desc': 'Free access to all listings without registration.',
    'about.f2title': 'Detailed menu display',
    'about.f2desc': 'Every venue shows available menus and prices per person.',
    'about.f3title': 'Google Maps navigation',
    'about.f3desc': 'Direct route to every venue with one click.',
    'about.f4title': 'For venue owners',
    'about.f4desc': 'Easy listing management and offer publishing.',
    'about.contactTitle': 'Contact',
    'about.phone': 'Phone: +389 2 123 4567',

    // Help
    'help.title': 'Help Center',
    'help.subtitle': 'Frequently asked questions',
    'help.faqTitle': 'FAQ',
    'help.q1': 'Do I need to register to browse listings?',
    'help.a1': 'No, all listings are available to everyone without registration. An account is only needed to add a venue or use advanced features.',
    'help.q2': 'How do I add my restaurant or hall?',
    'help.a2': 'Register as a "Venue Owner", log in, and go to the My Venues page. There you can add a venue with all details including meal plans and prices.',
    'help.q3': 'How does the Google Maps route work?',
    'help.a3': 'On every venue page there is an "Open Google Maps" button that opens a direct route to the venue\'s address.',
    'help.q4': 'Can I contact the venue owner?',
    'help.a4': 'Yes, every venue page shows contact information — phone and website of the owner.',
    'help.q5': 'Is the app free?',
    'help.a5': 'Yes, using the platform is completely free for all users.',
    'help.q6': 'How do I report a problem?',
    'help.a6': 'Email us at support&#64;myweddingday.mk and we will respond as soon as possible.',
    'help.contactTitle': 'Need more help?',
    'help.contactDesc': 'Our team is available on weekdays from 9am to 5pm.',
    'help.contactBtn': 'Contact us',
  },
};

const LANG_STORAGE_KEY = 'lang';

function loadStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === 'en' || stored === 'mk' ? stored : 'mk';
  } catch {
    return 'mk';
  }
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private langSubject = new BehaviorSubject<Lang>(loadStoredLang());
  lang$ = this.langSubject.asObservable();

  get lang(): Lang {
    return this.langSubject.value;
  }

  toggle(): void {
    const next = this.lang === 'mk' ? 'en' : 'mk';
    this.langSubject.next(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // localStorage can throw in private browsing / blocked storage — language just
      // won't persist across reloads in that case, not worth failing the toggle over.
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    let val = TRANSLATIONS[this.lang][key] ?? TRANSLATIONS['en'][key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{{${k}}}`, String(v));
      });
    }
    return val;
  }
}
