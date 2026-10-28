/* ═══════════════════════════════════════════════════════════════
   Aurum — live FM stations

   This file is deliberately empty. A live station is someone else's
   broadcast, so it only belongs here when you are allowed to stream it.

   Two ways to add a station, and both are one object in the array below:

   1. A stream you have the right to use — your own station, or one that
      publicly offers a direct stream URL:

        {
          id: "my-fm",
          name: "My FM",
          frequency: "93.5",
          city: "Delhi",
          c1: "#8f3d52",
          stream: "https://example.com/live.mp3"   // icecast / mp3 / aac
        }

   2. A station's own 24/7 live video on YouTube. This is the safest option
      for a commercial station, because the station itself publishes the
      broadcast and YouTube serves it — nothing is re-hosted here:

        {
          id: "station-live",
          name: "Station Live",
          frequency: "98.3",
          city: "Mumbai",
          c1: "#8a6a2f",
          youtube: "VIDEO_ID_OF_THE_LIVE_STREAM"
        }

   Two things to know before pasting a commercial FM URL:

   * Re-streaming a station's audio inside another app is a broadcast /
     copyright matter, not just a technical one. In India the station and its
     music licences (IPRS, PPL and the like) cover their own broadcast, not
     yours — ask the station first.
   * Stream URLs found on radio aggregator sites are unlicensed copies and
     they rotate without notice, so a station added that way usually goes
     quiet within weeks.

   Nothing below is added for you: an unlicensed station shipped in a repo is
   a problem the moment the site is public.
   ═══════════════════════════════════════════════════════════════ */

window.AURUM_LIVE_STATIONS = [
  // {
  //   id: "station-live",
  //   name: "Station Live",
  //   frequency: "93.5",
  //   city: "Delhi",
  //   c1: "#8f3d52",
  //   youtube: "dQw4w9WgXcQ"
  // }
];
