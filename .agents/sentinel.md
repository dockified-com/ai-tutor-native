## Sentinel Journal
## 2024-06-13 - Insecure Random Number Generation for Course Codes
**Vulnerability:** Weak random number generation (`random.choices`) was used to generate course codes for users to enroll.
**Learning:** `random` module produces predictable outcomes which could allow unauthorized guessing of codes and unintended access.
**Prevention:** Use the `secrets` module which utilizes cryptographically secure pseudorandom number generators (CSPRNG).
