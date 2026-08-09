# Full-platform language + mobile compactness contract

## Language
- `platformLanguage` controls the whole interface: navigation, page copy, forms, buttons, guidance, assistant and read-aloud text.
- `preferredLanguage` remains the independent outbound alert language.
- Supported production choices: English, Nigerian Pidgin, Hausa, Yorùbá and Igbo.
- Dynamic user data (names, locations, provider names, official source titles) is never machine-mutated.
- Safety-critical outbound emergency templates remain independently reviewed; unsupported reviewed templates fall back to approved English.

## Mobile
- Mobile header contains only menu + compact product identity.
- No theme/detail/role/language/read controls remain permanently in the mobile header.
- Mobile drawer is closed by default.
- Preferences are collapsed by default inside the drawer.
- Cards and actions stack; controls use touch-sized targets; no content should require permanent horizontal squeezing.
- Wide technical tables may scroll only in technical/detail contexts.
