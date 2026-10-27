# CLIO conversation exports

Recorded CLIO conversations, exported as self-contained HTML, that the CLIO site
(clio.iowarp.ai/conversations/) serves. The site pins each file by commit, size and
sha256 in `site/src/lib/published-conversations.ts` of iowarp/clio-agent and copies it
into the build, so a changed file never reaches the site unnoticed.

| Folder | Conversation |
| --- | --- |
| `delegation/Reading-guide-session.html` | A reading guide to a design folder, surveyed by ten delegated explore agents |
| `delegation/Skill-review-session.html` | A review of every plugin's skills, split across six review agents |

`sha256sum -c SHA256SUMS` in a folder checks its files.
