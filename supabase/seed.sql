delete from public.place_comments
where author_name in ('Topey team', 'Topey demo');

delete from public.place_votes
where place_id in (
  select id
  from public.places
  where author_name in ('Topey team', 'Topey demo')
);

delete from public.places
where author_name in ('Topey team', 'Topey demo');

with catalog as (
  select
    array[
      'Thamel',
      'Lazimpat',
      'Baluwatar',
      'Baneshwor',
      'Kupondole',
      'Boudha',
      'Pulchowk',
      'Naxal',
      'Kalimati',
      'Swayambhu'
    ]::text[] as neighborhoods,
    array[
      'Courtyard',
      'Cafe Corner',
      'Roof Deck',
      'Patio',
      'Tea Stop',
      'Lookout',
      'Garden Bench',
      'Alley Seat',
      'Window Bar',
      'Arcade'
    ]::text[] as place_types,
    array[
      'Easy to drop into between meetings without losing momentum.',
      'Busy enough to feel alive, calm enough to keep a thread going.',
      'Good stop when you want a quick place check-in without a long sit-down.',
      'Reliable pick when the main road feels too loud but you still want foot traffic nearby.',
      'Works well for short hangs, quick updates, and late-night regrouping.',
      'Quietest once the first dinner rush clears and the scooters thin out.',
      'A dependable fallback spot when the obvious places get packed.',
      'Usually has just enough room to pause, message people, and keep moving.'
    ]::text[] as descriptions,
    array['Aarav', 'Sita', 'Milan', 'Riya', 'Kabir', 'Nima', 'Anisha', 'Pratik']::text[] as commenters,
    array['Best part is', 'Works well when', 'Heads up:', 'Worth knowing:', 'Good sign is', 'The move here is']::text[] as openers,
    array[
      'the back side stays quieter than the street edge.',
      'you need a quick place to regroup without committing to a full meal.',
      'the first row fills up fast, so use the side seating instead.',
      'service is faster before the late dinner crowd arrives.',
      'the breeze picks up after sunset and the space opens up.',
      'it stays practical for short chats and comment check-ins.',
      'Wi-Fi is stable enough for uploads and quick replies.',
      'lighting is better near the inner wall than the outer edge.'
    ]::text[] as comment_details
),
generated_places as (
  select
    index,
    ('00000000-0000-4000-8000-' || lpad((1000 + index)::text, 12, '0'))::uuid as id,
    (
      catalog.neighborhoods[1 + mod(index - 1, array_length(catalog.neighborhoods, 1))]
      || ' '
      || catalog.place_types[1 + mod(index - 1, array_length(catalog.place_types, 1))]
    ) as name,
    catalog.descriptions[1 + mod(index - 1, array_length(catalog.descriptions, 1))] as description,
    round((27.7172 + sin(index * 1.37) * 0.031 + cos(index * 0.71) * 0.009)::numeric, 6)::double precision as latitude,
    round((85.3240 + cos(index * 1.13) * 0.037 + sin(index * 0.53) * 0.011)::numeric, 6)::double precision as longitude,
    timezone('utc', now()) - make_interval(mins => 90 + index * 11) as created_at
  from generate_series(1, 50) as index
  cross join catalog
)
insert into public.places (id, name, description, latitude, longitude, author_name, created_at)
select
  id,
  name,
  description,
  latitude,
  longitude,
  'Topey demo',
  created_at
from generated_places;

with generated_places as (
  select
    index,
    ('00000000-0000-4000-8000-' || lpad((1000 + index)::text, 12, '0'))::uuid as place_id
  from generate_series(1, 50) as index
),
positive_votes as (
  select
    place_id,
    index,
    vote_index,
    ('00000000-0000-4000-8000-' || lpad((200000 + index * 10 + vote_index)::text, 12, '0'))::uuid as id,
    timezone('utc', now()) - make_interval(mins => 45 + index * 9 + vote_index) as created_at
  from generated_places
  cross join lateral generate_series(1, 3 + mod(index * 7, 5)) as vote_index
),
negative_votes as (
  select
    place_id,
    index,
    vote_index,
    ('00000000-0000-4000-8000-' || lpad((250000 + index * 10 + vote_index)::text, 12, '0'))::uuid as id,
    timezone('utc', now()) - make_interval(mins => 35 + index * 7 + vote_index) as created_at
  from generated_places
  cross join lateral generate_series(1, mod(index * 3, 3)) as vote_index
)
insert into public.place_votes (id, place_id, user_id, value, created_at)
select id, place_id, null::uuid, 1, created_at from positive_votes
union all
select id, place_id, null::uuid, -1, created_at from negative_votes;

with catalog as (
  select
    array['Aarav', 'Sita', 'Milan', 'Riya', 'Kabir', 'Nima', 'Anisha', 'Pratik']::text[] as commenters,
    array['Best part is', 'Works well when', 'Heads up:', 'Worth knowing:', 'Good sign is', 'The move here is']::text[] as openers,
    array[
      'the back side stays quieter than the street edge.',
      'you need a quick place to regroup without committing to a full meal.',
      'the first row fills up fast, so use the side seating instead.',
      'service is faster before the late dinner crowd arrives.',
      'the breeze picks up after sunset and the space opens up.',
      'it stays practical for short chats and comment check-ins.',
      'Wi-Fi is stable enough for uploads and quick replies.',
      'lighting is better near the inner wall than the outer edge.'
    ]::text[] as comment_details
),
generated_places as (
  select
    index,
    ('00000000-0000-4000-8000-' || lpad((1000 + index)::text, 12, '0'))::uuid as place_id
  from generate_series(1, 50) as index
),
generated_comments as (
  select
    place_id,
    index,
    comment_index,
    ('00000000-0000-4000-8000-' || lpad((300000 + index * 10 + comment_index)::text, 12, '0'))::uuid as id,
    case
      when mod(comment_index, 2) = 0
        then ('00000000-0000-4000-8000-' || lpad((300000 + index * 10 + comment_index - 1)::text, 12, '0'))::uuid
      else null::uuid
    end as parent_comment_id,
    catalog.commenters[1 + mod(index + comment_index - 2, array_length(catalog.commenters, 1))] as author_name,
    (
      catalog.openers[1 + mod(index + comment_index - 2, array_length(catalog.openers, 1))]
      || ' '
      || catalog.comment_details[1 + mod(index * 2 + comment_index - 2, array_length(catalog.comment_details, 1))]
    ) as body,
    timezone('utc', now()) - make_interval(mins => 20 + index * 8 + comment_index * 3) as created_at
  from generated_places
  cross join catalog
  cross join lateral generate_series(1, 3 + mod(index, 2)) as comment_index
)
insert into public.place_comments (id, place_id, parent_comment_id, user_id, author_name, body, created_at)
select id, place_id, parent_comment_id, null::uuid, author_name, body, created_at
from generated_comments;
