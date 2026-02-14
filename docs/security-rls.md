# Supabase Security And RLS Notes

This project uses a client-side `anon` key. That is normal for Supabase frontend apps, but it requires strict RLS policies.

## Required Checklist

- Enable RLS on all public tables:
    - `decks`
    - `deck_images`
    - `players`
    - `stores`
    - `tournament`
    - `tournament_results`
- Create explicit `SELECT/INSERT/UPDATE/DELETE` policies per table.
- Deny by default when a policy is missing.
- Restrict write operations to authenticated roles when possible.

## Recommended Next Step

Move sensitive writes behind Supabase Edge Functions if business rules become more complex.

## Auditing

- Review auth logs periodically.
- Review policy changes via migration history.
