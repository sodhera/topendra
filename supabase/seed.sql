insert into public.places (id, name, description, latitude, longitude, author_name, created_at)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'Boudha Rooftop',
    'Open terrace with a clear skyline and enough distance from the street noise to stay relaxed.',
    27.7208,
    85.3621,
    'Topey team',
    timezone('utc', now()) - interval '7 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'Thamel Courtyard Stop',
    'A tucked courtyard behind a cafe row that feels calmer after the evening rush.',
    27.7165,
    85.3117,
    'Topey team',
    timezone('utc', now()) - interval '6 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'Jhamsikhel Balcony',
    'Quiet upper-floor balcony with enough air and enough cover for a short stop.',
    27.6797,
    85.3169,
    'Topey team',
    timezone('utc', now()) - interval '5 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    'Baneshwor Patio',
    'Side patio that stays usable once dinner crowds thin out and scooters stop piling up.',
    27.6918,
    85.3424,
    'Topey team',
    timezone('utc', now()) - interval '4 hours'
  )
on conflict (id) do nothing;

insert into public.place_votes (id, place_id, user_id, value, created_at)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', null, 1, timezone('utc', now()) - interval '3 hours'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', null, 1, timezone('utc', now()) - interval '2 hours 45 minutes'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', null, 1, timezone('utc', now()) - interval '2 hours 30 minutes'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000103', null, -1, timezone('utc', now()) - interval '2 hours 15 minutes'),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000104', null, 1, timezone('utc', now()) - interval '2 hours')
on conflict (id) do nothing;

insert into public.place_comments (id, place_id, user_id, author_name, body, created_at)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101',
    null,
    'Topey team',
    'Best after sunset. The far side gets more breeze.',
    timezone('utc', now()) - interval '90 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000102',
    null,
    'Topey team',
    'Gets crowded early. Better later in the evening.',
    timezone('utc', now()) - interval '60 minutes'
  )
on conflict (id) do nothing;
