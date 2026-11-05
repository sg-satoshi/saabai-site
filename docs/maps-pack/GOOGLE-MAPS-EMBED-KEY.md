# Google Maps Embed API key (Shane)

Maps embeds work today with a keyless `maps?q=&output=embed` iframe. For the official Embed API (preferred, free, unlimited):

1. Open Google Cloud Console credentials for the Saabai project:
   https://console.cloud.google.com/apis/credentials
2. Enable **Maps Embed API** on the same project:
   https://console.cloud.google.com/apis/library/maps-embed-backend.googleapis.com
3. Create an **API key**, then restrict it:
   - Application restriction: **HTTP referrers**
   - Referrers to include: `https://www.saabai.ai/*`, `https://saabai.ai/*`, `https://*.saabai.ai/*`, plus each live client host (`https://stuscyclerepairs.com/*`, `https://www.lifestylemoneymanagement.com.au/*`, `https://www.wholesalehomes.com.au/*`, `https://boconsulting.com.au/*`, `https://sunder.com.au/*`, `https://tributumlaw.com/*`, `https://nicomoretti.com.au/*`, `https://www.inkfxprinting.com/*`, and any other client domains you serve).
   - API restriction: **Maps Embed API** only.
4. In Vercel project env for saabai-site production (and preview if you want):
   - Name: `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`
   - Value: the restricted key
5. Redeploy. `MapsPack` switches from keyless to Embed API automatically.

Do not create billing spend beyond Embed (it is free). Do not enable Places or Maps JavaScript API unless we ask later.
