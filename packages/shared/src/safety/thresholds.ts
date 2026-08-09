// The numbers safety turns on.
//
// One table, because these are cross-referenced by tests and by copy: a
// threshold that lives in the service that enforces it is a threshold that
// gets a second, slightly different value in the service that displays it.
//
// Each entry names the master-spec section that argued for it. Changing a
// number here without changing that section is how a designed control becomes
// an accident.

export const SAFETY = {
  /**
   * Three upheld FEE_REQUEST reports auto-suspend an employer pending review.
   * §10.4 / §16.3. Charging a jobseeker a fee is the single most common scam
   * in this market, and it is worth being blunt about. Automatic suspension is
   * exactly why the appeal path in §16.6 is mandatory rather than optional.
   */
  FEE_REPORT_SUSPEND_THRESHOLD: 3,

  /**
   * §16.5 mitigation 2. Below this, `EvidenceSummary.ratingAvg` is null and the
   * UI shows the count only. A single retaliatory 1-star must not be allowed to
   * define somebody's working life.
   */
  MIN_RATINGS_FOR_AVERAGE: 4,

  /**
   * §16.5 mitigation 1. Neither side sees the other's rating until both have
   * submitted, or the window closes. Blind reveal is what stops a rating from
   * being a bargaining chip.
   */
  RATING_BLIND_REVEAL_DAYS: 14,

  /**
   * §16.5 mitigation 3. Opens at HIRED; closes 14 days after the WorkProof is
   * confirmed, or 60 days after HIRED if no proof ever appears.
   */
  RATING_WINDOW_AFTER_PROOF_DAYS: 14,
  RATING_WINDOW_NO_PROOF_DAYS: 60,

  /**
   * A first message from a non-connection, non-follower. §14.3 — the single
   * most effective anti-harassment control available, and it costs nothing.
   */
  MESSAGE_REQUEST_MAX_BEFORE_ACCEPT: 1,

  /**
   * k-anonymity for wage insight. §10.6. Below k, widen to region, then
   * national; if national is still below k, return null and SAY SO rather than
   * inventing a number.
   */
  WAGE_INSIGHT_K: 7,
  WAGE_OBSERVATION_WINDOW_MONTHS: 18,
  WAGE_ROUNDING_ILS: 50,

  /** Profile-view breakdowns. §5.4. */
  PROFILE_VIEW_K: 5,

  /**
   * Above this follower count, individual follow notifications are suppressed
   * and replaced by a weekly aggregate. §6.2 — otherwise any company page with
   * traction generates a notification storm on a 2G connection.
   */
  FOLLOW_NOTIFICATION_SUPPRESS_ABOVE: 500,
} as const;
