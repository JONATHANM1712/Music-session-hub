
/* ==================================================
   MUSIC SESSION HUB
   SPOTIFY PREMIUM GAME ACCESS
   ================================================== */

window.addEventListener("DOMContentLoaded", () => {

  const isPremium =
    window.MUSIC_SESSION_PLAN?.SPOTIFY_PREMIUM === true;

  const gameContent =
    document.getElementById("game-content");

  const premiumRequired =
    document.getElementById("premium-required");

  const gameScriptPath =
    document.getElementById("game-script-path");

  /* ==================================================
     APPLY PLAN-SPECIFIC BACKGROUND
     ================================================== */

  document.body.classList.toggle(
    "premium-access",
    isPremium
  );

  document.body.classList.toggle(
    "free-access",
    !isPremium
  );

  /* ==================================================
     SHOW THE CORRECT PAGE CONTENT
     ================================================== */

  if (gameContent) {
    gameContent.hidden = !isPremium;
  }

  if (premiumRequired) {
    premiumRequired.hidden = isPremium;
  }

  /* ==================================================
     STOP GAME LOADING FOR FREE USERS
     ================================================== */

  if (!isPremium) {
    return;
  }

  /* ==================================================
     LOAD THE GAME ENGINE FOR PREMIUM
     ================================================== */

  if (!gameScriptPath) {
    console.error(
      "Game script path was not found."
    );

    return;
  }

  let scriptPath;

  try {
    scriptPath = JSON.parse(
      gameScriptPath.textContent
    );
  } catch (error) {
    console.error(
      "Invalid game script path.",
      error
    );

    return;
  }

  const gameScript = document.createElement("script");

  gameScript.src = scriptPath;

  gameScript.onerror = () => {
    console.error(
      "Unable to load game script:",
      scriptPath
    );
  };

  document.body.appendChild(gameScript);

});
