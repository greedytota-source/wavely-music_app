// Google AdSense setup for the player.
//
//   1. Sign up at https://www.google.com/adsense/ and add this site.
//   2. Paste your client id (ca-pub-XXXXXXXXXXXXXXXX) into ADSENSE_CLIENT.
//   3. In AdSense → Ads, create one Responsive ad unit and paste its slot id
//      into AD_SLOTS.content.
//   4. Publish the ads.txt that already sits in the repo root with the same
//      digits (pub-XXXXXXXXXXXXXXXX), then re-run the AdSense ads.txt check.
//
// While either value is still the all-zero placeholder, js/ads.js does nothing
// at all: no ad script, no network requests, no markup, no layout change.

const ADSENSE_CLIENT = "ca-pub-0000000000000000";

// One responsive ad unit drives every slot in the player.
const AD_SLOTS = {
  content: "0000000000"
};

window.AdsConfig = {
  client: ADSENSE_CLIENT,
  slots: AD_SLOTS
};
