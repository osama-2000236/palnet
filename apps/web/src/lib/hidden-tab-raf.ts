// React 19's streamed-Suspense runtime schedules both the fallback→content
// swap ($RV) and the boundary hydration retry (_reactRetry) through
// requestAnimationFrame. rAF never fires while the tab is hidden, so a hard
// load in a background/headless tab strands the route skeleton forever: the
// real segment stays in a `<div hidden id="S:*">` and its effects never run
// (observed as the "two <main>s" zombie on every (app) hard load).
//
// Fix at the platform level: while the document is hidden, service rAF via a
// timer so streaming reveal + hydration make progress. Once visible, native
// rAF is used untouched. Runs pre-hydration as an inline script in <body>,
// before the first streamed $RC completion script.
//
// Timeout ids are returned negated so cancelAnimationFrame can tell them
// apart from native rAF handles (both are positive integers).
export const hiddenTabRafBootScript = `(function(){var w=window,raf=w.requestAnimationFrame.bind(w),caf=w.cancelAnimationFrame.bind(w);w.requestAnimationFrame=function(cb){if(!document.hidden)return raf(cb);return -w.setTimeout(function(){cb(performance.now())},32)};w.cancelAnimationFrame=function(id){if(id<0){w.clearTimeout(-id)}else{caf(id)}};})();`;
