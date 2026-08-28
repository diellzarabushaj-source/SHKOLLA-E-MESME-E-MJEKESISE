-- Metabase analytics layer for the School progress system.
-- Run this against the same Neon/Postgres database used by the Next.js app.
-- Metabase should connect with a dedicated READ-ONLY database role.

CREATE SCHEMA IF NOT EXISTS analytics;
REVOKE ALL ON SCHEMA analytics FROM PUBLIC;

CREATE OR REPLACE VIEW analytics.progress_cards AS
SELECT
  user_id,
  grade_id,
  subject_id,
  chapter_id,
  lesson_id,
  flashcard_id,
  status,
  last_rating,
  repetitions,
  lapses,
  ease_factor,
  interval_days,
  due_at,
  last_reviewed_at,
  updated_at,
  (due_at <= now()) AS is_due,
  (due_at > now() AND due_at <= now() + interval '24 hours') AS is_due_next_24h,
  (lapses >= 2 OR last_rating IN ('again', 'hard')) AS is_fragile,
  (last_rating IN ('good', 'easy')) AS is_successful
FROM public.card_progress;

CREATE OR REPLACE VIEW analytics.progress_daily AS
WITH daily_reviews AS (
  SELECT
    user_id,
    timezone('Europe/Belgrade', reviewed_at)::date AS activity_date,
    count(*)::bigint AS reviews,
    count(*) FILTER (WHERE rating IN ('good', 'easy'))::bigint AS successful_reviews,
    round(avg(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::bigint AS avg_response_time_ms
  FROM public.review_events
  GROUP BY 1, 2
),
daily_sessions AS (
  SELECT
    user_id,
    timezone('Europe/Belgrade', started_at)::date AS activity_date,
    count(*)::bigint AS sessions,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::bigint AS completed_sessions
  FROM public.study_sessions
  GROUP BY 1, 2
),
daily_activity AS (
  SELECT
    user_id,
    timezone('Europe/Belgrade', started_at)::date AS activity_date,
    sum(active_seconds)::bigint AS active_seconds
  FROM public.activity_sessions
  GROUP BY 1, 2
),
activity_keys AS (
  SELECT user_id, activity_date FROM daily_reviews
  UNION
  SELECT user_id, activity_date FROM daily_sessions
  UNION
  SELECT user_id, activity_date FROM daily_activity
)
SELECT
  keys.user_id,
  keys.activity_date,
  coalesce(reviews.reviews, 0)::bigint AS reviews,
  coalesce(reviews.successful_reviews, 0)::bigint AS successful_reviews,
  CASE
    WHEN coalesce(reviews.reviews, 0) = 0 THEN 0
    ELSE round(100.0 * reviews.successful_reviews / reviews.reviews, 1)
  END AS accuracy_pct,
  reviews.avg_response_time_ms,
  coalesce(sessions.sessions, 0)::bigint AS sessions,
  coalesce(sessions.completed_sessions, 0)::bigint AS completed_sessions,
  coalesce(activity.active_seconds, 0)::bigint AS active_seconds
FROM activity_keys AS keys
LEFT JOIN daily_reviews AS reviews USING (user_id, activity_date)
LEFT JOIN daily_sessions AS sessions USING (user_id, activity_date)
LEFT JOIN daily_activity AS activity USING (user_id, activity_date);

CREATE OR REPLACE VIEW analytics.progress_weekly AS
SELECT
  user_id,
  date_trunc('week', activity_date)::date AS week_start,
  sum(reviews)::bigint AS reviews,
  sum(successful_reviews)::bigint AS successful_reviews,
  CASE
    WHEN sum(reviews) = 0 THEN 0
    ELSE round(100.0 * sum(successful_reviews) / sum(reviews), 1)
  END AS accuracy_pct,
  round(avg(avg_response_time_ms) FILTER (WHERE avg_response_time_ms IS NOT NULL))::bigint AS avg_response_time_ms,
  sum(sessions)::bigint AS sessions,
  sum(completed_sessions)::bigint AS completed_sessions,
  sum(active_seconds)::bigint AS active_seconds,
  count(*) FILTER (
    WHERE reviews > 0 OR sessions > 0 OR active_seconds > 0
  )::bigint AS active_days
FROM analytics.progress_daily
GROUP BY user_id, date_trunc('week', activity_date);

CREATE OR REPLACE VIEW analytics.progress_ratings AS
SELECT
  user_id,
  rating,
  count(*)::bigint AS review_count,
  round(
    100.0 * count(*) / nullif(sum(count(*)) OVER (PARTITION BY user_id), 0),
    1
  ) AS review_pct,
  round(avg(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::bigint AS avg_response_time_ms,
  max(reviewed_at) AS last_reviewed_at
FROM public.review_events
GROUP BY user_id, rating;

CREATE OR REPLACE VIEW analytics.progress_subjects AS
WITH card_stats AS (
  SELECT
    user_id,
    subject_id,
    count(*)::bigint AS tracked_cards,
    count(*) FILTER (WHERE status = 'mastered')::bigint AS mastered_cards,
    count(*) FILTER (WHERE due_at <= now())::bigint AS due_cards,
    count(*) FILTER (
      WHERE due_at > now() AND due_at <= now() + interval '24 hours'
    )::bigint AS due_next_24h,
    count(*) FILTER (
      WHERE lapses >= 2 OR last_rating IN ('again', 'hard')
    )::bigint AS fragile_cards,
    round(avg(lapses), 2) AS avg_lapses
  FROM public.card_progress
  GROUP BY 1, 2
),
review_stats AS (
  SELECT
    user_id,
    subject_id,
    count(*)::bigint AS reviews,
    count(*) FILTER (WHERE rating IN ('good', 'easy'))::bigint AS successful_reviews,
    round(avg(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::bigint AS avg_response_time_ms
  FROM public.review_events
  GROUP BY 1, 2
),
session_stats AS (
  SELECT
    user_id,
    subject_id,
    count(*)::bigint AS sessions,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::bigint AS completed_sessions
  FROM public.study_sessions
  GROUP BY 1, 2
),
activity_stats AS (
  SELECT
    user_id,
    subject_id,
    sum(active_seconds)::bigint AS active_seconds
  FROM public.activity_sessions
  WHERE subject_id IS NOT NULL
  GROUP BY 1, 2
),
subject_keys AS (
  SELECT user_id, subject_id FROM card_stats
  UNION
  SELECT user_id, subject_id FROM review_stats
  UNION
  SELECT user_id, subject_id FROM session_stats
  UNION
  SELECT user_id, subject_id FROM activity_stats
)
SELECT
  keys.user_id,
  keys.subject_id,
  coalesce(cards.tracked_cards, 0)::bigint AS tracked_cards,
  coalesce(cards.mastered_cards, 0)::bigint AS mastered_cards,
  CASE
    WHEN coalesce(cards.tracked_cards, 0) = 0 THEN 0
    ELSE round(100.0 * cards.mastered_cards / cards.tracked_cards, 1)
  END AS mastery_pct,
  coalesce(cards.due_cards, 0)::bigint AS due_cards,
  coalesce(cards.due_next_24h, 0)::bigint AS due_next_24h,
  coalesce(cards.fragile_cards, 0)::bigint AS fragile_cards,
  coalesce(cards.avg_lapses, 0)::numeric AS avg_lapses,
  coalesce(reviews.reviews, 0)::bigint AS reviews,
  coalesce(reviews.successful_reviews, 0)::bigint AS successful_reviews,
  CASE
    WHEN coalesce(reviews.reviews, 0) = 0 THEN 0
    ELSE round(100.0 * reviews.successful_reviews / reviews.reviews, 1)
  END AS accuracy_pct,
  reviews.avg_response_time_ms,
  coalesce(sessions.sessions, 0)::bigint AS sessions,
  coalesce(sessions.completed_sessions, 0)::bigint AS completed_sessions,
  coalesce(activity.active_seconds, 0)::bigint AS active_seconds
FROM subject_keys AS keys
LEFT JOIN card_stats AS cards USING (user_id, subject_id)
LEFT JOIN review_stats AS reviews USING (user_id, subject_id)
LEFT JOIN session_stats AS sessions USING (user_id, subject_id)
LEFT JOIN activity_stats AS activity USING (user_id, subject_id);

CREATE OR REPLACE VIEW analytics.progress_lessons AS
WITH review_stats AS (
  SELECT
    user_id,
    lesson_id,
    count(*)::bigint AS reviews,
    count(*) FILTER (WHERE rating IN ('good', 'easy'))::bigint AS successful_reviews,
    round(avg(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::bigint AS avg_response_time_ms
  FROM public.review_events
  GROUP BY 1, 2
)
SELECT
  lessons.user_id,
  lessons.grade_id,
  lessons.subject_id,
  lessons.chapter_id,
  lessons.lesson_id,
  lessons.first_opened_at,
  lessons.last_opened_at,
  lessons.active_seconds,
  lessons.open_count,
  lessons.max_scroll_percent,
  lessons.completed_at,
  (lessons.completed_at IS NOT NULL) AS is_completed,
  lessons.updated_at,
  coalesce(reviews.reviews, 0)::bigint AS reviews,
  coalesce(reviews.successful_reviews, 0)::bigint AS successful_reviews,
  CASE
    WHEN coalesce(reviews.reviews, 0) = 0 THEN 0
    ELSE round(100.0 * reviews.successful_reviews / reviews.reviews, 1)
  END AS accuracy_pct,
  reviews.avg_response_time_ms
FROM public.lesson_progress AS lessons
LEFT JOIN review_stats AS reviews USING (user_id, lesson_id);

CREATE OR REPLACE VIEW analytics.progress_overview AS
WITH user_keys AS (
  SELECT user_id FROM public.card_progress
  UNION
  SELECT user_id FROM public.review_events
  UNION
  SELECT user_id FROM public.study_sessions
  UNION
  SELECT user_id FROM public.lesson_progress
  UNION
  SELECT user_id FROM public.activity_sessions
),
cards AS (
  SELECT
    user_id,
    count(*)::bigint AS tracked_cards,
    count(*) FILTER (WHERE status = 'mastered')::bigint AS mastered_cards,
    count(*) FILTER (WHERE due_at <= now())::bigint AS due_cards,
    count(*) FILTER (
      WHERE due_at > now() AND due_at <= now() + interval '24 hours'
    )::bigint AS due_next_24h,
    count(*) FILTER (
      WHERE lapses >= 2 OR last_rating IN ('again', 'hard')
    )::bigint AS fragile_cards
  FROM public.card_progress
  GROUP BY user_id
),
reviews AS (
  SELECT
    user_id,
    count(*)::bigint AS reviews,
    count(*) FILTER (WHERE rating IN ('good', 'easy'))::bigint AS successful_reviews,
    round(avg(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::bigint AS avg_response_time_ms,
    max(reviewed_at) AS last_reviewed_at
  FROM public.review_events
  GROUP BY user_id
),
sessions AS (
  SELECT
    user_id,
    count(*)::bigint AS sessions,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::bigint AS completed_sessions,
    max(started_at) AS last_session_at
  FROM public.study_sessions
  GROUP BY user_id
),
lessons AS (
  SELECT
    user_id,
    count(*)::bigint AS opened_lessons,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::bigint AS completed_lessons,
    sum(active_seconds)::bigint AS lesson_active_seconds,
    max(updated_at) AS last_lesson_activity_at
  FROM public.lesson_progress
  GROUP BY user_id
),
activity AS (
  SELECT
    user_id,
    sum(active_seconds)::bigint AS active_seconds,
    count(DISTINCT timezone('Europe/Belgrade', started_at)::date)::bigint AS active_days,
    max(last_seen_at) AS last_activity_at
  FROM public.activity_sessions
  GROUP BY user_id
),
active_dates AS (
  SELECT user_id, timezone('Europe/Belgrade', reviewed_at)::date AS activity_date
  FROM public.review_events
  UNION
  SELECT user_id, timezone('Europe/Belgrade', started_at)::date AS activity_date
  FROM public.study_sessions
  UNION
  SELECT user_id, timezone('Europe/Belgrade', started_at)::date AS activity_date
  FROM public.activity_sessions
  WHERE active_seconds > 0
),
streak_rows AS (
  SELECT
    user_id,
    activity_date,
    activity_date - (row_number() OVER (
      PARTITION BY user_id ORDER BY activity_date
    ))::integer AS streak_group
  FROM active_dates
),
streak_groups AS (
  SELECT
    user_id,
    min(activity_date) AS streak_start,
    max(activity_date) AS streak_end,
    count(*)::bigint AS streak_days
  FROM streak_rows
  GROUP BY user_id, streak_group
),
current_streaks AS (
  SELECT
    user_id,
    coalesce(max(streak_days) FILTER (
      WHERE streak_end >= current_date - 1
        AND streak_end <= current_date
    ), 0)::bigint AS current_streak_days
  FROM streak_groups
  GROUP BY user_id
)
SELECT
  keys.user_id,
  coalesce(cards.tracked_cards, 0)::bigint AS tracked_cards,
  coalesce(cards.mastered_cards, 0)::bigint AS mastered_cards,
  coalesce(cards.due_cards, 0)::bigint AS due_cards,
  coalesce(cards.due_next_24h, 0)::bigint AS due_next_24h,
  coalesce(cards.fragile_cards, 0)::bigint AS fragile_cards,
  CASE
    WHEN coalesce(cards.tracked_cards, 0) = 0 THEN 0
    ELSE round(100.0 * cards.mastered_cards / cards.tracked_cards, 1)
  END AS mastery_pct,
  coalesce(reviews.reviews, 0)::bigint AS reviews,
  coalesce(reviews.successful_reviews, 0)::bigint AS successful_reviews,
  CASE
    WHEN coalesce(reviews.reviews, 0) = 0 THEN 0
    ELSE round(100.0 * reviews.successful_reviews / reviews.reviews, 1)
  END AS accuracy_pct,
  reviews.avg_response_time_ms,
  coalesce(sessions.sessions, 0)::bigint AS sessions,
  coalesce(sessions.completed_sessions, 0)::bigint AS completed_sessions,
  coalesce(lessons.opened_lessons, 0)::bigint AS opened_lessons,
  coalesce(lessons.completed_lessons, 0)::bigint AS completed_lessons,
  coalesce(lessons.lesson_active_seconds, 0)::bigint AS lesson_active_seconds,
  coalesce(activity.active_seconds, 0)::bigint AS active_seconds,
  coalesce(activity.active_days, 0)::bigint AS active_days,
  coalesce(streaks.current_streak_days, 0)::bigint AS current_streak_days,
  greatest(
    reviews.last_reviewed_at,
    sessions.last_session_at,
    lessons.last_lesson_activity_at,
    activity.last_activity_at
  ) AS last_activity_at
FROM user_keys AS keys
LEFT JOIN cards USING (user_id)
LEFT JOIN reviews USING (user_id)
LEFT JOIN sessions USING (user_id)
LEFT JOIN lessons USING (user_id)
LEFT JOIN activity USING (user_id)
LEFT JOIN current_streaks AS streaks USING (user_id);

COMMENT ON SCHEMA analytics IS
  'Read-only analytics layer for Metabase. Restrict guest dashboards with a locked user_id parameter.';
