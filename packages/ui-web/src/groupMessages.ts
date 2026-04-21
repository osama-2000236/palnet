// groupMessages — pure helper that decides which messages in a thread should
// close out a "run" and show a tail + timestamp.
//
// A run = consecutive messages from the same author, each within `windowMs`
// of the previous. Only the LAST message in a run gets a tail + timestamp;
// all others render tight against their neighbours.
//
// Additional rule (matches prototype): if the gap from the previous message
// is > 10 minutes, show the timestamp even if the authors match — the reader
// needs a temporal anchor after a long silence.

export interface GroupedMessage<M> {
  message: M;
  /** Whether this is the last of a run (shows tail + timestamp). */
  tail: boolean;
  /** Whether the timestamp should render under the bubble. */
  showTimestamp: boolean;
  /** Whether a run-separator gap should render ABOVE the bubble. */
  startsRun: boolean;
}

export interface GroupMessagesOptions<M> {
  authorId(m: M): string;
  createdAt(m: M): string | Date;
  /** Max gap inside a run, default 2 min per MessageBubble spec. */
  windowMs?: number;
  /** Gap after which a timestamp is always shown, default 10 min. */
  timestampGapMs?: number;
}

export function groupMessages<M>(
  messages: M[],
  opts: GroupMessagesOptions<M>,
): GroupedMessage<M>[] {
  const windowMs = opts.windowMs ?? 2 * 60 * 1000;
  const timestampGapMs = opts.timestampGapMs ?? 10 * 60 * 1000;

  const times = messages.map((m) => {
    const t = opts.createdAt(m);
    return typeof t === "string" ? Date.parse(t) : t.getTime();
  });
  const authors = messages.map((m) => opts.authorId(m));

  return messages.map((m, i) => {
    const prevAuthor = i > 0 ? authors[i - 1] : null;
    const nextAuthor = i < messages.length - 1 ? authors[i + 1] : null;
    const prevTime = i > 0 ? times[i - 1]! : -Infinity;
    const nextTime =
      i < messages.length - 1 ? times[i + 1]! : Number.POSITIVE_INFINITY;
    const thisTime = times[i]!;

    const continuesPrev =
      prevAuthor === authors[i] && thisTime - prevTime < windowMs;
    const continuedByNext =
      nextAuthor === authors[i] && nextTime - thisTime < windowMs;

    const startsRun = !continuesPrev;
    const tail = !continuedByNext;
    const gapBeforeIsLarge = thisTime - prevTime > timestampGapMs;

    return {
      message: m,
      tail,
      showTimestamp: tail || gapBeforeIsLarge,
      startsRun,
    };
  });
}
