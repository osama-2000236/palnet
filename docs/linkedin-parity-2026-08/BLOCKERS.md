# Blockers

Every gate that failed and could not be fixed inside its phase, with the
diagnosis. A green build with a suppressed check is worse than a red one, so a
failure that cannot be fixed is written down here and reported rather than
worked around.

**Format:** phase · gate · what failed · what was tried · what it needs.

---

_None. No gate has failed outside the phase that introduced it._

Owner-input items are not blockers and are not listed here — every one of them
has a designed fallback, ships behind its env var, and is tracked in the master
spec §21. A feature that degrades honestly is not blocked.
