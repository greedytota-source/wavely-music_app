/* ═══════════════════════════════════════════════════════════════
   Aurum — live FM stations

  This file is a fallback for static station definitions. The normal
  station list is loaded from the radio_stations Supabase table and managed
  in Admin → Radio.

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

  Only add stations you are allowed to stream.
   ═══════════════════════════════════════════════════════════════ */

window.AURUM_LIVE_STATIONS = [
  {
    id: "fm-gold",
    name: "FM GOLD",
    frequency: "106.4",
    city: "Delhi",
    c1: "#8f3d52",
    stream: "https://d3r9rhourdc02u.cloudfront.net/assets/radio/airdelhi01/air001_Auto.m3u8"
  }
];
