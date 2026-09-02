# Pulse — Ritual Studio

## What it does

Pulse is the first responsive web adaptation of an Expo Go mobile app concept. It turns small daily practices into a calm dashboard that works on desktop and touch-sized screens.

## Data model

`Ritual`: string `id`, `title`, `category` (`morning`, `deep-work`, `health`, `craft`), `duration_minutes`, `frequency`, `priority`, `energy`, `emoji`, `completed`, and `streak`.

## Key flows

- Open the dashboard and see seeded demo rituals plus daily summary cards.
- Filter or search rituals, then tap a ritual check to toggle completion.
- Use “New ritual” to create and persist a ritual through `POST /api/rituals`.
- Use the focus timer, theme toggle, and Expo mobile simulator preview.

## API

- `GET /api/rituals` lazily seeds four demo rituals when the collection is empty.
- `POST /api/rituals` creates a ritual.
- `PATCH /api/rituals/{id}/toggle` toggles completion and updates the streak.
- `DELETE /api/rituals/{id}` deletes a ritual.

## Auth

No authentication is required in this demo adaptation.

## Intentional limits

The focus “soundscapes” are visual selection controls only; real audio playback is not connected yet. The timer runs in the browser and does not persist sessions.