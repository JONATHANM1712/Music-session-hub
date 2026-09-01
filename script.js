/* ==================================================
   PAGE STORAGE KEY
   ================================================== */

function pageKey() {

  return (
    "musicSessionChartFlow_" +
    (
      document.body.dataset.page ||
      "default"
    )
  );
}


/* ==================================================
   ACTIVE RESOURCE STORAGE KEY
   ================================================== */

function activeResourceKey() {

  return (
    "musicSessionActiveResource"
  );
}


/* ==================================================
   SAVE
   ================================================== */

function saveAll() {

  const data =
    {};


  document
    .querySelectorAll(
      "[data-save]"
    )
    .forEach(
      element => {

        if (
          element.id
        ) {

          data[
            element.id
          ] =
            element.value;
        }
      }
    );


  localStorage.setItem(

    pageKey(),

    JSON.stringify(
      data
    )

  );
}


/* ==================================================
   LOAD
   ================================================== */

function loadAll() {

  const saved =
    localStorage.getItem(
      pageKey()
    );


  if (
    saved
  ) {

    try {

      const data =
        JSON.parse(
          saved
        );


      Object
        .keys(
          data
        )
        .forEach(
          id => {

            const element =
              document.getElementById(
                id
              );


            if (
              element
            ) {

              element.value =
                data[
                  id
                ];
            }
          }
        );

    } catch (
      error
    ) {

      console.error(
        "Unable to load saved Music Session data:",
        error
      );
    }
  }


  applyColors();
}


/* ==================================================
   APPLY COLORS
   ================================================== */

function applyColors() {

  document
    .querySelectorAll(
      "[data-color-target]"
    )
    .forEach(
      picker => {

        const targetId =
          picker.dataset.colorTarget;


        const target =
          document.getElementById(
            targetId
          );


        if (
          target
        ) {

          target.style.backgroundColor =
            picker.value;
        }
      }
    );
}


/* ==================================================
   RESET
   ================================================== */

function resetPage() {

  const confirmDelete =
    confirm(
      "Hapus semua data di halaman ini?"
    );


  if (
    !confirmDelete
  ) {

    return;
  }


  localStorage.removeItem(
    pageKey()
  );


  document
    .querySelectorAll(
      "[data-save]"
    )
    .forEach(
      element => {

        if (
          element.type !==
          "color"
        ) {

          element.value =
            "";
        }
      }
    );


  saveAll();


  location.reload();
}


/* ==================================================
   ACTIVE RESOURCE
   ================================================== */

function setActiveResource(
  card,
  shouldScroll = true
) {

  const resourceCards =
    document.querySelectorAll(
      ".resource-card"
    );


  const viewerTitle =
    document.getElementById(
      "viewer-title"
    );


  const viewerType =
    document.getElementById(
      "viewer-type"
    );


  const viewerDescription =
    document.getElementById(
      "viewer-description"
    );


  const viewerIcon =
    document.getElementById(
      "viewer-icon"
    );


  const resourceFrame =
    document.getElementById(
      "resource-frame"
    );


  const frameContainer =
    document.getElementById(
      "resource-frame-container"
    );


  const openButton =
    document.getElementById(
      "viewer-open-button"
    );


  const viewerSection =
    document.getElementById(
      "resource-viewer"
    );


  if (
    !card ||
    !viewerTitle ||
    !viewerType ||
    !viewerDescription ||
    !viewerIcon ||
    !resourceFrame ||
    !frameContainer ||
    !openButton
  ) {

    return;
  }


  const title =
    card.dataset.resourceTitle ||
    "Music Session Resource";


  const type =
    card.dataset.resourceType ||
    "Resource";


  const description =
    card.dataset.resourceDescription ||
    "";


  const icon =
    card.dataset.resourceIcon ||
    "📄";


  const previewUrl =
    card.dataset.resourceUrl ||
    "";


  const newTabUrl =
    card.dataset.resourceNewTab ||
    previewUrl;


  resourceCards.forEach(
    resourceCard => {

      const isSelected =
        resourceCard ===
        card;


      resourceCard.classList.toggle(

        "is-active",

        isSelected

      );


      resourceCard.setAttribute(

        "aria-pressed",

        String(
          isSelected
        )

      );
    }
  );


  viewerTitle.textContent =
    title;


  viewerType.textContent =
    type;


  viewerDescription.textContent =
    description;


  viewerIcon.textContent =
    icon;


  resourceFrame.title =
    title +
    " read-only preview";


  openButton.href =
    newTabUrl;


  if (
    resourceFrame.src !==
    previewUrl
  ) {

    frameContainer.classList.add(
      "is-loading"
    );


    resourceFrame.src =
      previewUrl;
  }


  localStorage.setItem(

    activeResourceKey(),

    previewUrl

  );


  if (
    shouldScroll &&
    viewerSection
  ) {

    viewerSection.scrollIntoView({

      behavior:
        "smooth",

      block:
        "start"

    });
  }
}


/* ==================================================
   INITIALIZE RESOURCE CARDS
   ================================================== */

function initializeResourceCards() {

  const resourceCards =
    document.querySelectorAll(
      ".resource-card"
    );


  resourceCards.forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          setActiveResource(
            card,
            true
          );

        }
      );
    }
  );


  const savedResourceUrl =
    localStorage.getItem(
      activeResourceKey()
    );


  if (
    savedResourceUrl
  ) {

    const savedCard =
      Array
        .from(
          resourceCards
        )
        .find(
          card =>
            card.dataset.resourceUrl ===
            savedResourceUrl
        );


    if (
      savedCard
    ) {

      setActiveResource(
        savedCard,
        false
      );


      return;
    }
  }


  const firstCard =
    document.querySelector(
      ".resource-card"
    );


  if (
    firstCard
  ) {

    setActiveResource(
      firstCard,
      false
    );
  }
}


/* ==================================================
   VIEWER LOADING
   ================================================== */

function initializeViewerLoading() {

  const resourceFrame =
    document.getElementById(
      "resource-frame"
    );


  const frameContainer =
    document.getElementById(
      "resource-frame-container"
    );


  if (
    !resourceFrame ||
    !frameContainer
  ) {

    return;
  }


  frameContainer.classList.add(
    "is-loading"
  );


  resourceFrame.addEventListener(
    "load",
    () => {

      frameContainer.classList.remove(
        "is-loading"
      );

    }
  );
}


/* ==================================================
   VIEWER TOGGLE
   ================================================== */

function initializeViewerToggle() {

  const toggleButton =
    document.getElementById(
      "toggle-viewer-button"
    );


  const frameContainer =
    document.getElementById(
      "resource-frame-container"
    );


  const viewerCard =
    document.querySelector(
      ".viewer-card"
    );


  if (
    !toggleButton ||
    !frameContainer ||
    !viewerCard
  ) {

    return;
  }


  toggleButton.addEventListener(
    "click",
    () => {

      const isExpanded =
        toggleButton.getAttribute(
          "aria-expanded"
        ) ===
        "true";


      const nextExpandedState =
        !isExpanded;


      toggleButton.setAttribute(

        "aria-expanded",

        String(
          nextExpandedState
        )

      );


      toggleButton.textContent =

        nextExpandedState
          ? "Hide Preview"
          : "Show Preview";


      frameContainer.classList.toggle(

        "is-collapsed",

        !nextExpandedState

      );


      viewerCard.classList.toggle(

        "preview-collapsed",

        !nextExpandedState

      );

    }
  );
}


/* ==================================================
   SMOOTH SCROLLING
   ================================================== */

function initializeSmoothAnchorScrolling() {

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(
      link => {

        link.addEventListener(
          "click",
          event => {

            const targetId =
              link.getAttribute(
                "href"
              );


            if (
              !targetId ||
              targetId ===
              "#"
            ) {

              return;
            }


            const target =
              document.querySelector(
                targetId
              );


            if (
              !target
            ) {

              return;
            }


            event.preventDefault();


            target.scrollIntoView({

              behavior:
                "smooth",

              block:
                "start"

            });


            history.pushState(

              null,

              "",

              targetId

            );

          }
        );
      }
    );
}


/* ==================================================
   DASHBOARD CLOCK
   ================================================== */

function initializeDashboardClock() {

  const greeting =
    document.getElementById(
      "dashboardGreeting"
    );


  const time =
    document.getElementById(
      "dashboardTime"
    );


  const date =
    document.getElementById(
      "dashboardDate"
    );


  if (
    !greeting ||
    !time ||
    !date
  ) {

    return;
  }


  function updateDashboardClock() {

    const now =
      new Date();


    const hour =
      now.getHours();


    /* ==================================================
       GREETING
       ================================================== */

    if (
      hour >= 5 &&
      hour < 12
    ) {

      greeting.textContent =
        "Good Morning!";

    } else if (
      hour >= 12 &&
      hour < 18
    ) {

      greeting.textContent =
        "Good Afternoon!";

    } else {

      greeting.textContent =
        "Good Evening!";
    }


    /* ==================================================
       TIME
       ================================================== */

    time.textContent =
      now.toLocaleTimeString(
        "en-US",
        {

          hour:
            "2-digit",

          minute:
            "2-digit",

          second:
            "2-digit",

          hour12:
            true

        }
      );


    /* ==================================================
       DATE
       ================================================== */

    date.textContent =
      now.toLocaleDateString(
        "en-US",
        {

          weekday:
            "long",

          year:
            "numeric",

          month:
            "long",

          day:
            "numeric"

        }
      );
  }


  /*
    Display immediately.
  */

  updateDashboardClock();


  /*
    Update every second.
  */

  setInterval(

    updateDashboardClock,

    1000

  );
}


/* ==================================================
   DASHBOARD WEATHER CODE
   ================================================== */

function dashboardWeatherInfo(
  code,
  isDay
) {

  const night =
    Number(
      isDay
    ) === 0;


  const codes = {

    0: [
      "Clear sky",
      night
        ? "🌙"
        : "☀️"
    ],


    1: [
      "Mainly clear",
      night
        ? "🌙"
        : "🌤️"
    ],


    2: [
      "Partly cloudy",
      "⛅"
    ],


    3: [
      "Overcast",
      "☁️"
    ],


    45: [
      "Fog",
      "🌫️"
    ],


    48: [
      "Fog",
      "🌫️"
    ],


    51: [
      "Light drizzle",
      "🌦️"
    ],


    53: [
      "Drizzle",
      "🌦️"
    ],


    55: [
      "Heavy drizzle",
      "🌧️"
    ],


    61: [
      "Light rain",
      "🌦️"
    ],


    63: [
      "Rain",
      "🌧️"
    ],


    65: [
      "Heavy rain",
      "🌧️"
    ],


    71: [
      "Light snow",
      "🌨️"
    ],


    73: [
      "Snow",
      "🌨️"
    ],


    75: [
      "Heavy snow",
      "❄️"
    ],


    80: [
      "Rain showers",
      "🌦️"
    ],


    81: [
      "Rain showers",
      "🌧️"
    ],


    82: [
      "Heavy showers",
      "🌧️"
    ],


    85: [
      "Snow showers",
      "🌨️"
    ],


    86: [
      "Heavy snow showers",
      "❄️"
    ],


    95: [
      "Thunderstorm",
      "⛈️"
    ],


    96: [
      "Thunderstorm",
      "⛈️"
    ],


    99: [
      "Severe thunderstorm",
      "⛈️"
    ]
  };


  const result =
    codes[
      Number(
        code
      )
    ] ||
    [
      "Current weather",
      "🌡️"
    ];


  return {

    condition:
      result[0],

    icon:
      result[1]

  };
}


/* ==================================================
   LOAD DASHBOARD WEATHER
   ================================================== */

async function loadDashboardWeather(
  latitude,
  longitude
) {

  const temperature =
    document.getElementById(
      "dashboardWeatherTemperature"
    );


  const condition =
    document.getElementById(
      "dashboardWeatherCondition"
    );


  const icon =
    document.getElementById(
      "dashboardWeatherIcon"
    );


  if (
    !temperature ||
    !condition ||
    !icon
  ) {

    return;
  }


  const parameters =
    new URLSearchParams({

      latitude:
        latitude,

      longitude:
        longitude,

      current:
        [
          "temperature_2m",
          "weather_code",
          "is_day"
        ].join(","),

      timezone:
        "auto"

    });


  const url =

    "https://api.open-meteo.com/v1/forecast?" +

    parameters.toString();


  try {

    const response =
      await fetch(
        url
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Weather request failed."
      );
    }


    const data =
      await response.json();


    const current =
      data.current;


    if (
      !current
    ) {

      throw new Error(
        "No current weather data."
      );
    }


    const weather =
      dashboardWeatherInfo(

        current.weather_code,

        current.is_day

      );


    temperature.textContent =

      Math.round(
        current.temperature_2m
      ) +

      "°C";


    condition.textContent =

      weather.condition +

      " • Open detailed weather →";


    icon.textContent =
      weather.icon;

  } catch (
    error
  ) {

    console.error(
      "Dashboard weather error:",
      error
    );


    temperature.textContent =
      "--°C";


    condition.textContent =
      "Weather unavailable • Open details →";


    icon.textContent =
      "🌤️";
  }
}


/* ==================================================
   INITIALIZE DASHBOARD WEATHER
   ================================================== */

function initializeDashboardWeather() {

  const temperature =
    document.getElementById(
      "dashboardWeatherTemperature"
    );


  const condition =
    document.getElementById(
      "dashboardWeatherCondition"
    );


  const icon =
    document.getElementById(
      "dashboardWeatherIcon"
    );


  if (
    !temperature ||
    !condition ||
    !icon
  ) {

    return;
  }


  /*
    ==================================================
    LOCAL FILE MODE

    When opening index.html directly:

    file:///D:/...

    the clock works normally.

    Automatic browser geolocation may not work
    because file:// is not a normal secure website.

    GitHub Pages uses HTTPS.
    localhost is also suitable for development.
    ==================================================
  */

  if (
    window.location.protocol ===
    "file:"
  ) {

    temperature.textContent =
      "--°C";


    condition.textContent =
      "Open detailed weather • GitHub Pages / localhost →";


    icon.textContent =
      "🌤️";


    return;
  }


  /*
    ==================================================
    GEOLOCATION SUPPORT
    ==================================================
  */

  if (
    !navigator.geolocation
  ) {

    condition.textContent =
      "Location unavailable • Open details →";


    return;
  }


  condition.textContent =
    "Detecting weather...";


  /*
    ==================================================
    REQUEST LOCATION
    ==================================================
  */

  navigator.geolocation.getCurrentPosition(

    position => {

      loadDashboardWeather(

        position.coords.latitude,

        position.coords.longitude

      );

    },


    error => {

      console.warn(
        "Dashboard geolocation:",
        error
      );


      temperature.textContent =
        "--°C";


      condition.textContent =
        "Location unavailable • Open details →";


      icon.textContent =
        "🌤️";

    },


    {

      enableHighAccuracy:
        false,

      timeout:
        10000,

      maximumAge:
        600000

    }

  );
}


/* ==================================================
   PAGE LOAD
   ================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
      Existing Music Session functions.
    */

    loadAll();


    initializeViewerLoading();


    initializeResourceCards();


    initializeViewerToggle();


    initializeSmoothAnchorScrolling();


    /*
      New dashboard clock.

      This works offline and under file://.
    */

    initializeDashboardClock();


    /*
      New dashboard weather.

      Automatic location is intended for
      HTTPS GitHub Pages or localhost.
    */

    initializeDashboardWeather();


    /*
      Existing saved field listeners.
    */

    document
      .querySelectorAll(
        "[data-save]"
      )
      .forEach(
        element => {

          element.addEventListener(
            "input",
            () => {

              applyColors();

              saveAll();

            }
          );


          element.addEventListener(
            "change",
            () => {

              applyColors();

              saveAll();

            }
          );

        }
      );

  }
);
