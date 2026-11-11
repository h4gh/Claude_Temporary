# Záznam vad vozu – prototyp

Jednostránková webová aplikace (funguje na mobilu i tabletu) pro zápis vad při kontrole vozu.

- Záložky: Exteriér, Interiér, Motorový prostor, Dynamika
- Zjednodušený 3D model SUV ve stylu nového Tucsonu (Three.js) s pojmenovanými díly
- Dlouhý stisk (~0,5 s) na modelu → formulář vady (10 typů, závažnost A/B/C, poznámka, foto)
- Export do Excelu (ExcelJS): list „Vady“ se zákresem místa a fotkou, list „Souhrn“
- Data se ukládají jen v prohlížeči (localStorage)

Spuštění: otevřít `index.html` v prohlížeči (potřebuje internet kvůli knihovnám z CDN).
