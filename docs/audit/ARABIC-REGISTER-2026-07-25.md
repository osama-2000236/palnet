# Arabic register — every colloquial string, for the native-speaker reviewer

One list, so the copy review is a sitting instead of a grep. **47 strings**
across `apps/web/messages/ar-PS.json` and `apps/mobile/src/i18n/ar.json`.

This is not a defect report. Whether Levantine belongs in Baydar's voice is a
`BRAND.md` decision and a native speaker's call — I can find the instances, I
cannot rule on them. What I can say is which surface each one is on, and that
changes the question.

## The record needed correcting

`docs/audit/OPUS5-REVIEW-2026-07-25.md` logs this as P3-1, "mixed Arabic
register **on the landing page**", and `docs/design/screen-critique-2026-07.md`
records the dialect as a deliberate choice scoped to admin queues, with
"**Product-facing copy stays MSA**" as the stated rule.

Neither is accurate. Of the 47 strings, 6 are on the landing page and 11 are
admin-only. The remaining **30 are product-facing member surfaces** — privacy
settings, security settings, Karama, the profile endorsement toasts, the error
boundary, the 404 page, and the premium cancel confirmation, the last of which
is identical on web and mobile. The rule in `screen-critique` describes an
intent that the catalogs do not implement.

So the reviewer is not being asked "should the landing page be less
colloquial". They are being asked which register Baydar speaks in, and the
answer applies to about thirty strings they have probably never been shown.

## How these were found

Word-boundary matching, not substring — Arabic substring matching is useless
here (`شو` is inside `منشور`, `مش` is inside `مشاركة`, `لسا` is inside
`الجلسات`; a naive pass returned 134 hits, nearly all noise). Tokens are split
on non-letter boundaries, tashkeel and tatweel stripped, and the clitic
prefixes `و ف ل ب ك ال` peeled before comparison.

Markers: `مين شو هاي هاد مش بدك بدي بدنا كمان ليش عشان لسا يلا اللي لمّا هيك
منيح بلاش هلق كتير`, the phrases `ما في / ما فيش / ما لقينا / ما بقدر`, and the
**b-imperfect** — the Levantine present-tense prefix (`بتظهر`, `بيقدروا`,
`بينحفظ`). MSA has no such form, so it is the single clearest tell.

Deliberately not flagged, because they collide with ordinary MSA and only
generate noise: `حد` (also "limit" — `الحد الأعلى`), `زي`, `لحد`, `فيه`. Every
`ب`-initial token was enumerated once and hand-split, because the regex cannot
tell a b-imperfect verb from a noun: `بيدر` (the product name, 43 hits),
`بيانات`, `بنكية`, `بنقاط`, `بنشر`, `ببناء`, `بتجربة` are all prepositions or
nouns and are excluded.

## Product-facing — the ones that decide the question

| Key                                                   | Platform         | String                                                               | Marker                     |
| ----------------------------------------------------- | ---------------- | -------------------------------------------------------------------- | -------------------------- |
| `errors.boundary.body`                                | web              | بنعتذر — صادفنا مشكلة بعرض الصفحة. جرّب كمان مرة.                    | بنعتذر (b-imperfect); كمان |
| `errors.notFound.title`                               | web              | ما لقينا هاي الصفحة                                                  | ما لقينا; هاي              |
| `karama.title`                                        | **web + mobile** | السمعة بتنكسب                                                        | بتنكسب (b-imperfect)       |
| `karama.earnBody`                                     | web              | …كل واحدة بتزيد رصيدك.                                               | بتزيد (b-imperfect)        |
| `karama.recentEmpty`                                  | **web + mobile** | ما في نشاط كرامة حديث.                                               | ما في                      |
| `karama.redeemFailed`                                 | web              | تعذّر استبدال هاي المكافأة.                                          | هاي                        |
| `premium.cancel.confirm`                              | **web + mobile** | بدك توقف تجديد العضوية؟ بتظل فعّالة لنهاية المدة المدفوعة.           | بدك; بتظل                  |
| `profile.endorseAlready`                              | web              | أيّدت هاي المهارة سابقًا.                                            | هاي                        |
| `profile.endorseFailed`                               | web              | تعذّر تأييد هاي المهارة.                                             | هاي                        |
| `jobs.emptyTitle`                                     | mobile           | ما في وظائف تطابق الفلاتر.                                           | ما في                      |
| `settings.privacy.subtitle`                           | web              | راجع مين بقدر يلاقي ملفك المهني أو يشوفه أو يتواصل معك.              | مين                        |
| `settings.privacy.noticeBody`                         | web              | هاي الضوابط بتعرض عقد الخصوصية المقصود… عشان ما يتغير أي إعداد بصمت. | هاي; بتعرض; عشان           |
| `settings.privacy.fields.profileVisibility.desc`      | web              | اختار مين بقدر يشوف ملفك المهني العام.                               | مين                        |
| `settings.privacy.fields.whoCanMessage.title`         | web              | مين بقدر يراسلك                                                      | مين                        |
| `settings.privacy.fields.whoCanSeeConnections.title`  | web              | مين بشوف علاقاتك                                                     | مين                        |
| `settings.privacy.fields.whoCanSeeContact.title`      | web              | مين بشوف معلومات التواصل                                             | مين                        |
| `settings.privacy.fields.whoCanSeeContact.desc`       | web              | خلي البريد والهاتف ظاهرين بس للي بتختارهم.                           | بتختارهم                   |
| `settings.privacy.rows.messages.body`                 | web              | …بقدروا يطلبوا محادثة، بس ما بتنفتح محادثة مباشرة قبل ما تقبل.       | بتنفتح                     |
| `settings.security.noticeTitle`                       | web              | ما في إجراءات أمان وهمية                                             | ما في                      |
| `settings.security.disabledHint`                      | web              | الحفظ معطل لأنه ما في تغييرات أمان مدعومة… على هاي الشاشة بعد.       | ما في; هاي                 |
| `settings.security.sessions.empty`                    | web              | ما في جلسات نشطة بعد.                                                | ما في                      |
| `settings.security.sessions.desc`                     | web              | راجع الأجهزة اللي مسجلة دخول على حسابك.                              | اللي                       |
| `settings.security.rows.sessions.body`                | web              | مراجعة الجلسات وإلغاؤها بتحتاج قائمة جلسات من الخادم قبل التفعيل.    | بتحتاج                     |
| `settings.security.password.mismatch`                 | web              | كلمتا المرور الجديدتان مش متطابقتين.                                 | مش                         |
| `settings.notifications.events.weeklyDigest.desc`     | **web + mobile** | اللي فاتك من منشورات وتواصلات                                        | اللي                       |
| `settings.notifications.events.newReaction.desc`      | web              | إعجاب أو إعادة نشر — بيوصلك ملخص يومي                                | بيوصلك                     |
| `settings.notifications.events.moderationAction.desc` | **web + mobile** | ما بنقدر نعطّله — منبلّغك بأي إجراء بيخصّ حسابك                      | بنقدر; بيخص                |

## Landing page

| Key                              | String                                                | Marker     |
| -------------------------------- | ----------------------------------------------------- | ---------- |
| `landing.values.visibility.body` | اختار مين يلاقيك، مين يراسلك، ومين يشوف حضورك المهني. | مين        |
| `landing.values.trust.body`      | …بتكافئ المساهمات الجادة، مش مطاردة الانتشار.         | بتكافئ; مش |
| `landing.values.career.title`    | فرص بتناسبك                                           | بتناسبك    |
| `landing.employer.body`          | …بالمكان اللي المرشحين بنمّوا فيه سمعتهم المهنية.     | اللي       |

## Admin / internal — already recorded as a deliberate voice choice

Listed for completeness. `screen-critique-2026-07.md` keeps these on purpose:
the queues are single-operator internal surfaces.

| Key                                   | String                                                         |
| ------------------------------------- | -------------------------------------------------------------- |
| `admin.billing.actionConflict`        | هاي الفاتورة تمت معالجتها من قبل — حدّثنا القائمة.             |
| `admin.billing.emptyTitle`            | ما في إيصالات بحاجة لمراجعة                                    |
| `admin.billing.emptyFilteredTitle`    | ما في فواتير بهذا التصنيف                                      |
| `admin.billing.emptyBody`             | إيصالات التحويل البنكي الجديدة بتظهر هون لمراجعة فريق المالية. |
| `admin.billing.forbiddenBody`         | …مشرفو المحتوى بيقدروا يستخدموا قائمة الإشراف.                 |
| `admin.billing.voidReasonPrompt`      | شو سبب إلغاء هاي الفاتورة؟ (بينحفظ في سجل التدقيق)             |
| `admin.moderation.confirmHardDelete`  | بدك تحذف هذا الحساب نهائيًا؟ ما بترجع عن هذا الإجراء.          |
| `admin.moderation.emptyTitle`         | ما في بلاغات مفتوحة                                            |
| `admin.moderation.emptyResolvedTitle` | ما في بلاغات معالجة                                            |
| `admin.moderation.emptyBody`          | بلاغات السلامة الجديدة بتظهر هون لمراجعة فريق الإشراف.         |
| `admin.moderation.emptyResolvedBody`  | البلاغات اللي بتتم معالجتها بتظهر هون مع قرارها.               |

## What the reviewer needs to decide

1. Does Baydar speak MSA, Palestinian, or MSA-with-a-Palestinian-warmth? The
   answer belongs in `BRAND.md`, which is currently silent on register.
2. If the answer is MSA, the 30 product-facing strings above are the change
   list, and 4 of them are duplicated on mobile and must move in lockstep.
3. If the answer is Palestinian, then the rest of the catalog is the outlier
   and `screen-critique-2026-07.md`'s "product-facing copy stays MSA" line
   should go.

Either way this stays `BLOCKED` on a human. Nothing here is an engineering
task, and nothing here should be "fixed" by a non-native speaker guessing.
