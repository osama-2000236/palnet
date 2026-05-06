# Sprint 15 Decisions — UGC Safety UI

## Confirmation Step UX

Block and unblock use an inline confirmation step inside `BlockButton` on both web and mobile. The first press reveals title, body copy, cancel, and the final CTA; the second press submits. This keeps the action close to its trigger without adding a second modal on top of profile/settings surfaces.

## Report Success Feedback

Report submission closes the dialog/sheet on success. Web post/comment/message surfaces keep a lightweight status/error message near the source where practical; mobile closes the sheet and leaves the screen state unchanged.

## Report Action Placement

- Profile: secondary action beside message/connect/block actions.
- Post: post action row/overflow slot opens the report flow with `targetPostId`.
- Comment: row action opens the report flow with `targetCommentId`.
- Web message: hover/focus action on received messages opens the report flow with `targetMessageId`.
- Mobile message: long-press on received messages opens `ReportSheet` with `targetMessageId`; own-message long-press remains edit/delete.
