# Screenshots

The main README references the following screenshots of CommonGround running locally with fictional sample data.

| File | Route | View |
| --- | --- | --- |
| `home-desktop.png` | `/` | Desktop landing page |
| `campaign-desktop.png` | `/campaigns/education-every-child` | Campaign detail and donation interface |
| `dashboard-desktop.png` | `/dashboard` | Donor dashboard, signed in as the sample donor |
| `home-mobile.png` | `/` | Mobile landing page |

## Refreshing the images

Start both the frontend and backend in demo mode, then open `http://localhost:5173`. Capture the desktop routes using one consistent desktop viewport, and capture the home page again at a phone-sized viewport. Allow photos and data to load before taking each screenshot. Use the demo donor sign-in for the dashboard image.

Keep the exact filenames above so the README image links continue to work. Capture the working interface without editing its state labels or adding performance/payment claims. Avoid capturing personal account details or any developer console output containing credentials.

The app's sample content and simulated payments are for demonstration. Campaign photography is credited in [`client/public/images/ATTRIBUTION.md`](../client/public/images/ATTRIBUTION.md).

## Automated capture

From the repository root, run `npm run test:e2e` after installing Playwright Chromium. The first test generates these images at desktop 1440 × 1000 and mobile 390 × 844, using an isolated in-memory demo. `preview.png` is a desktop viewport capture for a compact preview; the other captures show full pages.
