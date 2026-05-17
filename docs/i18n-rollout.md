# ORI CRUIT HUB i18n Rollout

The app now has a small typed i18n foundation for the commercial languages:

- `es`: current base language.
- `en`: first sales/distribution language.
- `pl`: operational market language for Poland.

## Current Scope

- Shared language types and labels live in `src/lib/i18n.ts`.
- `/api/settings` validates `interfaceLanguage` before persisting user preferences.
- The settings language panel uses the shared dictionary, so this preference is no longer a loose string.
- The public landing page and login page expose an ES/EN/PL selector and preserve the selected language through login links.

## Rollout Rules

1. Keep Spanish as the default fallback.
2. Move strings module by module, not by global search-replace.
3. Start with public and commercial surfaces:
   - login: started
   - marketing: started
   - candidate registration
   - pricing/billing
4. Then translate operational modules:
   - candidates
   - documents/OCR
   - legal
   - logistics
5. Avoid translating database enum values directly in the database. Use UI labels mapped from stable enum keys.

## Distribution Blocker

Before external SaaS distribution, all public routes and pricing pages should support at least EN and PL. Internal admin pages can remain Spanish during the first private pilots if the operating team accepts it.
