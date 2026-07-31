# OmniSales Android

هيكل Clean Architecture (Kotlin + Jetpack Compose) للتطبيق الأصلي.

```
app/src/main/java/com/omnisales/app/
  domain/        # UseCases + models
  data/          # Room / sync repository
  presentation/  # POS + Settings Compose screens
```

يتطلب Android Studio + JDK 17. الواجهة الحالية الجاهزة للتجربة السريعة هي React PWA في `apps/desktop`.
