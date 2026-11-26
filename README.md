# Misho Barber — առցանց գրանցում + ադմինկա

Երկու առանձին էջ.

| Էջ | Հասցե | Ում համար |
|---|---|---|
| Գրանցում | `https://ՁԵՐ-ԱՆՈՒՆԸ.github.io/misho-barber/` | Հաճախորդներ |
| Ադմինկա | `https://ՁԵՐ-ԱՆՈՒՆԸ.github.io/misho-barber/admin.html` | Միշո (email + գաղտնաբառ) |

Կայքը դրված է **GitHub Pages**-ում, տվյալները պահվում են **Firebase**-ում (Google)։ Երկուսն էլ անվճար են փոքր սրահի համար։

---

## Քայլ 1. Firebase պրոեկտ (≈7 րոպե)

1. Բացեք https://console.firebase.google.com → **Add project** → անուն, օրինակ `misho-barber` → Google Analytics-ը կարող եք անջատել → **Create**։
2. Ձախ մենյու → **Build → Firestore Database** → **Create database** → տարածաշրջանը՝ `europe-west` (Եվրոպա) → **Start in production mode** → Create։
3. Firestore → **Rules** ներդիր → ջնջեք եղածը, պատճենեք `firestore.rules` ֆայլի ամբողջ պարունակությունը, **`ADMIN_EMAIL@gmail.com`-ը փոխեք ադմինի իրական email-ով** → **Publish**։
4. Ձախ մենյու → **Build → Authentication** → **Get started** → **Email/Password** → Enable → Save։
5. Authentication → **Users** → **Add user** → նույն email-ը և գաղտնաբառ (սրանով Միշոն կմտնի ադմինկա)։
6. ⚙️ **Project settings** → General → ներքևում **Your apps** → սեղմեք `</>` (Web) → անուն → **Register app**։ Կտեսնեք `firebaseConfig = { apiKey: ..., ... }` — պատճենեք այդ արժեքները։

## Քայլ 2. GitHub (≈3 րոպե)

1. https://github.com/new → Repository name՝ `misho-barber` → **Public** → **Create repository**։
2. Սեղմեք **uploading an existing file** → քաշեք այս թղթապանակի **բոլոր ֆայլերն ու թղթապանակները** (`index.html`, `admin.html`, `css`, `js`, ...) → **Commit changes**։
3. Բացեք `js/firebase-config.js` → ✏️ (Edit) → `PASTE_...` արժեքները փոխարինեք Քայլ 1.6-ի արժեքներով → **Commit changes**։
4. Ռեպոյում **Settings → Pages** → Source՝ **Deploy from a branch** → Branch՝ `main`, `/ (root)` → **Save**։
5. 1–2 րոպեից վերևում կհայտնվի հղումը՝ `https://ՁԵՐ-ԱՆՈՒՆԸ.github.io/misho-barber/`։

## Քայլ 3. Միացնել դոմենը Firebase-ին

Firebase → **Authentication → Settings → Authorized domains** → **Add domain** → `ՁԵՐ-ԱՆՈՒՆԸ.github.io`։ (Առանց սրա ադմինկայի մուտքը չի աշխատի։)

## Քայլ 4. Առաջին գործարկում

1. Բացեք `.../admin.html` → մուտք գործեք email-ով և գաղտնաբառով։
2. Կբացվի **Կարգավորումներ**-ը՝ արդեն լրացված օրինակով (Միշո, 4 ծառայություն, 25 րոպե, 10:00–20:00, կիրակի՝ հանգիստ)։ Փոխեք անունը, հասցեն, հեռախոսը, գները → **Պահպանել**։
3. Վերջ. գրանցման էջը աշխատում է։ Ուղարկեք հղումը հաճախորդներին (Instagram bio, Google Maps, WhatsApp)։

---

## Ինչպես է աշխատում

- **Հաճախորդ**. ընտրում է մեկ կամ մի քանի ծառայություն (ամեն մեկը 25 րոպե) → օր → ազատ ժամ → անուն և հեռախոս → տեսնում է ընդհանուր գումարը → «Գրանցվել»։ Հաշիվ պետք չէ։
- Նույն ժամը երկու հոգի չեն կարող զբաղեցնել. դա ստուգում է Firebase-ը։
- Հաճախորդները **չեն տեսնում** ուրիշների անուններն ու հեռախոսները, միայն զբաղված ժամերը։
- **Ադմին**. օրվա ցուցակ, «✓ Եկավ», «✕ Չեղարկել» (ժամը ազատվում է), ձեռքով գրանցում, օրվա եկամուտ, կարգավորումներ։

## Սեփական դոմեն (ըստ ցանկության)

Եթե ունեք, օրինակ, `mishobarber.am`. GitHub → Settings → Pages → **Custom domain** → գրեք դոմենը, և դոմենի DNS-ում ավելացրեք `CNAME` → `ՁԵՐ-ԱՆՈՒՆԸ.github.io`։ Հետո այդ դոմենը նույնպես ավելացրեք Firebase → Authorized domains-ում։

## Ֆայլերը

```
index.html            գրանցման էջ
admin.html            ադմինկա
css/style.css         դիզայն
js/firebase-config.js Firebase-ի բանալիները (լրացնել)
js/core.js            ընդհանուր ֆունկցիաներ
js/book.js            գրանցման էջի տրամաբանություն
js/admin.js           ադմինկայի տրամաբանություն
firestore.rules       անվտանգության կանոններ (պատճենել Firebase)
```

> `firebase-config.js`-ի բանալիները գաղտնի չեն, դրանք նախատեսված են բրաուզերի համար։ Անվտանգությունը ապահովում է `firestore.rules`-ը։
