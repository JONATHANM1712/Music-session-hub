
/* ==================================================
   MUSIC SESSION HUB
   CENTRAL SPOTIFY PLAN CONFIGURATION

   These switches control website features.
   They do not verify Spotify subscriptions.
   ================================================== */

window.MUSIC_SESSION_PLAN = Object.freeze({

  // false = Spotify Free
  // true  = Spotify Premium
  SPOTIFY_PREMIUM: false,

  // false = General Premium
  // true  = Premium + Platinum
  // Only active when SPOTIFY_PREMIUM is true.
  PLATINUM: false

});
