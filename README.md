# AYDINOĞLU GROUP saytı

Tam statik frontend + Supabase backend. GitHub Pages, Netlify və ya Vercel Static kimi hostlarda işləyir.

## Qurulum

1. Supabase layihəsi yaradın.
2. `supabase-schema.sql` faylındakı bütün SQL kodunu Supabase SQL Editor-da RUN edin.
3. Supabase Dashboard > Authentication > Users bölməsində admin istifadəçi yaradın.
4. SQL faylının sonundakı admin sətrində emaili dəyişib RUN edin:

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

5. `config.example.js` faylını nümunə kimi istifadə edin və `config.js` içində dəyərləri doldurun:

```js
window.AYDINOGLU_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-SUPABASE-ANON-KEY"
};
```

6. GitHub-a bu qovluğu yükləyin və GitHub Pages üçün root kimi seçin.

## Fayllar

- `index.html` - sayt və admin panel
- `styles.css` - responsive UI, animasiyalar, rəng sistemi
- `app.js` - Supabase oxu/yazı, filter, modal, admin CRUD
- `config.js` - Supabase URL və anon key
- `supabase-schema.sql` - cədvəllər, RLS policy-lər, seed data

## Admin panel

Saytda `#admin` bölməsinə keçin və Supabase Auth-da yaratdığınız admin email/parol ilə daxil olun. Admin paneldə məhsul, kateqoriya, müştəri sorğuları və mağaza ayarları idarə olunur.
