'use client';

import { useEffect, useId, useRef } from 'react';
import type { GameSuggestion } from '@/lib/types';

/**
 * Game and provider, entered together.
 *
 * The game box autocompletes from what this site has already recorded, and
 * picking a known game fills its provider in. Both stay ordinary text inputs
 * rather than a select: a slot that has never been logged here has to be
 * typeable, and on a new channel the suggestion list starts empty.
 *
 * Both are uncontrolled, so the `resetOnSuccess` on the surrounding form
 * actually clears them — a React-controlled input ignores `form.reset()` and
 * would keep the last provider sitting there after each bonus was added.
 *
 * The provider is only auto-filled while it is untouched. Once someone types
 * in it — correcting a rebrand, or a game a second studio also publishes —
 * their value stands until the form is reset for the next bonus.
 *
 * `defaultGame` starts the box from a viewer's chat call. If it matches a known
 * game, the known spelling and provider are used instead of chat's version.
 * Ids come from `useId` because the call queue puts one of these in every row.
 */
export function GameField({ suggestions, defaultGame }: { suggestions: GameSuggestion[]; defaultGame?: string }) {
  const uid = useId();
  const listId = `${uid}-games`;
  const gameId = `${uid}-game`;
  const providerId = `${uid}-provider`;
  const known = defaultGame
    ? suggestions.find((s) => s.game.toLowerCase() === defaultGame.trim().toLowerCase())
    : undefined;
  const gameRef = useRef<HTMLInputElement>(null);
  const providerRef = useRef<HTMLInputElement>(null);
  const touched = useRef(false);

  // Adding a bonus resets the form; the next one starts from a clean slate.
  useEffect(() => {
    const form = gameRef.current?.closest('form');
    if (!form) return;
    const onReset = () => {
      touched.current = false;
    };
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, []);

  const onGame = (value: string) => {
    if (touched.current || !providerRef.current) return;
    const match = suggestions.find((s) => s.game.toLowerCase() === value.trim().toLowerCase());
    if (match?.provider) providerRef.current.value = match.provider;
  };

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor={gameId}>
          Game
          <span className="adm-req"> *</span>
        </label>
        <input
          id={gameId}
          ref={gameRef}
          className="input"
          name="game"
          type="text"
          list={suggestions.length ? listId : undefined}
          required
          defaultValue={known?.game ?? defaultGame}
          placeholder="Sugar Rush 1000"
          autoComplete="off"
          onChange={(e) => onGame(e.target.value)}
        />
        {suggestions.length ? (
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s.game} value={s.game}>
                {s.provider}
              </option>
            ))}
          </datalist>
        ) : null}
        <p className="field__hint">
          {suggestions.length
            ? 'Start typing — games logged before will suggest themselves.'
            : 'Games you log here will suggest themselves next time.'}
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={providerId}>
          Provider
        </label>
        <input
          id={providerId}
          ref={providerRef}
          className="input"
          name="provider"
          type="text"
          defaultValue={known?.provider}
          placeholder="Pragmatic Play"
          autoComplete="off"
          onChange={() => {
            touched.current = true;
          }}
        />
      </div>
    </>
  );
}
