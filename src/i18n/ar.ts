import type { en } from './en'

export const ar: typeof en = {
  translation: {
    app: {
      name: 'EasyTask',
      tagline: 'نظّم ووزّع وتابع شغل فريقك',
    },
    nav: {
      dashboard: 'لوحة التحكم',
      users: 'المستخدمون',
      roles: 'الأدوار',
      teams: 'الفرق',
      projects: 'المشاريع',
      tasks: 'المهام',
      reports: 'التقارير',
      notifications: 'الإشعارات',
      profile: 'الملف الشخصي',
    },
    auth: {
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      logoutConfirm: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      sessionExpired: 'انتهت جلستك. الرجاء تسجيل الدخول من جديد.',
    },
    common: {
      loading: 'جارٍ التحميل…',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      save: 'حفظ التغييرات',
      search: 'بحث',
      language: 'English',
      notFound: 'الصفحة غير موجودة',
      forbidden: 'ليس لديك صلاحية لعرض هذه الصفحة.',
    },
  },
}
