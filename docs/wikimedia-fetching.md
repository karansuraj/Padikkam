# Fetching from Wikimedia, gently

We use Wikimedia data (Wikidata lexemes, Lingua Libre / Commons audio). Wikimedia's
[robot policy](https://wikitech.wikimedia.org/wiki/Robot_policy) asks automated clients
to identify themselves with a real contact, use at most 2 connections, and slow down when
told. Earlier bulk downloads without a contact in the User-Agent got HTTP 429 with a
10 minute `Retry-After`. Everything below exists so that does not happen again.

## The one rule

**All requests to Wikimedia hosts go through `tools/wikimedia/polite-client.mjs`.**
No ad-hoc `curl`, no one-off scripts, no direct `fetch`.

## What the client enforces (and the tests prove)

- User-Agent `PadikkamAudioFetch/0.1 (<contact>) node/<version>`; it refuses to run without a contact.
- One request at a time, queued.
- A pause between requests, with jitter, measured from when the previous response headers arrived:
  API and query services about 5 to 8 s, audio downloads about 12 to 18 s.
- The pause and all other state live in `.wikimedia-cache/state/state.json`, so separate runs honour each other.
- Only one process at a time (a lock file in the state folder); state is re-read after every pause, so a block or STOP written meanwhile is honoured. A corrupt `state.json` stops the run rather than resetting the protections.
- First 429, 503 or 403: it stops, saves `Retry-After` (plus a margin), and makes no request, even from a new run, until that time. It never retries a 429.
- Three server errors or network errors in a row also stop everything for 15 minutes plus margin.
- Daily caps (UTC): 100 API requests and 150 downloads.
- Create a file named `.wikimedia-cache/state/STOP` to halt everything at once.
- Redirects are not followed, and each request times out after 60 s.
- Only https, only these hosts: commons.wikimedia.org, upload.wikimedia.org, query.wikidata.org, www.wikidata.org, lingualibre.org.
- Every request is appended to `.wikimedia-cache/state/requests.log`.
- Query results are cached on disk by query text, so the same query is never sent twice.

If a block happens: read the message, wait, do not change the User-Agent or find a way around it.

## Setup

Put a reachable contact in `.env.wikimedia.local` (gitignored, never commit it):

```
WIKIMEDIA_CONTACT=you@example.com
```

## Running a query

```bash
node tools/wikimedia/query.mjs wdqs tools/wikimedia/queries/wikidata-coverage.rq        # dry run, no request
node tools/wikimedia/query.mjs wdqs tools/wikimedia/queries/wikidata-coverage.rq --go   # sends 1 request, caches it
```

## Watching a download

`fetch-audio` prints nothing while it runs (everything goes to the audit log). To see progress, in another terminal:

```bash
node tools/wikimedia/status.mjs            # one snapshot
node tools/wikimedia/status.mjs --watch    # refreshes every 10 s
```

It only reads local files (the log, state and manifest) and makes no requests, so it can run at any time without affecting the download. The raw log is `.wikimedia-cache/state/requests.log` (`tail -f` works too).

## Coverage found on 2026-11-15 (Wikidata, Malayalam = Q36236)

- 67,390 lexemes; 10,634 with pronunciation audio; 11,211 with an English gloss.
- 4,269 with both audio and an English gloss.
