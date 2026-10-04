# Vyron — strona (Vercel)

Trzy osobne podstrony: **Main** (`index.html`), **Products** (`products.html`), **Contact Us** (`contact.html`).
Strona jest tylko po angielsku. Nie wymaga bazy danych.

## Lokalnie
```
npm install    # w PowerShellu z blokadą skryptów: npm.cmd install
npm start      # http://localhost:3000
```

## Wdrożenie na Vercel
Wrzuć folder na GitHub i zaimportuj repo w Vercel (albo `npx vercel` w tym folderze). Nic więcej nie trzeba.

## Do uzupełnienia (na górze `public/js/app.js`, obiekt `CONFIG`)
- `plans` — cena (obecnie 5$ Lifetime)
- `socials` (strona Contact Us) — obecnie tylko Discord (discord.gg/vyron); kolejne dodasz jako nowe wpisy
- Logo Premium Tweaks: podmień `public/assets/premium-tweaks-logo.png` (obecnie jest tam logo Vyron)
- Logo strony: `public/assets/logo.png`

## Kod JS (obfuskacja)
Czytelne źródła są w `src/js/` (to tam edytujesz). Do `public/js/` trafia wersja zaobfuskowana.
Po każdej zmianie w `src/js/` uruchom:
```
npm install      # raz (potrzebny javascript-obfuscator)
npm run build    # src/js -> public/js (obfuskacja)
```
Folder `src/` nie jest wdrażany na Vercel (tylko `public/`).

## Logowanie przez Discord (3 zmienne)
Logowanie pobiera tylko nazwę i avatar z Discorda (scope `identify`). Nie sprawdza członkostwa na serwerze. Koszyk działa bez konta, ale „Checkout" wymaga zalogowania.

1. https://discord.com/developers/applications -> New Application -> **OAuth2**.
2. W **Redirects** kliknij *Add Redirect*, wklej adres callbacku i **Save Changes**:
   - lokalnie: `http://localhost:3000/api/auth/callback`
   - Vercel: `https://twoja-domena.com/api/auth/callback`
3. Wpisz do `.env` (lokalnie) albo Vercel -> Settings -> Environment Variables:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI` (dokładnie ten sam adres co w punkcie 2)

Po zmianie zmiennych na Vercel zrób Redeploy. Przy starcie serwer wypisuje, czego brakuje.

### Płatności
Po „Checkout" otwiera się okno wyboru metody (ikony w `public/assets/pay/`):
- **Crypto: LTC, SOL, ETH** - adres + przybliżona kwota (kurs z CoinGecko) + przycisk kopiowania. Adresy są na górze `server.js`
  (`CRYPTO`), można je nadpisać zmiennymi `LTC_ADDRESS`, `SOL_ADDRESS`, `ETH_ADDRESS`.
- **PayPal, GiftCard, BLIK, Others** - tylko instrukcja tekstowa (bez przekierowania na kanał ticketów).
Metody i teksty edytujesz w `PAY_METHODS` na górze `src/js/app.js` (potem `npm run build`).
