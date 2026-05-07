# AVATAR Dashboard

Dashboard hodnocení produkčních konverzací avatara.  
Po přidání nových dat se dashboard **automaticky přegeneruje a publikuje** přes GitHub Actions + GitHub Pages.

## Jak přidat nová data

### Varianta A – přes Git (doporučeno)

1. Přidejte TSV soubor do složky `data/` pojmenovaný datem (`YYYY-MM-DD`, bez přípony)
2. Commit & push na `main`:
   ```bash
   git add data/2026-05-05
   git commit -m "data: 2026-05-05"
   git push
   ```
3. GitHub Actions automaticky přegeneruje dashboard a publikuje na GitHub Pages

### Varianta B – přes GitHub web (bez Gitu)

1. Otevřete repo na GitHubu → složka `data/`
2. Klikněte **Add file → Upload files**
3. Přetáhněte TSV soubor (pojmenovaný datem, např. `2026-05-05`)
4. Klikněte **Commit changes**
5. Dashboard se automaticky aktualizuje

## Formát datového souboru

- **Název souboru:** datum ve formátu `YYYY-MM-DD` (bez přípony), např. `2026-05-05`
- **Kódování:** UTF-8
- **Oddělovač:** tabulátor (TSV)
- **První řádek** musí být hlavička s těmito sloupci:

```
ID konverzace	Shrnutí konverzace	Typ problému	Detail problému	Flagy	Doporučení	Dopad	Akce	Ticket	Iniciátor konverzace
```

Každý další řádek = jedna konverzace.

## Lokální build (volitelné)

Požadavky: [Node.js](https://nodejs.org/) 18+

```bash
npm run build        # vygeneruje dashboard.html
open dashboard.html  # otevře v prohlížeči
```

## Prvotní nastavení GitHub repo

1. Vytvořte nový repozitář na GitHubu (např. `avatar-reporter`)
2. V **Settings → Pages → Source** zvolte **GitHub Actions**
3. Pushněte obsah tohoto adresáře:
   ```bash
   git remote add origin git@github.com:VASE-ORG/avatar-reporter.git
   git push -u origin main
   ```
4. Po prvním úspěšném buildu bude dashboard dostupný na:  
   `https://mkuncar-cen61879.github.io/avatar-reporter/`

## Struktura projektu

```
reporter/
├── .github/workflows/build.yml  ← GitHub Actions (auto-build + deploy)
├── data/                        ← datové soubory (TSV, pojmenované datem)
├── build.js                     ← generátor dashboardu
├── dashboard.html               ← vygenerovaný dashboard
├── package.json
└── readme.md
```
