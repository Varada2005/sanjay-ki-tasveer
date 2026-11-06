# Making the pointer accurate (what to give me, what to do)

## What was wrong
The wrapper on the print is tiny (about 35 px on a 1491 px page, roughly 8 mm on A4), but the hit zones I had drawn
covered whole stalls and frames, and the glowing dot sat in the middle of that big zone, not on the wrapper.
So you aimed at the dot, and everything near the wrapper was part of the same target.

## What changed
- Every wrapper now has a **small hit circle on the wrapper itself** (about 1.2 to 1.4 times its size, 90 px wide on the page).
  The glowing dot is drawn on that spot.
- Wrapper circles must stay at least 25 px clear of the old men and of each other; a test checks this.
- A **220 ms grace period**: if the aim slips off for a moment (hand shake, one lost frame), the 0.8 s hold keeps going.
- Two wrappers are drawn on your drafts (the sack bow, the jaimala frame corner), so those are exact.
  The other four (Pappu's stall, kulfi stall, cabin 16, bangle tray) are **new art, placed by best guess**.

## What I need from you to make it exact
1. **The final illustrations** as PNG, A4 landscape, at least 2480 x 1754 px, exactly what gets printed (no extra border,
   no crop, no shadow added later). I recompile the tracking files (`npm run targets`) from these exact files.
2. **Wrapper positions.** When the art is done, either send it and I place the six circles, or do it yourself:
   open `/tools/editor.html`, pick the page, click a `w_...` region and drag its points onto the wrapper.
   Keep each wrapper at least **8 mm** wide on the print, red-and-white, never partly hidden, and not touching an old man.
3. **A short screen recording** from a real phone while it misbehaves: about 20 seconds, aimed at the printed page,
   plus the phone model. With the presenter menu's "Region outlines" switched on I can see exactly which zone it thinks
   you are on. Tell me which wrapper it gets wrong.

## What makes tracking itself steady
- Print at **100 %**, matte paper, **flat**. A page that bows near the spine moves the target by a few millimetres.
- Hold the phone **25 to 40 cm** away with most of the page in view. Closer than about 15 cm loses the features it locks on.
- Light the page evenly; avoid a lamp reflecting off the paper.
- Busy, detailed illustration tracks very well; large flat or white areas track poorly, so keep detail across the page
  (including near the wrapper positions).
- Two printed copies of the same page are fine; a different crop or size is not (recompile first).

## If the pointer is slightly off in the same direction on a real phone
That is a camera-lens offset. Send me the recording and the phone model; I can add a hidden "nudge the aim" calibration.

## Hand-drawn teen page: measured (simulated phone camera)
| View | Recognised | Pointer error |
|---|---|---|
| Whole page in view | 3 of 3 santra goli, 1.7 to 2.1 s | 0.34 to 0.44 % of page width |
| Half the page, turned 8 degrees | 3 of 3, 1.6 to 2.1 s | 0.21 to 0.43 % |
| Close-up, a third of the page | 3 of 3, 1.7 to 2.5 s | 0.27 to 0.39 % |
| Tilted 32 degrees and turned 14 degrees | 3 of 3, 1.7 to 2.4 s | 0.45 to 0.67 % |
| Page turned round (180 degrees) | 3 of 3, 1.7 to 2.2 s | 0.44 to 0.60 % |
| Old men D and glasses man, far and tilted | 4 of 4 | 0.15 to 0.37 % |

0.5 % of the page width is about 1.5 mm on A4. Before the page-part targets were added, close-ups and half-page views of the
corner santra goli (Pappu's stall, cabin 16) were not recognised at all; with them all 19 views pass.

## Hand-drawn haat page: measured (simulated phone camera)
| View | Recognised | Pointer error |
|---|---|---|
| Whole page in view | 3 of 3 santra goli | 0.33 to 0.43 % of page width |
| Half the page, turned 8 degrees | 3 of 3 | 0.05 to 0.44 % |
| Close-up, a third of the page | 3 of 3 | 0.16 to 0.37 % |
| Tilted 32 degrees and turned 14 degrees | 3 of 3 | 0.38 to 0.82 % |
| Page turned round (180 degrees) | 3 of 3 | 0.16 to 0.64 % |
| Sanjay and the red-turban man, far and tilted | 4 of 4 | 0.27 to 0.40 % |

## Updated mela pages (November 2026)

The re-coloured jhoola and haat pages keep the same framing (checked with overlays), so all region coordinates
stayed. Targets were recompiled from the new art: 38 of 38 simulated camera views recognised, pointer error at most
0.62 % of the page width.
