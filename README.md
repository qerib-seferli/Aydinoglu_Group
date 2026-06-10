# NAR & NOOR

Premium restoran/kafe saytı. GitHub Pages-də build olmadan işləyir və Supabase ilə menyu, rezervasiya, sifariş və newsletter datasını saxlayır.

## İşə salmaq

1. Supabase-də yeni project yarat.
2. `supabase.sql` faylındakı bütün SQL kodunu Supabase SQL Editor-da RUN et.
3. Supabase Project URL və anon public key dəyərlərini `config.js` faylına yaz:

```js
window.NAR_NOOR_CONFIG = {
  supabaseUrl: "https://PROJECT_ID.supabase.co",
  supabaseAnonKey: "PUBLIC_ANON_KEY"
};
```

4. Faylları GitHub repository-ə push et.
5. GitHub Pages üçün `Settings -> Pages -> Deploy from a branch -> main / root` seç.

## Fayllar

- `index.html` - əsas sayt strukturu
- `styles.css` - responsive UI, animasiyalar və rəng sistemi
- `app.js` - menyu, səbət, rezervasiya, sifariş və Supabase bağlantısı
- `config.js` - Supabase açarları
- `supabase.sql` - cədvəllər, RLS policy-lər və demo menyu datası

Supabase açarları boş qalanda sayt yenə açılır və lokal fallback menyu ilə işləyir. Canlı yazma əməliyyatları üçün `config.js` doldurulmalıdır.
