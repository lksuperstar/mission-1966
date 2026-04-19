MISSION 1966 – Dateistruktur

1. index.html
   Die eigentliche Website.

2. fragments.json
   Hier pflegst du alle Erinnerungsfragmente.
   Beispiel:
   "12": {
     "answer": "Paris",
     "alternatives": ["paris", "Pariis"]
   }

Wichtig:
- Jede Nummer darf nur einmal vorkommen.
- answer = Hauptlösung
- alternatives = weitere erlaubte Schreibweisen
- Noch nicht fertige Nummern kannst du einfach weglassen.

Zugangscode ändern:
- Öffne index.html in einem Texteditor
- Suche nach: accessCode: "NORBERT1966"
- Ersetze den Code durch deinen eigenen

Maximale Fragmentzahl ändern:
- Öffne index.html
- Suche nach: totalFragments: 112
- Passe den Wert an
