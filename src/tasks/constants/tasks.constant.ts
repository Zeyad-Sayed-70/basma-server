export interface TaskDefinition {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: string;
  action: string;
}

export const TASKS: TaskDefinition[] = [
  {
    key: 'complete_onboarding',
    labelAr: 'أكمل عملية الإعداد الأولي',
    labelEn: 'Complete onboarding',
    icon: 'rocket',
    action: '/onboarding',
  },
  {
    key: 'create_first_group',
    labelAr: 'أنشئ أول مجموعة',
    labelEn: 'Create your first group',
    icon: 'users',
    action: '/dashboard/groups',
  },
  {
    key: 'create_first_course',
    labelAr: 'أنشئ أول كورس',
    labelEn: 'Create your first course',
    icon: 'book',
    action: '/dashboard/courses',
  },
  {
    key: 'add_first_student',
    labelAr: 'أضف أول طالب',
    labelEn: 'Add your first student',
    icon: 'user-plus',
    action: '/dashboard/students',
  },
  {
    key: 'create_first_session',
    labelAr: 'أنشئ أول حصة',
    labelEn: 'Create your first session',
    icon: 'calendar',
    action: '/dashboard/sessions',
  },
  {
    key: 'customize_brand',
    labelAr: 'خصص ألوان منصتك',
    labelEn: 'Customize your brand colors',
    icon: 'palette',
    action: '/dashboard/brand',
  },
  {
    key: 'upload_logo',
    labelAr: 'ارفع شعار المنصة',
    labelEn: 'Upload your logo',
    icon: 'image',
    action: '/dashboard/brand',
  },
  {
    key: 'publish_landing',
    labelAr: 'انشر صفحة التعريف',
    labelEn: 'Publish your landing page',
    icon: 'globe',
    action: '/dashboard/landing',
  },
];
