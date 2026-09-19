# MyWeddingDay — Database Schema

Entity-relationship diagram for the current (implemented) schema. Renders natively on GitHub.

```mermaid
erDiagram
    USERS ||--o{ VENUES : owns
    USERS ||--o{ BANDS : owns
    VENUES ||--o{ MEALPLANS : offers
    USERS ||--o{ REVIEWS : writes
    VENUES ||--o{ REVIEWS : receives
    BANDS ||--o{ REVIEWS : receives
    USERS ||--o{ PAYMENTS : makes
    VENUES ||--o{ PAYMENTS : "featured by"
    BANDS ||--o{ PAYMENTS : "featured by"

    USERS {
        serial id PK
        varchar email UK
        varchar password_hash "nullable — Google-only accounts have none"
        varchar full_name
        varchar role "owner | visitor | band"
        varchar google_id UK "nullable"
        timestamp created_at
    }

    VENUES {
        serial id PK
        int owner_id FK
        varchar name
        varchar type "wedding | prewedding"
        text description
        varchar address
        varchar city
        double latitude
        double longitude
        int capacity
        decimal base_price
        varchar phone
        varchar website
        varchar image_url
        bool is_active
        varchar plan
        timestamp featured_until
        timestamp created_at
    }

    MEALPLANS {
        serial id PK
        int venue_id FK
        varchar name
        text description
        decimal price_per_person
        bool includes_drinks
        timestamp created_at
    }

    BANDS {
        serial id PK
        int owner_id FK
        varchar name
        varchar genre
        text description
        varchar city
        decimal price_per_event
        varchar phone
        varchar website
        varchar image_url
        bool is_active
        varchar plan
        timestamp featured_until
        timestamp created_at
    }

    REVIEWS {
        serial id PK
        int user_id FK
        int venue_id FK "nullable — exactly one of venue_id/band_id set"
        int band_id FK "nullable — exactly one of venue_id/band_id set"
        int rating "1-5"
        text comment
        timestamp created_at
        timestamp updated_at "nullable — set on edit"
    }

    PAYMENTS {
        serial id PK
        int user_id FK
        int venue_id FK "nullable — exactly one of venue_id/band_id set"
        int band_id FK "nullable — exactly one of venue_id/band_id set"
        varchar stripe_session_id
        varchar stripe_payment_intent_id "set once completed"
        decimal amount
        varchar currency
        varchar status "pending | completed | failed | refunded"
        timestamp created_at
        timestamp completed_at "nullable"
    }
```

## Notes

- **Venues** and **Bands** are separate tables (not a shared "listings" table) — see `CLAUDE.md`
  for why. Each has its own `owner_id → Users.id`.
- `MealPlans` belongs only to `Venues`; `Bands` have no meal plans.
- `image_url` is a single column on `Venues`/`Bands` today (not a separate gallery table).
- `plan` / `featured_until` drive the paid "feature this listing" boost — a flat one-time Stripe
  payment sets `plan='featured'` and pushes `featured_until` ~100 years out (no real expiry, per
  the flat-fee pricing decision). Listing creation itself is still free/unpublished-gate-free —
  this is a post-publish upsell only, not full pay-to-publish.
- Users can sign up/log in with email+password, Google Sign-In, or both — `google_id` links a
  row to a Google account once used, and `password_hash` is nullable to allow Google-only
  accounts that never set a password.
- `Reviews` ties a rating (1-5) + comment to a logged-in `user_id` — unlike the anonymous,
  moderated version originally sketched in `er-diagram.html`, this one is tied to a real account
  and shows immediately (no moderation queue). One review per user per venue/band, enforced by
  partial unique indexes on `(user_id, venue_id)` and `(user_id, band_id)`; submitting again
  updates the existing row instead of creating a second one. A listing's own owner can't review it.
- `Payments` is real now (built for the feature-listing boost above) — same exclusive
  `venue_id`/`band_id` FK pattern as `Reviews`. `Images` is still excluded — that one's still
  just a proposal in `er-diagram.html`, not in the running schema.
