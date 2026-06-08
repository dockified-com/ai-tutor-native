# API Audit — Unconnected / Missing

## Missing Backend Routes

| # | Method + Path | Frontend file |
|---|---|---|
| 1 | GET /api/spaces/owned | features/spaces/hooks/use-spaces.ts:24 |
| 2 | GET /api/spaces/joined | features/spaces/hooks/use-spaces.ts:25 |
| 3 | POST /api/spaces/join | features/spaces/actions/join-space.ts:10 |
| 4 | POST /api/spaces | features/spaces/actions/create-space.ts:13 |
| 5 | POST /api/progress/blocks/{blockId}/complete | features/progress/actions/mark-block-complete.ts:10 |
| 6 | PATCH /api/enrollments/{id}/bookmark | features/progress/actions/update-bookmark.ts:10 |
| 7 | GET /api/blocks/{blockId}/roast | features/tutor/actions/get-code-roast.ts:3 |
| 8 | GET /api/tts/stream | features/tutor/hooks/use-tts-audio.ts:105 |
| 9 | GET /api/courses/{courseId}/status | features/authoring/hooks/use-generation-status.ts:18 |

**Possible mismatch:** POST /api/courses — backend expects `pdf_url`, frontend sends `source_pdf_url`
- Backend: `backend/app/features/authoring/routes.py:25`
- Frontend: `features/spaces/actions/create-tutor.ts:16`

---

## Frontend Stubs (Hardcoded / Not hitting backend)

| # | File | Issue |
|---|---|---|
| 1 | app/courses/[id]/lesson/[lesson_id]/page.tsx:23-67 | Complete stub — hardcoded mockBlocks, never calls API |
| 2 | app/courses/[id]/page.tsx:12,30-32,53 | Partial — falls back to MOCK_COURSES + hardcoded `{ role: "creator" }` |
| 3 | app/api/enrollments/[id]/ask/route.ts:9-10 | Complete stub — streams hardcoded mockResponse |
| 4 | app/api/blocks/[id]/understanding-check/route.ts:8-14 | Complete stub — fake AI feedback |
| 5 | app/api/blocks/[id]/concept-check/route.ts:4 | Complete stub — no real validation |
| 6 | features/authoring/actions/create-course.ts:6 | Complete stub — returns `{ courseId: "stub-course-id" }` |
| 7 | features/spaces/components/node-page.tsx:124-139 | Assessments + Resources are "Coming soon" placeholders |
| 8 | shared/lib/mock-data.ts:3-53 | MOCK_COURSES + MOCK_ENROLLMENTS still used as fallback |

---

## Priority

- **Critical (lesson flow):** #1, #3, #4, #5 in stubs
- **Spaces feature:** backend routes #1–4 + stub #6
- **Progress:** backend routes #5–6
- **Nice-to-have:** roast (#7), TTS (#8), course status (#9)
