# Hitster Soundtracks Trainer

Kleine Lern-App für die **Hitster Soundtracks**-Edition (deutsche Ausgabe, 154 Karten).

1. Lied anhören (30-Sekunden-Hörprobe über die iTunes-API)
2. **Aufdecken** → Film/Serie, Jahr, Komponist, Interpret und Titel werden angezeigt
3. **Weiter**/**Überspringen** → nächste zufällige Karte

Extras: Filter Filme/Serien, „Später nochmal“ (Karte kommt ein paar Karten später wieder),
Autoplay, durchsuchbare Liste aller Karten, Fortschritt wird im Browser gespeichert.
Tastatur: `Leertaste` Play/Pause, `Enter` Aufdecken/Weiter, `→` Überspringen.

## Auf GitHub Pages veröffentlichen

Repository → **Settings → Pages** → *Build and deployment* → Source: **Deploy from a branch**,
Branch auswählen (z. B. `main`), Ordner **/ (root)** → Save.
Nach ~1 Minute ist die App unter `https://<user>.github.io/<repo>/` erreichbar.

## Daten aktualisieren

- `tools/cards.json` – Kartenliste (Interpret, Titel, Jahr der Aufnahme), Quelle: hitify.app
- `tools/films.txt` – pro Karte (gleiche Reihenfolge): `Film (DE) | Originaltitel | Jahr | F/S | Komponist`
- `tools/previews.json` – zugeordnete iTunes-Tracks (Hörprobe, Cover)

Nach Änderungen `python3 tools/build_songs.py` ausführen – das erzeugt `songs.js`.
