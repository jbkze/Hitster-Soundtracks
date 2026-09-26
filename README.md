# Hitster Soundtracks Trainer

Lern-App für die **Hitster „Movies & TV Soundtracks“**-Edition (deutsche Ausgabe, 154 Karten).

1. **▶** – der Song läuft über **Spotify**
2. **Aufdecken** – Film/Serie, Jahr (wie auf der Karte), Interpret, Komponist und Titel
3. **Nächste Karte** / **⏭** – weiter zur nächsten zufällig gemischten Karte

Extras: ♥ markiert schwierige Karten (kommen ein paar Karten später noch mal), Filter Filme/Serien,
Neu mischen, zurück zur vorherigen Karte, durchsuchbare Liste aller Karten, Fortschritt bleibt im Browser gespeichert.
Tastatur: `Leertaste` Play/Pause, `Enter` Aufdecken/Weiter, `←`/`→` Karte zurück/vor.

**Spotify:** Wer im selben Browser bei Spotify eingeloggt ist (Premium), hört die ganzen Songs,
sonst spielt Spotify 30-Sekunden-Vorschauen. Falls der Browser den Start blockiert (v. a. iOS),
erscheint ein Spotify-Player mit verdecktem Titel zum direkten Antippen.

## Auf GitHub Pages veröffentlichen

Repository → **Settings → Pages** → *Build and deployment* → Source: **Deploy from a branch**,
Branch auswählen, Ordner **/ (root)** → Save. Nach ~1 Minute läuft die App unter
`https://<user>.github.io/<repo>/`.

## Daten

- `tools/cards.csv` – offizielle Kartendaten (Titel, Interpret, Jahr, ISRC, YouTube) aus
  [songseeker-hitster-playlists](https://github.com/andygruber/songseeker-hitster-playlists) (MIT)
- `tools/films.txt` – pro Karte: `Film (DE) | Originaltitel | Jahr | F/S | Komponist`
- `tools/spotify.json` – Spotify-Track pro Karte (Karten 1–100 aus der Playlist der Edition, Rest per Suche)

Nach Änderungen `python3 tools/build_songs.py` ausführen – das erzeugt `songs.js`.
