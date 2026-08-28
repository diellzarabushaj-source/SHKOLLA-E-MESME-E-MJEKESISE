# Metabase Dashboard Blueprint — Progresi im

Ky layout është projektuar për një nxënës: përgjigjet “sa po përparoj?”, “ku po ngec?” dhe “çfarë duhet të bëj sot?” pa e mbushur ekranin me metrika të panevojshme.

## Grid

Desktop: 12 columns. Tablet: 6. Mobile: 1 column.

### Row 1 — Core KPIs

| Card | Source | Field | Visualization | Width |
|---|---|---|---|---:|
| Saktësia | progress_overview | accuracy_pct | Number + % | 2 |
| Mastery | progress_overview | mastery_pct | Progress / Number | 2 |
| Streak | progress_overview | current_streak_days | Number + “ditë” | 2 |
| Për përsëritje | progress_overview | due_cards | Number | 2 |
| Fragile | progress_overview | fragile_cards | Number | 2 |
| Koha aktive | progress_overview | active_seconds | Number formatted duration | 2 |

### Row 2 — Learning velocity

**Left 8 columns — Ritmi 30 ditor**

Source: `progress_daily`

- X: `activity_date`
- Bars: `reviews`
- Line: `accuracy_pct`
- Optional tooltip: `active_seconds`, `completed_sessions`
- Sort ascending by date
- Default window: last 30 days

**Right 4 columns — Java vs javë**

Source: `progress_weekly`

- X: `week_start`
- Bars: `reviews`
- Secondary metric: `active_seconds`
- Tooltip: `accuracy_pct`, `active_days`
- Default: last 8 weeks

### Row 3 — Memory quality

**Left 4 columns — Përgjigjet**

Source: `progress_ratings`

- Dimension: `rating`
- Metric: `review_count`
- Visualization: donut
- Order: again, hard, good, easy
- Tooltip: `review_pct`, `avg_response_time_ms`

**Right 8 columns — Performanca sipas lëndës**

Source: `progress_subjects`

Columns:
- subject_id
- accuracy_pct
- mastery_pct
- due_cards
- due_next_24h
- fragile_cards
- active_seconds
- completed_sessions

Sort priority:
1. due_cards DESC
2. accuracy_pct ASC

Conditional formatting:
- due_cards > 0 → attention
- accuracy_pct < 70 → attention
- mastery_pct >= 80 → strong

### Row 4 — Çfarë duhet bërë sot

**Left 6 columns — Due / fragile cards**

Source: `progress_cards`

Filter:
- `is_due = true OR is_fragile = true`

Columns:
- lesson_id
- status
- last_rating
- lapses
- interval_days
- due_at

Sort:
1. is_due DESC
2. lapses DESC
3. due_at ASC

**Right 6 columns — Mësimet**

Source: `progress_lessons`

Columns:
- lesson_id
- is_completed
- max_scroll_percent
- active_seconds
- reviews
- accuracy_pct
- avg_response_time_ms
- updated_at

Sort:
1. is_completed ASC
2. updated_at DESC

## Mandatory security filter

Dashboard filter slug: `user_id`

Bind it to the `user_id` field in every card above.

For Guest embedding:
- Locked: YES
- Editable: NO
- Hidden from the student: YES
- Value source: signed JWT from `/api/metabase-guest-token`

No card is allowed on this dashboard unless it is bound to `user_id`.

## UX rules

- Keep the dashboard view-only.
- Hide downloads for private student analytics where supported.
- No global cohort comparisons in the student dashboard.
- Show dates in Europe/Belgrade.
- Keep the native Next.js dashboard above Metabase as the fast fallback.
- Metabase is for deeper trends, not duplicate decorative cards.
