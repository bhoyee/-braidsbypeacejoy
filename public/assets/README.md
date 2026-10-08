# Brand assets

| File | Used for |
| --- | --- |
| `logo2.png` | Header, footer, favicon. It has a transparent background. |
| `logo1.jpeg` | Social-share image and Google structured data. It's the same mark on black. |
| `hero-video.mp4` | The home hero: full-screen behind the text on phones, and a full-height panel on the right on desktop. It's `pix9.mp4` with the audio removed and fast-start enabled. |
| `hero-poster.jpg` | The still frame shown while the hero video loads. It's taken from `pix9.mp4` at 12.5 s. |
| `studio-tour.mp4` + `studio-tour-poster.jpg` | The "Take the studio tour" player in the Visit section. It's `video.mp4` with the black tail trimmed. |
| `pix3.jpeg` | Our Work gallery and the Medium Knotless card. |
| `pix1.jpeg` | Our Work gallery and the Fulani Braids card. |
| `pix4-cropped.jpg` | Our Work gallery. It's `pix4.jpeg` with the PixVerse watermark cropped off. |
| `pix6.jpeg` | Our Work gallery ("Your chair is ready"). |
| `pix5.jpeg` | The Experience section. |
| `pix2.jpeg` | The Visit section ("Look for our window"). |

**Not used:**
* `pix8.jpeg`
* the originals `pix4.jpeg`, `pix9.mp4` and `video.mp4`, which are kept as sources

To give another style card a photo, set its `imageUrl` in `prisma/seed.ts`, for example `"/assets/pix8.jpeg"`. Then run `npm run db:seed`.

The source videos are vertical (478×850). On desktop the hero shows the video as a full-height panel beside the text, which keeps it at close to its native width and therefore sharp. A 1080p clip would look sharper everywhere.
