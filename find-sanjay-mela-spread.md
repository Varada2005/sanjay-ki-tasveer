# Final spread: "Sanjay ki Tasveer" (Find Sanjay at the mela)

## One-line mechanic
Sanjay walked through the mela eating peppermints and dropped a wrapper wherever he stopped. Every wrapper on one page points to a stall on the other page. Solve it together, punch a 3-digit number into the phone at that stall, and one piece of Sanjay's torn photo comes back. Rebuild his face, then find him in the crowd.

## The one rule players learn
1. Find a peppermint wrapper (red-white twist) on your page.
2. Tell the other person what is next to it. The place it points to is always on their page.
3. They find that place and point the phone at it. The phone shows 3 empty boxes.
4. Work out the 3 digits together (half the information is on each page) and type them.
5. Right number: a piece of Sanjay's photo. Wrong: the stall person says something human and gives a gentle nudge.

## The algorithm (why any start works)
- 6 threads. Each thread = HOOK (wrapper, on page X) + SITE (stall, on page Y, never the same page) + CODE (3 digits, built from both pages) + one PHOTO PIECE.
- 3 hooks on the teen's page (sites on Dadi's page), 3 hooks on Dadi's page (sites on the teen's page).
- Threads are independent: any thread can be solved first, in any order. Completeness is guaranteed.
- Back-and-forth rule: when a site is solved, the stall person points to an unsolved wrapper on the SAME page as that stall (the page of the person now holding the phone). So the phone always crosses the spine: T to D, D to T, T to D...
- Simulated: 108,000 random playthroughs (every start, nudges followed 100% / 50% / 0%, decoy traps 0% / 30% / 60%): 0 incomplete. With nudges followed, every start alternates pages strictly.

## Who sits where
- Teen's page: "Jhoola side" (giant wheel, ice gola, photo studio, kanche kids, scarecrow at the field edge, toy stalls). Busier, smaller figures.
- Dadi's page: "Haat side" (chaupar under the neem, matka kulfi, potter, bangle stall, pangat, bullock cart, rahat at the field edge). Fewer, bigger figures, high contrast.
- Across the fold: the peppermint stall, where Sanjay stands.

## The six threads

| # | Hook (wrapper is here) | Site (other page) | Decoy | How the 3 digits are made | Teen's job | Dadi's job | Photo piece |
|---|---|---|---|---|---|---|---|
| 1 | Teen: torn jhoola ticket on the ground. Logo: a matka wrapped in red cloth. Number 3 _ 8 (middle torn) | Dadi: matka kulfi seller (pots wrapped in wet red cloth), slate price written as ५ | potter's stall (plain pots, slate २) | 3 + ५ + 8 = 358 | spots the ticket, reads 3 _ 8 | "Red cloth on a matka? Kulfi!" Reads ५ | eyes (scar in eyebrow) |
| 2 | Dadi: chaupar under the neem, 7 kaudis just thrown, a blue kancha with the wrapper | Teen: kids' kanche circle drawn in chalk | marble jar at the toy stall | kaudis landing mouth-up (4) + marbles INSIDE the circle (12) = 412 | counts only marbles inside the circle | knows which kaudis count ("khule munh wali") | moustache (curled ends) |
| 3 | Dadi: bullock cart, jute sack stencilled in English "PAPPU 07" | Teen: toy whistle stall, board painted in regional script पप्पू with a painted ३ | lookalike stall बब्बू with a painted ५ | 07 + ३ = 073 | reads the English stencil | reads the regional script, catches प vs ब | left ear with gold murki |
| 4 | Teen: scarecrow (bijuka) at the field edge in a RED TOPI and a red-white check gamchha tied with 3 knots | Dadi: pangat. One row eats on pattal, one row (samdhin ki pangat) on steel thalis, served first. The server in the red-white check gamchha stands there | chai wala in a blue-check gamchha | knots (3) + diners in the samdhin row (6) + laddoos on the server's plate (2) = 362 | counts knots and laddoos | knows which row is the samdhin ki pangat | top of the photo: red head-cloth (the TRAP piece) |
| 5 | Teen: photo studio (painted aeroplane backdrop), a framed sepia jaimala photo with the wrapper tucked in. Point the phone at the photographer: "Maine yeh '82 mein kheenchi thi, Sanjay ki didi ki shaadi. Dulhan ki mausi aaj bhi chudiyaan bechti hai." | Dadi: bangle stall, old woman with nath on the LEFT and a crescent godna on her chin, 7 bangles on her right wrist | younger bangle seller, nath on the right | '8' '2' + bangles (7) = 827 | hears '82, describes the faces in the photo | "Mausi = maa ki behen." Matches the aged face (nath side, godna) | mole on right cheek |
| 6 | Dadi: rahat at the field edge, 2 bullocks circling, horns painted blue-yellow-blue, buckets on the chain | Teen: giant wheel, cabins numbered 11 to 18, one cabin painted blue-yellow-blue | cabin painted yellow-blue-yellow | full buckets coming up (5) + cabin number (16) = 516 | matches the stripe order, reads the cabin number | knows which side of the rahat comes up full | smile with a gap tooth |

Element types covered: artifact + logo + digits (1), game + environment (2), alphabets / scripts (3), environment and custom (4), people's statements + kinship (5), space and motion (6).

## The face and the final search
- The phone keeps a torn photo with 6 empty slots. Each solved thread fills one slot.
- 6 old men in the crowd (3 per page; Sanjay and lookalike A both at the peppermint stall across the fold).

| | red head-cloth | eyebrow scar | curled moustache | left murki | mole | gap tooth |
|---|---|---|---|---|---|---|
| Sanjay | yes | yes | yes | yes | yes | yes |
| A | yes | yes | yes | | | yes |
| B | yes | | yes | yes | yes | |
| C | yes | yes | | yes | | |
| D | | yes | yes | | yes | yes |
| E | yes | | | | yes | yes |

- The red trap: 5 of 6 men wear red on their head. Red alone never identifies him.
- Smart shortcut (computed): with 3 pieces, 7 of 20 combinations already identify Sanjay; with 4 pieces, 12 of 15; with 5 or 6, always.
- Point the phone at a man at any time. Right: Sanjay's voice, "Rakesh…? Har shaam, peppermint wali dukaan pe!" Wrong: "Nahi beta, main toh halwai hoon." After 2 wrong guesses the phone rests for a minute.

## Paper vs phone

On paper (everything is visible, nothing is explained):
- the two pages, the 6 wrappers, 6 sites, 6 decoys, 6 candidate men
- every number, letter, knot, kaudi, bucket and stripe needed for the codes
- inside cover: a wordless 4-picture "how to play" strip

On the phone (only what paper cannot do):
- language choice at start (Hindi, Marathi, Gujarati, matching the vocabulary sheet)
- camera with a crosshair; recognises regions on each page
- the 3-box number lock at every stall (decoys too), with the stall's sound
- the voices: the photographer's statement, stall people's thank-you, nudge and wrong-number lines, the candidates, Sanjay
- the torn photo filling up
- saved progress, so a family can play one or two threads a day

The phone never: shows text clues, translates a word, marks a location, keeps score, runs a timer.

## Ergonomics
- Dadi's page: bigger figures, fewer of them, every key detail at least about 8 mm, strong contrast.
- Teen's page: denser, rewards searching.
- Phone: digits at least 60 pt, one big keypad, speaker on by default, no reading needed beyond digits.
- One thread is about 3 to 5 minutes and is a natural stopping point.

## Risks to test
1. Counting can feel like busywork. Every count is gated by a lived custom (which kaudis count, which pangat row, which side of the rahat is full).
2. Script assumption: that the teen reads English easily and the regional script less easily, and Dadi the reverse. Swap name pairs per language pack.
3. Lived-knowledge assumption: matka kulfi cloth, kaudis, samdhin ki pangat, rahat. Check with 3 real grandparents from your target region.
4. Dadi typing on a phone: let either person type.
5. Length: 6 threads plus the final search is about 25 to 35 minutes. Threads are independent, so it can be split across days.
