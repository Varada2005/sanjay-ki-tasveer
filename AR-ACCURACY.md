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
