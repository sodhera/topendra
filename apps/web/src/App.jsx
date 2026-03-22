import React from 'react';
import { buildKathmanduDemoData } from '@topey/shared/data/demoCatalog';
import { KATHMANDU_EXPLORE_REGION } from '@topey/shared/lib/constants';
import { getCommentsForPlace, getVoteBreakdown } from '@topey/shared/lib/geo';
import { colors } from '@topey/shared/lib/theme';

const demoData = buildKathmanduDemoData();
const bounds = {
  maxLatitude: KATHMANDU_EXPLORE_REGION.latitude + KATHMANDU_EXPLORE_REGION.latitudeDelta / 2,
  minLatitude: KATHMANDU_EXPLORE_REGION.latitude - KATHMANDU_EXPLORE_REGION.latitudeDelta / 2,
  minLongitude: KATHMANDU_EXPLORE_REGION.longitude - KATHMANDU_EXPLORE_REGION.longitudeDelta / 2,
  maxLongitude: KATHMANDU_EXPLORE_REGION.longitude + KATHMANDU_EXPLORE_REGION.longitudeDelta / 2,
};

function projectPlace(place) {
  const left =
    ((place.longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude)) * 100;
  const top =
    ((bounds.maxLatitude - place.latitude) / (bounds.maxLatitude - bounds.minLatitude)) * 100;

  return {
    left: `${left.toFixed(2)}%`,
    top: `${top.toFixed(2)}%`,
  };
}

function openLocationHref(place) {
  return `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
}

export default function App() {
  const [selectedPlaceId, setSelectedPlaceId] = React.useState(demoData.places[0]?.id ?? '');
  const selectedPlace =
    demoData.places.find((place) => place.id === selectedPlaceId) ?? demoData.places[0] ?? null;
  const comments = React.useMemo(
    () => getCommentsForPlace(demoData.comments, selectedPlace?.id),
    [selectedPlace]
  );
  const voteBreakdown = React.useMemo(
    () => getVoteBreakdown(demoData.votes, selectedPlace?.id),
    [selectedPlace]
  );

  return (
    <div
      className="app-shell"
      style={{
        '--color-background': colors.background,
        '--color-card': colors.card,
        '--color-elevated': colors.elevatedCard,
        '--color-border': colors.border,
        '--color-separator': colors.separator,
        '--color-text': colors.text,
        '--color-muted': colors.mutedText,
        '--color-primary': colors.primary,
        '--color-primary-text': colors.primaryText,
        '--color-accent': colors.accent,
      }}
    >
      <header className="topbar">
        <div>
          <div className="eyebrow">TOPEY WEB</div>
          <h1>Kathmandu place map</h1>
          <p>
            The monorepo now includes a dedicated browser app. Web focuses on browsing the live
            place field and inspecting details.
          </p>
        </div>
        <a className="topbar-link" href={selectedPlace ? openLocationHref(selectedPlace) : '#'} target="_blank" rel="noreferrer">
          Open selected place
        </a>
      </header>

      <main className="layout">
        <section className="map-panel">
          <div className="map-chrome">
            <span>Kathmandu</span>
            <span>{demoData.places.length} live drops</span>
          </div>
          <div className="map-surface" role="application" aria-label="Kathmandu place map">
            <div className="map-grid" />
            {demoData.places.map((place) => {
              const position = projectPlace(place);
              const isSelected = selectedPlace?.id === place.id;

              return (
                <button
                  key={place.id}
                  className={`place-dot${isSelected ? ' is-selected' : ''}`}
                  style={position}
                  type="button"
                  onClick={() => setSelectedPlaceId(place.id)}
                  aria-label={`Open ${place.name}`}
                />
              );
            })}
          </div>
        </section>

        <aside className="details-panel">
          {selectedPlace ? (
            <>
              <div className="panel-header">
                <div className="eyebrow">PLACE DETAILS</div>
                <h2>{selectedPlace.name}</h2>
                <p>{selectedPlace.description}</p>
              </div>

              <div className="meta-row">
                <span>
                  <strong>Rating</strong>
                  <em>{voteBreakdown.score >= 0 ? `+${voteBreakdown.score}` : voteBreakdown.score}</em>
                </span>
                <span>
                  <strong>Votes</strong>
                  <em>{voteBreakdown.ratioLabel}</em>
                </span>
                <span>
                  <strong>Threads</strong>
                  <em>{selectedPlace.threadCount ?? comments.length}</em>
                </span>
              </div>

              <div className="participation-row">
                <div className="vote-pill" aria-label="vote summary">
                  <span>↑</span>
                  <b>{voteBreakdown.score >= 0 ? `+${voteBreakdown.score}` : voteBreakdown.score}</b>
                  <span>↓</span>
                </div>
                <div className="added-by">
                  Added by: <span>{selectedPlace.authorName || 'Anonymous member'}</span>
                </div>
              </div>

              <div className="cta-row">
                <a
                  className="primary-link"
                  href={openLocationHref(selectedPlace)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open location
                </a>
                <span className="secondary-note">Use mobile to add places, comment, and vote live.</span>
              </div>

              <div className="thread-card">
                <div className="thread-header">
                  <div className="eyebrow">THREAD PREVIEW</div>
                  <span className="thread-note">Web is browse-first today</span>
                </div>
                {comments.slice(0, 3).map((comment) => (
                  <article key={comment.id} className="comment-row">
                    <strong>{comment.authorName}</strong>
                    <p>{comment.body}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
