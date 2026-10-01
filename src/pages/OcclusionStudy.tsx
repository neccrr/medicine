import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { flashcardSubjects, keyOf, loadOcclusionNotes, subjectKey } from "../lib/content";
import { useSpacedRepetition } from "../hooks/useSpacedRepetition";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../lib/storage";
import { GRADES } from "../lib/grades";
import { REGION_LABELS, occlusionCards, zoomBox, type OcclusionCard } from "../lib/occlusion";
import { EmptyState } from "../components/EmptyState";
import { PulseLine } from "../components/PulseLine";
import { subjectHueStyle } from "../lib/subjectStyle";
import type { OcclusionNote } from "../types/content";

const EMPTY: OcclusionCard[] = [];

const narrowScreen = () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 720px)").matches;

/** The figure with its labels covered; the card's own label is the highlighted one. */
function OcclusionFigure({ card, revealed, hideAll, zoom, onToggle }: { card: OcclusionCard; revealed: boolean; hideAll: boolean; zoom: boolean; onToggle: () => void }) {
  const { note, mask } = card;
  const vb = zoom ? zoomBox(note, mask) : { x: 0, y: 0, w: note.width, h: note.height };
  const pad = Math.max(2, note.width / 400);
  return (
    <div
      className="io-figure-wrap"
      role="button"
      tabIndex={0}
      aria-label={revealed ? "Label revealed. Grade yourself below." : "Recall the highlighted label, then click to reveal it"}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <svg className="io-figure" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img" aria-label={note.title}>
        <rect x={0} y={0} width={note.width} height={note.height} className="io-paper" />
        <image href={note.image} x={0} y={0} width={note.width} height={note.height} />
        {note.masks.map((m) => {
          const target = m.id === mask.id;
          if (target && revealed) {
            return <rect key={m.id} x={m.x - pad * 2} y={m.y - pad * 2} width={m.w + pad * 4} height={m.h + pad * 4} rx={pad * 2} className="io-mask-revealed" style={{ strokeWidth: pad * 1.5 }} />;
          }
          if (!target && !hideAll) return null;
          return <rect key={m.id} x={m.x - pad} y={m.y - pad} width={m.w + pad * 2} height={m.h + pad * 2} rx={pad * 1.5} className={target ? "io-mask-target" : "io-mask"} style={{ strokeWidth: pad }} />;
        })}
        {!revealed && (
          <text x={mask.x + mask.w / 2} y={mask.y + mask.h / 2} className="io-mask-q" style={{ fontSize: Math.min(mask.h * 0.9, 40) }} textAnchor="middle" dominantBaseline="central">
            ?
          </text>
        )}
      </svg>
    </div>
  );
}

export function OcclusionStudy() {
  const { blockId = "", subjectId = "" } = useParams();
  const key = subjectKey(blockId, subjectId);
  const deckKey = `${key}/occlusion`;
  const subjectLabel = flashcardSubjects.find((s) => keyOf(s) === key)?.label ?? subjectId;

  const [notes, setNotes] = useState<OcclusionNote[] | null | undefined>(null);
  useEffect(() => {
    let live = true;
    loadOcclusionNotes(key).then((n) => live && setNotes(n));
    return () => {
      live = false;
    };
  }, [key]);

  const deck = useMemo(() => (notes ? occlusionCards(notes) : EMPTY), [notes]);
  const [regions, setRegions] = useLocalStorage<string[]>(STORAGE_KEYS.tagFilter(deckKey), []);
  const filtered = useMemo(() => (regions.length === 0 ? deck : deck.filter((c) => regions.includes(c.note.region))), [deck, regions]);
  const allRegions = useMemo(() => Array.from(new Set(deck.map((c) => c.note.region))), [deck]);
  const { dueCards, grade, stats } = useSpacedRepetition(deckKey, filtered);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [extraReview, setExtraReview] = useState(false);
  const [session, setSession] = useState({ reviewed: 0, lapses: 0 });
  const [hideAll, setHideAll] = useState(true);
  const [zoom, setZoom] = useState(narrowScreen);

  const queue = (dueCards.length > 0 ? dueCards : filtered) as OcclusionCard[];
  const card = queue.length > 0 ? queue[index % queue.length] : undefined;
  const nextCard = queue.length > 1 ? queue[(index + 1) % queue.length] : undefined;
  const sessionDone = dueCards.length === 0 && !extraReview;

  // Fetch the next figure while this card is being answered.
  useEffect(() => {
    if (nextCard && nextCard.note.image !== card?.note.image) new Image().src = nextCard.note.image;
  }, [nextCard, card?.note.image]);

  const restart = () => {
    setIndex(0);
    setRevealed(false);
    setExtraReview(false);
    setSession({ reviewed: 0, lapses: 0 });
  };

  const toggleRegion = (r: string) => {
    setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    restart();
  };

  const handleGrade = (quality: number) => {
    if (!card) return;
    grade(card.id, quality);
    setSession((s) => ({ reviewed: s.reviewed + 1, lapses: s.lapses + (quality < 3 ? 1 : 0) }));
    setRevealed(false);
    // A graded card leaves the due list, so the same index is already the next card; while
    // reviewing beyond what's due, step forward instead.
    if (dueCards.length === 0) setIndex((i) => i + 1);
  };

  useEffect(() => {
    if (sessionDone || !card) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)) return;
      if (!revealed && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) {
          e.preventDefault();
          handleGrade(g.quality);
        }
      }
      if (e.key === "z") setZoom((z) => !z);
      if (e.key === "h") setHideAll((h) => !h);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, sessionDone, card?.id, dueCards.length]);

  if (notes === undefined) {
    return (
      <section className="page">
        <p>This subject has no image-occlusion cards.</p>
        <Link to={`/flashcards/${blockId}/${subjectId}`}>Back to the flashcards</Link>
      </section>
    );
  }

  const figureCount = new Set(filtered.map((c) => c.note.id)).size;

  return (
    <section className="page subject-tinted io-page" style={subjectHueStyle(subjectId) as CSSProperties}>
      <Link to={`/flashcards/${blockId}/${subjectId}`} className="back-link">
        ← {subjectLabel} flashcards
      </Link>
      <h1>{subjectLabel}: image occlusion</h1>
      <p className="subtitle">
        {notes === null
          ? "Loading figures…"
          : `${stats.due} due · ${stats.mastered}/${stats.total} mastered · ${figureCount} figure${figureCount === 1 ? "" : "s"}`}
      </p>
      <p className="io-intro">
        Anki-style image occlusion: the atlas figures from the practicum decks with their labels covered. Name the label under the
        red <b>?</b>, reveal it, then grade yourself; each label comes back on its own spaced-repetition schedule.
      </p>

      {allRegions.length > 1 && (
        <div className="tag-filter-row">
          {allRegions.map((r) => (
            <button key={r} type="button" className={regions.includes(r) ? "tag tag-toggle active" : "tag tag-toggle"} onClick={() => toggleRegion(r)} aria-pressed={regions.includes(r)}>
              {REGION_LABELS[r] ?? r}
            </button>
          ))}
          {regions.length > 0 && (
            <button
              type="button"
              className="tag-filter-clear"
              onClick={() => {
                setRegions([]);
                restart();
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {notes === null ? (
        <div className="route-loading" role="status" aria-label="Loading figures">
          <PulseLine />
        </div>
      ) : !card ? (
        <EmptyState title="No figures in this selection" />
      ) : sessionDone ? (
        <div className="flashcard-empty">
          {session.reviewed > 0 ? (
            <div className="session-summary">
              <h2>Session complete</h2>
              <div className="session-stats">
                <div>
                  <strong>{session.reviewed}</strong>
                  <span>reviewed</span>
                </div>
                <div>
                  <strong>{session.reviewed - session.lapses}</strong>
                  <span>recalled</span>
                </div>
                <div>
                  <strong>{session.lapses}</strong>
                  <span>missed</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Nothing due right now">You're all caught up on these figures; come back later, or review anyway.</EmptyState>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIndex(0);
              setExtraReview(true);
              setSession({ reviewed: 0, lapses: 0 });
            }}
          >
            Review anyway
          </button>
        </div>
      ) : (
        <div className="io-session">
          <div className="io-toolbar">
            <span className="io-figure-title">{card.note.title}</span>
            <div className="io-toggles">
              <button type="button" className={`io-toggle${hideAll ? " is-on" : ""}`} onClick={() => setHideAll((h) => !h)} aria-pressed={hideAll} title="Hide every label, or only the one being asked (H)">
                {hideAll ? "Hide all" : "Hide one"}
              </button>
              <button type="button" className={`io-toggle${zoom ? " is-on" : ""}`} onClick={() => setZoom((z) => !z)} aria-pressed={zoom} title="Zoom in on the label (Z)">
                Zoom
              </button>
            </div>
          </div>

          <OcclusionFigure card={card} revealed={revealed} hideAll={hideAll} zoom={zoom} onToggle={() => setRevealed((r) => !r)} />

          {revealed && <p className="io-answer">{card.mask.label}</p>}
          <p className="io-hint">
            {revealed ? (
              <>
                How well did you recall it? <Link to={card.note.chapter}>Read about this figure</Link>
              </>
            ) : (
              "Name the label under the red ?, then tap the figure or press Space to reveal it."
            )}
          </p>

          {revealed ? (
            <div className="grade-row">
              {GRADES.map((g) => (
                <button key={g.quality} type="button" className="btn btn-grade" onClick={() => handleGrade(g.quality)} title={`${g.hint} (press ${g.key})`}>
                  {g.label}
                  <span className="key-hint">{g.key}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grade-row">
              <button type="button" className="btn" onClick={() => setRevealed(true)}>
                Reveal label <span className="key-hint">Space</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
