
// =========================================================
// CURSOR SPOTLIGHT
// A soft flashlight glow that follows the pointer, like
// wandering a dark cinema hall. Only on real mouse devices.
// =========================================================

if (
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
) {

    document.addEventListener(
        "mousemove",
        function (event) {

            document.body.classList.add(
                "spotlight-active"
            );

            document.documentElement.style.setProperty(
                "--mx",
                event.clientX + "px"
            );

            document.documentElement.style.setProperty(
                "--my",
                event.clientY + "px"
            );

        }
    );

}


// =========================================================
// GLOBAL STATE
// =========================================================

let allGenres = [];

let discoverPage = 1;

let selectedDiscoverGenre = null;

let currentGroupMembers = [];

const recommendationQueues = {};

// Track Chart.js instance to destroy before re-rendering
let genreChartInstance = null;


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        fetchAvailableGenres();

        // Dynamically load Chart.js from CDN once
        const chartScript = document.createElement("script");
        chartScript.src =
            "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
        chartScript.defer = true;
        document.head.appendChild(chartScript);

    }
);


// =========================================================
// FETCH GENRES
// =========================================================

async function fetchAvailableGenres() {

    try {

        const response =
            await fetch("/genres");


        const data =
            await response.json();


        if (data.genres) {

            // EXACTLY 10 GENRES
            allGenres = [

                "Action",
                "Adventure",
                "Animation",
                "Comedy",
                "Crime",
                "Drama",
                "Fantasy",
                "Horror",
                "Romance",
                "Sci-Fi"

            ];


            renderDiscoverGenres();

        }

    }

    catch (error) {

        console.error(
            "Failed to load genres:",
            error
        );

    }

}


// =========================================================
// GENRE ICONS
// =========================================================

const genreIcons = {

    Action:
        "bi-lightning-charge-fill",

    Adventure:
        "bi-compass-fill",

    Animation:
        "bi-stars",

    Comedy:
        "bi-emoji-laughing-fill",

    Crime:
        "bi-search",

    Drama:
        "bi-mask",

    Fantasy:
        "bi-magic",

    Horror:
        "bi-emoji-dizzy-fill",

    Romance:
        "bi-heart-fill",

    "Sci-Fi":
        "bi-rocket-takeoff-fill"

};


// Helper to build the icon markup consistently
function genreIconMarkup(genre) {

    const iconClass =
        genreIcons[genre] ||
        "bi-film";

    return `<i class="bi ${iconClass} genre-icon"></i>`;

}


// =========================================================
// GENRE DESCRIPTIONS
// =========================================================

const genreDescriptions = {

    Action:
        "Fast-paced and thrilling",

    Adventure:
        "Exciting journeys and quests",

    Animation:
        "Animated worlds and stories",

    Comedy:
        "Light-hearted and funny",

    Crime:
        "Crime, mystery and suspense",

    Drama:
        "Emotional and character-driven",

    Fantasy:
        "Magic and imaginary worlds",

    Horror:
        "Dark and frightening stories",

    Romance:
        "Love and relationships",

    "Sci-Fi":
        "Science fiction and futuristic worlds"

};


// =========================================================
// NAVIGATION
// =========================================================

function showSection(sectionId) {

    document
        .querySelectorAll(".section")
        .forEach(
            function (section) {

                section.classList.remove(
                    "active"
                );

            }
        );


    const target =
        document.getElementById(
            sectionId
        );


    if (target) {

        target.classList.add(
            "active"
        );


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }

}


function goHome() {

    showSection(
        "home-section"
    );

}


function showIndividual() {

    showSection(
        "individual-choice-section"
    );

}


function showGroup() {

    showSection(
        "group-section"
    );


    if (
        currentGroupMembers.length === 0
    ) {

        addMember();

    }

}


function openFamiliar() {

    showSection(
        "familiar-section"
    );

}


function openDiscover() {

    showSection(
        "discover-section"
    );

}


// =========================================================
// RENDER DISCOVER GENRES
// =========================================================

function renderDiscoverGenres() {

    const grid1 =
        document.getElementById(
            "discover-grid-1"
        );


    const grid2 =
        document.getElementById(
            "discover-grid-2"
        );


    if (
        !grid1 ||
        !grid2
    ) {

        return;

    }


    grid1.innerHTML = "";

    grid2.innerHTML = "";


    // 5 GENRES ON PAGE 1
    // 5 GENRES ON PAGE 2

    const page1Genres =
        allGenres.slice(
            0,
            5
        );


    const page2Genres =
        allGenres.slice(
            5,
            10
        );


    page1Genres.forEach(
        function (genre) {

            grid1.appendChild(
                createGenreCard(
                    genre
                )
            );

        }
    );


    page2Genres.forEach(
        function (genre) {

            grid2.appendChild(
                createGenreCard(
                    genre
                )
            );

        }
    );


    updateDiscoverNavigation();

}


// =========================================================
// CREATE GENRE CARD
// =========================================================

function createGenreCard(genre) {

    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "visual-genre-card";


    if (
        selectedDiscoverGenre ===
        genre
    ) {

        button.classList.add(
            "selected"
        );

    }


    const description =
        genreDescriptions[genre] ||
        "Explore movies in this genre";


    button.innerHTML = `

        <div class="genre-visual">

            <div class="genre-visual-title">

                ${genreIconMarkup(genre)}
                ${escapeHTML(genre)}

            </div>

        </div>


        <div class="genre-card-content">

            <h3>

                ${escapeHTML(genre)}

            </h3>


            <p>

                ${escapeHTML(
                    description
                )}

            </p>

        </div>


        <div class="genre-selected-mark">

            ✓

        </div>

    `;


    button.addEventListener(
        "click",
        function () {

            document
                .querySelectorAll(
                    ".visual-genre-card"
                )
                .forEach(
                    function (card) {

                        card.classList.remove(
                            "selected"
                        );

                    }
                );


            selectedDiscoverGenre =
                genre;


            button.classList.add(
                "selected"
            );

        }
    );


    return button;

}


// =========================================================
// DISCOVER NEXT
// =========================================================

function nextDiscoverGenres() {

    if (
        discoverPage >= 2
    ) {

        return;

    }


    discoverPage = 2;


    document
        .getElementById(
            "discover-page-1"
        )
        .classList.remove(
            "active"
        );


    document
        .getElementById(
            "discover-page-2"
        )
        .classList.add(
            "active"
        );


    updateDiscoverNavigation();

}


// =========================================================
// DISCOVER PREVIOUS
// =========================================================

function previousDiscoverGenres() {

    if (
        discoverPage <= 1
    ) {

        return;

    }


    discoverPage = 1;


    document
        .getElementById(
            "discover-page-2"
        )
        .classList.remove(
            "active"
        );


    document
        .getElementById(
            "discover-page-1"
        )
        .classList.add(
            "active"
        );


    updateDiscoverNavigation();

}


// =========================================================
// DISCOVER NAVIGATION
// =========================================================

function updateDiscoverNavigation() {

    const indicator =
        document.getElementById(
            "discover-page-indicator"
        );


    const previous =
        document.getElementById(
            "discover-prev"
        );


    const next =
        document.getElementById(
            "discover-next"
        );


    if (!indicator) {

        return;

    }


    indicator.textContent =
        discoverPage + " / 2";


    if (previous) {

        previous.disabled =
            discoverPage === 1;

    }


    if (next) {

        next.disabled =
            discoverPage === 2;

    }

}


// =========================================================
// FAMILIAR RECOMMENDATIONS
// =========================================================

async function getFamiliarRecommendations() {

    const resultsContainer =
        document.getElementById(
            "familiar-results"
        );


    resultsContainer.innerHTML = `

        <div class="loading">

            Fetching your recommendations...

        </div>

    `;


    const genres = [

        "Action",
        "Drama",
        "Comedy"

    ];


    try {

        const response =
            await fetch(
                "/recommend",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            genres:
                                genres,

                            mode:
                                "familiar",

                            top_n:
                                20

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(

                data.error ||
                "Recommendation request failed."

            );

        }


        renderMovieCards(

            data.recommendations || [],

            resultsContainer,

            "familiar"

        );

    }


    catch (error) {

        console.error(
            error
        );


        resultsContainer.innerHTML = `

            <div class="error">

                Failed to fetch recommendations.

            </div>

        `;

    }

}
// =========================================================
// DISCOVER RECOMMENDATIONS
// =========================================================

async function getDiscoverRecommendations() {

    const resultsContainer =
        document.getElementById(
            "discover-results"
        );


    if (
        !selectedDiscoverGenre
    ) {

        alert(
            "Please select a genre first!"
        );

        return;

    }


    resultsContainer.innerHTML = `

        <div class="loading">

            Exploring new titles...

        </div>

    `;


    try {

        const response =
            await fetch(
                "/recommend",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            genres: [

                                selectedDiscoverGenre

                            ],

                            mode:
                                "discover",

                            discover_genre:
                                selectedDiscoverGenre,

                            top_n:
                                20

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(

                data.error ||
                "Recommendation request failed."

            );

        }


        renderMovieCards(

            data.recommendations || [],

            resultsContainer,

            "discover"

        );

    }


    catch (error) {

        console.error(
            error
        );


        resultsContainer.innerHTML = `

            <div class="error">

                Failed to fetch recommendations.

            </div>

        `;

    }

}


// =========================================================
// GROUP MODE
// =========================================================

function addMember() {

    const container =
        document.getElementById(
            "members-container"
        );


    if (!container) {

        return;

    }


    const memberId =
        Date.now() +
        Math.random();


    currentGroupMembers.push(
        memberId
    );


    const memberDiv =
        document.createElement(
            "div"
        );


    memberDiv.className =
        "member-card";


    memberDiv.id =
        `member-${memberId}`;


    const genreButtons =
        allGenres
            .map(
                function (genre) {

                    return `

                        <button
                            type="button"
                            class="group-genre-button"
                            data-genre="${escapeHTML(genre)}"
                            onclick="toggleGroupGenre(this)"
                        >

                            ${genreIconMarkup(genre)}
                            ${escapeHTML(genre)}

                        </button>

                    `;

                }
            )
            .join("");


    memberDiv.innerHTML = `

        <h3>

            Member ${currentGroupMembers.length}

        </h3>


        <input
            type="text"
            class="member-name"
            placeholder="Enter member name"
        >


        <p class="group-genre-label">

            Select genres:

        </p>


        <div class="group-genre-grid">

            ${genreButtons}

        </div>

    `;


    container.appendChild(
        memberDiv
    );

}


// =========================================================
// GROUP MODE - TOGGLE GENRE
// =========================================================

function toggleGroupGenre(button) {

    button.classList.toggle(
        "selected"
    );

}


// =========================================================
// GROUP RECOMMENDATIONS
// =========================================================

async function getGroupRecommendations() {

    const resultsContainer =
        document.getElementById(
            "group-results"
        );


    const memberCards =
        document.querySelectorAll(
            "#members-container .member-card"
        );


    if (
        memberCards.length === 0
    ) {

        alert(
            "Please add at least one member!"
        );

        return;

    }


    const allSelectedGenres = [];


    for (
        const card of memberCards
    ) {

        const nameInput =
            card.querySelector(
                ".member-name"
            );


        const name =
            nameInput
                ? nameInput.value.trim()
                : "";


        if (!name) {

            alert(
                "Please enter a name for every member."
            );

            return;

        }


        const selectedButtons =
            card.querySelectorAll(
                ".group-genre-button.selected"
            );


        if (
            selectedButtons.length === 0
        ) {

            alert(
                "Please select at least one genre for "
                + name
            );

            return;

        }


        selectedButtons.forEach(
            function (button) {

                const genre =
                    button.dataset.genre;


                if (
                    !allSelectedGenres.includes(
                        genre
                    )
                ) {

                    allSelectedGenres.push(
                        genre
                    );

                }

            }
        );

    }


    resultsContainer.innerHTML = `

        <div class="loading">

            Generating group recommendations...

        </div>

    `;


    try {

        const response =
            await fetch(
                "/recommend",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },


                    body: JSON.stringify({

                        genres:
                            allSelectedGenres,

                        mode:
                            "familiar",

                        top_n:
                            20

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(

                data.error ||
                "Recommendation request failed."

            );

        }


        renderMovieCards(

            data.recommendations || [],

            resultsContainer,

            "group"

        );

    }


    catch (error) {

        console.error(
            error
        );


        resultsContainer.innerHTML = `

            <div class="error">

                Failed to fetch group recommendations.

            </div>

        `;

    }

}


// =========================================================
// RENDER MOVIE CARDS — chart removed
// =========================================================

function renderGenreChart(
    movies,
    container
) {

    // Chart removed
    return;

}


// =========================================================
// DISABLED OLD CHART FUNCTION
// =========================================================

function renderGenreChart_disabled(
    movies,
    container
) {

    const genreCount = {};


    movies.forEach(
        function (movie) {

            if (!movie.genres) return;


            movie.genres
                .split("|")
                .forEach(
                    function (genre) {

                        genre = genre.trim();


                        if (genre) {

                            genreCount[genre] =
                                (genreCount[genre] || 0) + 1;

                        }

                    }
                );

        }
    );


    const sorted =
        Object.entries(
            genreCount
        )
        .sort(
            function (a, b) {

                return b[1] - a[1];

            }
        );


    const labels =
        sorted.map(
            function (e) {

                return e[0];

            }
        );


    const values =
        sorted.map(
            function (e) {

                return e[1];

            }
        );


    const maxVal =
        Math.max(...values);


    const backgroundColors =
        values.map(
            function (v) {

                const opacity =
                    0.35 +
                    0.65 *
                    (v / maxVal);


                return `rgba(212, 162, 95, ${opacity.toFixed(2)})`;

            }
        );


    const borderColors =
        values.map(
            function (v) {

                const opacity =
                    0.5 +
                    0.5 *
                    (v / maxVal);


                return `rgba(240, 201, 136, ${opacity.toFixed(2)})`;

            }
        );


    const chartWrapper =
        document.createElement(
            "div"
        );


    chartWrapper.className =
        "genre-chart-wrapper";


    chartWrapper.innerHTML = `

        <p class="genre-chart-title">

            Genre Distribution in Recommendations

        </p>


        <canvas id="genreDistributionChart"></canvas>

    `;


    container.appendChild(
        chartWrapper
    );


    if (genreChartInstance) {

        genreChartInstance.destroy();

        genreChartInstance = null;

    }


    const canvas =
        document.getElementById(
            "genreDistributionChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    genreChartInstance =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels:
                        labels,

                    datasets: [

                        {

                            data:
                                values,

                            backgroundColor:
                                backgroundColors,

                            borderColor:
                                borderColors,

                            borderWidth:
                                1,

                            borderRadius:
                                6,

                            borderSkipped:
                                false

                        }

                    ]

                },


                options: {

                    indexAxis:
                        "y",

                    responsive:
                        true,

                    animation: {

                        duration:
                            600,

                        easing:
                            "easeOutQuart"

                    },


                    plugins: {

                        legend: {

                            display:
                                false

                        },


                        tooltip: {

                            backgroundColor:
                                "rgba(24, 16, 26, 0.95)",

                            borderColor:
                                "rgba(212, 162, 95, 0.4)",

                            borderWidth:
                                1,

                            titleColor:
                                "#f0c988",

                            bodyColor:
                                "#ab9fa8",

                            titleFont: {

                                family:
                                    "'IBM Plex Mono', monospace",

                                size:
                                    12,

                                weight:
                                    "600"

                            },


                            bodyFont: {

                                family:
                                    "'Inter', sans-serif",

                                size:
                                    13

                            },


                            padding:
                                12,


                            callbacks: {

                                title:
                                    function (ctx) {

                                        return ctx[0].label;

                                    },


                                label:
                                    function (ctx) {

                                        return (
                                            "  " +
                                            ctx.raw +
                                            " movie" +
                                            (
                                                ctx.raw === 1
                                                    ? ""
                                                    : "s"
                                            )
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        x: {

                            beginAtZero:
                                true,

                            ticks: {

                                stepSize:
                                    1,

                                color:
                                    "#75677a",

                                font: {

                                    family:
                                        "'IBM Plex Mono', monospace",

                                    size:
                                        11

                                }

                            },


                            grid: {

                                color:
                                    "rgba(255, 255, 255, 0.04)",

                                drawBorder:
                                    false

                            },


                            border: {

                                display:
                                    false

                            }

                        },


                        y: {

                            ticks: {

                                color:
                                    "#ab9fa8",

                                font: {

                                    family:
                                        "'Inter', sans-serif",

                                    size:
                                        13,

                                    weight:
                                        "500"

                                },

                                padding:
                                    8

                            },


                            grid: {

                                display:
                                    false

                            },


                            border: {

                                display:
                                    false

                            }

                        }

                    }

                }

            }
        );

}
// =========================================================
// RENDER MOVIE CARDS
// =========================================================

function renderMovieCards(
    movies,
    container,
    mode
) {

    container.innerHTML = "";


    if (
        !movies ||
        movies.length === 0
    ) {

        container.innerHTML = `

            <div class="no-results">

                No recommendations found.

            </div>

        `;

        return;

    }


    const queueId =
        container.id;


    recommendationQueues[
        queueId
    ] = {

        movies:
            movies,

        allMovies:
            movies,

        currentPage:
            0,

        mode:
            mode

    };


    renderRecommendationPage(
        queueId
    );

}


// =========================================================
// MINIMUM RATING FILTER
// =========================================================

function applyRatingFilter(mode) {

    let containerId;
    let filterId;


    if (
        mode === "familiar"
    ) {

        containerId =
            "familiar-results";

        filterId =
            "familiar-rating-filter";

    }

    else if (
        mode === "discover"
    ) {

        containerId =
            "discover-results";

        filterId =
            "discover-rating-filter";

    }

    else if (
        mode === "group"
    ) {

        containerId =
            "group-results";

        filterId =
            "group-rating-filter";

    }

    else {

        return;

    }


    const queue =
        recommendationQueues[
            containerId
        ];


    const filter =
        document.getElementById(
            filterId
        );


    if (
        !queue ||
        !filter
    ) {

        return;

    }


    const minimumRating =
        Number(
            filter.value
        );


    const originalMovies =
        queue.allMovies || [];


    queue.movies =
        minimumRating === 0

            ? originalMovies

            : originalMovies.filter(
                function (movie) {

                    const rating =
                        Number(
                            movie.tmdb_rating
                        );


                    return (

                        !Number.isNaN(
                            rating
                        ) &&

                        rating >=
                            minimumRating

                    );

                }
            );


    queue.currentPage =
        0;


    renderRecommendationPage(
        containerId
    );

}


// =========================================================
// RENDER ONE PAGE = 4 MOVIES
// =========================================================

function renderRecommendationPage(
    containerId
) {

    const queue =
        recommendationQueues[
            containerId
        ];


    const container =
        document.getElementById(
            containerId
        );


    if (
        !queue ||
        !container
    ) {

        return;

    }


    const existingGrid =
        container.querySelector(
            ".movie-results-grid"
        );


    const existingNav =
        container.querySelector(
            ".recommendation-navigation"
        );


    if (existingGrid) {

        existingGrid.remove();

    }


    if (existingNav) {

        existingNav.remove();

    }


    const start =
        queue.currentPage *
        4;


    const end =
        start + 4;


    const pageMovies =
        queue.movies.slice(
            start,
            end
        );


    const grid =
        document.createElement(
            "div"
        );


    grid.className =
        "movie-results-grid";


    pageMovies.forEach(
        function (movie) {

            grid.appendChild(

                createMovieCard(
                    movie,
                    queue.mode
                )

            );

        }
    );


    container.appendChild(
        grid
    );


    const totalPages =
        Math.ceil(
            queue.movies.length / 4
        );


    if (
        totalPages > 1
    ) {

        const navigation =
            document.createElement(
                "div"
            );


        navigation.className =
            "recommendation-navigation";


        const previous =
            document.createElement(
                "button"
            );


        previous.type =
            "button";


        previous.className =
            "recommendation-nav-button";


        previous.textContent =
            "← Previous 4";


        previous.disabled =
            queue.currentPage === 0;


        previous.addEventListener(
            "click",
            function () {

                previousRecommendationPage(
                    containerId
                );

            }
        );


        const pageInfo =
            document.createElement(
                "span"
            );


        pageInfo.className =
            "recommendation-page-info";


        pageInfo.innerHTML = `

            Showing
            ${start + 1}–${Math.min(
                end,
                queue.movies.length
            )}
            of
            ${queue.movies.length}

            <br>

            ${queue.currentPage + 1}
            /
            ${totalPages}

        `;


        const next =
            document.createElement(
                "button"
            );


        next.type =
            "button";


        next.className =
            "recommendation-nav-button";


        next.textContent =
            "Next 4 →";


        next.disabled =
            queue.currentPage >=
            totalPages - 1;


        next.addEventListener(
            "click",
            function () {

                nextRecommendationPage(
                    containerId
                );

            }
        );


        navigation.appendChild(
            previous
        );


        navigation.appendChild(
            pageInfo
        );


        navigation.appendChild(
            next
        );


        container.appendChild(
            navigation
        );

    }

}


// =========================================================
// NEXT 4
// =========================================================

function nextRecommendationPage(
    containerId
) {

    const queue =
        recommendationQueues[
            containerId
        ];


    if (!queue) {

        return;

    }


    const totalPages =
        Math.ceil(
            queue.movies.length / 4
        );


    if (
        queue.currentPage <
        totalPages - 1
    ) {

        queue.currentPage++;


        renderRecommendationPage(
            containerId
        );

    }

}


// =========================================================
// PREVIOUS 4
// =========================================================

function previousRecommendationPage(
    containerId
) {

    const queue =
        recommendationQueues[
            containerId
        ];


    if (!queue) {

        return;

    }


    if (
        queue.currentPage > 0
    ) {

        queue.currentPage--;


        renderRecommendationPage(
            containerId
        );

    }

}


// =========================================================
// CREATE MOVIE CARD
// =========================================================

function createMovieCard(
    movie,
    mode
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "movie-card";


    const score =
        movie.match_score !== undefined &&
        movie.match_score !== null

            ? Math.round(
                Number(
                    movie.match_score
                ) * 100
            )

            : 0;


    const hasPoster =
        movie.poster &&
        movie.poster !== "None" &&
        movie.poster !== "null";


    let posterHTML;


    if (hasPoster) {

        posterHTML = `

            <div class="movie-poster-wrapper">

                <img
                    src="${escapeAttribute(
                        movie.poster
                    )}"
                    alt="${escapeAttribute(
                        movie.title ||
                        "Movie"
                    )}"
                    class="movie-poster"
                >

                <div
                    class="movie-poster-placeholder"
                >

                    <span>🎬</span>

                </div>

            </div>

        `;

    }


    else {

        posterHTML = `

            <div
                class="movie-poster-wrapper"
            >

                <div
                    class="movie-poster-placeholder visible"
                >

                    <span>🎬</span>

                </div>

            </div>

        `;

    }


    const rating =

        movie.tmdb_rating !== null &&
        movie.tmdb_rating !== undefined &&
        movie.tmdb_rating !== ""

            ? `TMDB ${movie.tmdb_rating}/10`

            : "Rating unavailable";


    card.innerHTML = `

        ${posterHTML}


        <div class="movie-card-content">

            <h3>

                ${escapeHTML(
                    movie.title ||
                    "Movie"
                )}

            </h3>


            <div class="match-score">

                ${score}% Match

            </div>


            <div class="movie-tmdb-rating">

                ${escapeHTML(
                    rating
                )}

            </div>


            <p class="movie-genres">

                ${escapeHTML(
                    movie.genres || ""
                )}

            </p>


            <div class="movie-card-actions">

                <button
                    type="button"
                    class="movie-action-button like-button"
                    title="Like this movie"
                >

                    <i class="bi bi-hand-thumbs-up-fill"></i>
                    Like

                </button>


                <button
                    type="button"
                    class="movie-action-button dislike-button"
                    title="Dislike this movie"
                >

                    <i class="bi bi-hand-thumbs-down-fill"></i>
                    Dislike

                </button>

            </div>


            <p class="movie-card-click">

                Click to view details →

            </p>

        </div>

    `;


    // =====================================================
    // POSTER FALLBACK
    // =====================================================

    const poster =
        card.querySelector(
            ".movie-poster"
        );


    if (poster) {

        poster.addEventListener(
            "error",
            function () {

                poster.style.display =
                    "none";


                const placeholder =
                    card.querySelector(
                        ".movie-poster-placeholder"
                    );


                if (placeholder) {

                    placeholder.classList.add(
                        "visible"
                    );

                }

            }
        );

    }


    // =====================================================
    // LIKE
    // =====================================================

    const likeButton =
        card.querySelector(
            ".like-button"
        );


    if (likeButton) {

        likeButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                likeMovie(
                    movie,
                    likeButton
                );

            }
        );

    }


    // =====================================================
    // DISLIKE
    // =====================================================

    const dislikeButton =
        card.querySelector(
            ".dislike-button"
        );


    if (dislikeButton) {

        dislikeButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                dislikeMovie(
                    movie,
                    dislikeButton
                );

            }
        );

    }


    // =====================================================
    // OPEN MOVIE DETAILS
    // =====================================================

    card.addEventListener(
        "click",
        function () {

            openMovieModal(
                movie,
                mode
            );

        }
    );


    return card;

}
// =========================================================
// MOVIE DETAILS MODAL
// =========================================================

function openMovieModal(
    movie,
    mode
) {
    window.currentMovieMode = mode;

    const modal =
        document.getElementById(
            "movie-modal"
        );


    if (!modal) {

        return;

    }


    const poster =
        document.getElementById(
            "movie-detail-poster"
        );


    const title =
        document.getElementById(
            "movie-detail-title"
        );


    const meta =
        document.getElementById(
            "movie-detail-meta"
        );


    const overview =
        document.getElementById(
            "movie-detail-overview"
        );


    const reason =
        document.getElementById(
            "movie-detail-reason"
        );


    const tmdbButton =
        document.getElementById(
            "movie-detail-tmdb"
        );


    // =====================================================
    // POSTER
    // =====================================================

    if (poster) {

        if (
            movie.poster &&
            movie.poster !== "None" &&
            movie.poster !== "null"
        ) {

            poster.style.display =
                "block";


            poster.src =
                movie.poster;

        }

        else {

            poster.removeAttribute(
                "src"
            );


            poster.style.display =
                "none";

        }

    }


    // =====================================================
    // TITLE
    // =====================================================

    if (title) {

        title.textContent =
            movie.title ||
            "Movie";

    }


    // =====================================================
    // META
    // =====================================================

    if (meta) {

        const parts = [];


        if (movie.release_date) {

            parts.push(
                movie.release_date
            );

        }


        if (movie.genres) {

            parts.push(
                movie.genres
            );

        }


        if (
            movie.tmdb_rating !== null &&
            movie.tmdb_rating !== undefined &&
            movie.tmdb_rating !== ""
        ) {

            parts.push(
                `TMDB ${movie.tmdb_rating}/10`
            );

        }


        meta.textContent =
            parts.join(
                " • "
            );

    }


    // =====================================================
    // STORY / OVERVIEW
    // =====================================================

    if (overview) {

        overview.textContent =
            movie.overview ||
            "Movie description unavailable.";

    }


    // =====================================================
    // WHY THIS WAS RECOMMENDED
    // =====================================================

    if (reason) {

        if (
            movie.explanation &&
            String(
                movie.explanation
            ).trim()
        ) {

            reason.textContent =
                movie.explanation;

        }

        else {

            const matchedGenres =
                Array.isArray(
                    movie.matched_genres
                )
                    ? movie.matched_genres
                    : [];


            if (
                matchedGenres.length > 0
            ) {

                reason.textContent =

                    `It matches your preferred genre${
                        matchedGenres.length > 1
                            ? "s"
                            : ""
                    }: ${
                        matchedGenres.join(
                            ", "
                        )
                    }.`;

            }

            else {

                reason.textContent =

                    `Selected because it aligns with your selected genres (${
                        movie.genres ||
                        "your preferences"
                    }).`;

            }

        }

    }


    // =====================================================
    // WHERE TO WATCH / STREAMING
    // =====================================================

    const streamingContainer =
        document.getElementById(
            "movie-detail-streaming"
        );


    const streamingNote =
        document.getElementById(
            "movie-detail-streaming-note"
        );


    if (streamingContainer) {

        streamingContainer.innerHTML =
            "";


        const providers =

            Array.isArray(
                movie.streaming_providers
            )

                ? movie.streaming_providers

                : [];


        if (
            providers.length > 0
        ) {

            providers.forEach(
                function (provider) {

                    const providerItem =
                        document.createElement(
                            "div"
                        );


                    providerItem.className =
                        "streaming-provider";


                    if (
                        provider.logo
                    ) {

                        const logo =
                            document.createElement(
                                "img"
                            );


                        logo.src =
                            provider.logo;


                        logo.alt =
                            provider.name ||
                            "Streaming provider";


                        logo.className =
                            "streaming-provider-logo";


                        providerItem.appendChild(
                            logo
                        );

                    }


                    const providerName =
                        document.createElement(
                            "span"
                        );


                    providerName.textContent =
                        provider.name ||
                        "Streaming platform";


                    providerItem.appendChild(
                        providerName
                    );


                    streamingContainer.appendChild(
                        providerItem
                    );

                }
            );


            if (streamingNote) {

                streamingNote.textContent =
                    "Availability shown for India. Streaming availability may change.";

            }

        }

        else {

            const noProvider =
                document.createElement(
                    "p"
                );


            noProvider.className =
                "streaming-no-results";


            noProvider.textContent =
                "No subscription streaming provider was found for this movie in India.";


            streamingContainer.appendChild(
                noProvider
            );


            if (streamingNote) {

                streamingNote.textContent =
                    "Streaming availability is supplied through TMDB and may vary over time.";

            }

        }

    }


    // =====================================================
    // TMDB LINK
    // =====================================================

    if (tmdbButton) {

        if (
            movie.tmdb_url
        ) {

            tmdbButton.href =
                movie.tmdb_url;


            tmdbButton.style.display =
                "inline-block";

        }

        else {

            tmdbButton.href =
                "#";


            tmdbButton.style.display =
                "none";

        }

    }


    // =====================================================
    // SHOW MODAL
    // =====================================================

    modal.classList.add(
        "active"
    );

}


// =========================================================
// CLOSE MOVIE MODAL
// =========================================================

function closeMovieModal() {

    const modal =
        document.getElementById(
            "movie-modal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


// =========================================================
// CLOSE MODAL ON OUTSIDE CLICK
// =========================================================

document.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "movie-modal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeMovieModal();

        }

    }
);


// =========================================================
// ESC KEY
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            closeMovieModal();

        }

    }
);


// =========================================================
// AUTH STATE
// =========================================================

let currentUser =
    null;


// =========================================================
// CHECK CURRENT LOGIN
// =========================================================

async function checkLogin() {

    try {

        const response =
            await fetch(
                "/me"
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.logged_in
        ) {

            currentUser =
                data.user;

        }

        else {

            currentUser =
                null;

        }


        updateAuthUI();

    }

    catch (error) {

        console.error(
            "Login check failed:",
            error
        );

    }

}


// =========================================================
// UPDATE AUTH UI
// =========================================================

function updateAuthUI() {

    const loginButton =
        document.getElementById(
            "login-button"
        );


    const accountBar =
        document.getElementById(
            "user-account-bar"
        );


    const userName =
        document.getElementById(
            "logged-user-name"
        );


    if (
        currentUser
    ) {

        if (loginButton) {

            loginButton.style.display =
                "none";

        }


        if (accountBar) {

            accountBar.style.display =
                "flex";

        }


        if (userName) {

            userName.textContent =
                currentUser.name ||
                currentUser.email ||
                "User";

        }

    }

    else {

        if (loginButton) {

            loginButton.style.display =
                "inline-flex";

        }


        if (accountBar) {

            accountBar.style.display =
                "none";

        }

    }

}


// =========================================================
// OPEN LOGIN MODAL
// =========================================================

function openLogin() {

    const modal =
        document.getElementById(
            "auth-modal"
        );


    const loginForm =
        document.getElementById(
            "login-form"
        );


    const signupForm =
        document.getElementById(
            "signup-form"
        );


    if (modal) {

        modal.classList.add(
            "active"
        );

    }


    if (loginForm) {

        loginForm.style.display =
            "block";

    }


    if (signupForm) {

        signupForm.style.display =
            "none";

    }

}


// =========================================================
// OPEN SIGNUP
// =========================================================

function openSignup() {

    const modal =
        document.getElementById(
            "auth-modal"
        );


    const loginForm =
        document.getElementById(
            "login-form"
        );


    const signupForm =
        document.getElementById(
            "signup-form"
        );


    if (modal) {

        modal.classList.add(
            "active"
        );

    }


    if (loginForm) {

        loginForm.style.display =
            "none";

    }


    if (signupForm) {

        signupForm.style.display =
            "block";

    }

}


// =========================================================
// CLOSE AUTH MODAL
// =========================================================

function closeAuthModal() {

    const modal =
        document.getElementById(
            "auth-modal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


// =========================================================
// LOGIN USER
// =========================================================

async function loginUser(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const emailInput =
        document.getElementById(
            "login-email"
        );


    const passwordInput =
        document.getElementById(
            "login-password"
        );


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    if (
        !email ||
        !password
    ) {

        alert(
            "Please enter your email and password."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/login",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            email:
                                email,

                            password:
                                password

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Login failed."
            );

            return;

        }


        currentUser =
            data.user ||
            null;


        updateAuthUI();

        closeAuthModal();


        if (emailInput) {

            emailInput.value =
                "";

        }


        if (passwordInput) {

            passwordInput.value =
                "";

        }


        alert(
            "Login successful!"
        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "Unable to login. Please try again."
        );

    }

}


// =========================================================
// SIGNUP USER
// =========================================================

async function signupUser(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const nameInput =
        document.getElementById(
            "signup-name"
        );


    const emailInput =
        document.getElementById(
            "signup-email"
        );


    const passwordInput =
        document.getElementById(
            "signup-password"
        );


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    if (
        !name ||
        !email ||
        !password
    ) {

        alert(
            "Please fill in all fields."
        );

        return;

    }


    if (
        password.length < 6
    ) {

        alert(
            "Password must contain at least 6 characters."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/signup",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            name:
                                name,

                            email:
                                email,

                            password:
                                password

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Signup failed."
            );

            return;

        }


        currentUser =
            data.user ||
            null;


        updateAuthUI();

        closeAuthModal();


        if (nameInput) {

            nameInput.value =
                "";

        }


        if (emailInput) {

            emailInput.value =
                "";

        }


        if (passwordInput) {

            passwordInput.value =
                "";

        }


        alert(
            "Account created successfully!"
        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "Unable to create account. Please try again."
        );

    }

}


// =========================================================
// LOGOUT
// =========================================================

async function logoutUser() {

    try {

        const response =
            await fetch(
                "/logout",
                {

                    method:
                        "POST"

                }
            );


        if (
            response.ok
        ) {

            currentUser =
                null;


            updateAuthUI();


            alert(
                "You have been logged out."
            );

        }

    }

    catch (error) {

        console.error(
            error
        );

    }

}


// =========================================================
// INITIAL AUTH CHECK
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        checkLogin();

    }
);
// =========================================================
// LIKE MOVIE
// =========================================================

async function likeMovie(
    movie,
    button
) {

    if (!currentUser) {

        alert(
            "Please login first to like a movie."
        );

        openLogin();

        return;

    }


    try {

        const response =
            await fetch(
                "/feedback",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({
    movie_id: movie.movieId || movie.movie_id,
    movie_title: movie.title || "",
    poster: movie.poster || movie.poster_path || "",
    tmdb_rating: movie.tmdb_rating || movie.rating || "",
    overview: movie.overview || "",
    feedback: "like"
})

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Could not save your like."
            );

            return;

        }


        if (button) {

            button.classList.add(
                "active"
            );


            button.innerHTML = `

                <i class="bi bi-hand-thumbs-up-fill"></i>
                Liked

            `;

        }


        const card =
            button
                ? button.closest(
                    ".movie-card"
                )
                : null;


        if (card) {

            const dislikeButton =
                card.querySelector(
                    ".dislike-button"
                );


            if (dislikeButton) {

                dislikeButton.classList.remove(
                    "active"
                );


                dislikeButton.innerHTML = `

                    <i class="bi bi-hand-thumbs-down-fill"></i>
                    Dislike

                `;

            }

        }

    }

    catch (error) {

        console.error(
            "Like error:",
            error
        );


        alert(
            "Unable to save your like."
        );

    }

}


// =========================================================
// DISLIKE MOVIE
// =========================================================

async function dislikeMovie(
    movie,
    button
) {

    if (!currentUser) {

        alert(
            "Please login first to dislike a movie."
        );

        openLogin();

        return;

    }


    try {

        const response =
            await fetch(
                "/feedback",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            movie_id:
                                movie.movieId ||
                                movie.movie_id,

                            title:
                                movie.title ||
                                "",

                            feedback:
                                "dislike"

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Could not save your dislike."
            );

            return;

        }


        if (button) {

            button.classList.add(
                "active"
            );


            button.innerHTML = `

                <i class="bi bi-hand-thumbs-down-fill"></i>
                Disliked

            `;

        }


        const card =
            button
                ? button.closest(
                    ".movie-card"
                )
                : null;


        if (card) {

            const likeButton =
                card.querySelector(
                    ".like-button"
                );


            if (likeButton) {

                likeButton.classList.remove(
                    "active"
                );


                likeButton.innerHTML = `

                    <i class="bi bi-hand-thumbs-up-fill"></i>
                    Like

                `;

            }

        }

    }

    catch (error) {

        console.error(
            "Dislike error:",
            error
        );


        alert(
            "Unable to save your dislike."
        );

    }

}


// =========================================================
// AUTH MODAL OUTSIDE CLICK
// =========================================================

document.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "auth-modal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeAuthModal();

        }

    }
);


// =========================================================
// AUTH MODAL ESCAPE
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            const authModal =
                document.getElementById(
                    "auth-modal"
                );


            if (
                authModal &&
                authModal.classList.contains(
                    "active"
                )
            ) {

                closeAuthModal();

            }

        }

    }
);


// =========================================================
// SWITCH LOGIN / SIGNUP
// =========================================================

function showLoginForm() {

    const loginForm =
        document.getElementById(
            "login-form"
        );


    const signupForm =
        document.getElementById(
            "signup-form"
        );


    if (loginForm) {

        loginForm.style.display =
            "block";

    }


    if (signupForm) {

        signupForm.style.display =
            "none";

    }

}


function showSignupForm() {

    const loginForm =
        document.getElementById(
            "login-form"
        );


    const signupForm =
        document.getElementById(
            "signup-form"
        );


    if (loginForm) {

        loginForm.style.display =
            "none";

    }


    if (signupForm) {

        signupForm.style.display =
            "block";

    }

}


// =========================================================
// ENTER KEY SUPPORT FOR AUTH FORMS
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !== "Enter"
        ) {

            return;

        }


        const activeElement =
            document.activeElement;


        if (
            !activeElement
        ) {

            return;

        }


        const loginForm =
            activeElement.closest(
                "#login-form"
            );


        const signupForm =
            activeElement.closest(
                "#signup-form"
            );


        if (loginForm) {

            loginUser(
                event
            );

        }


        else if (signupForm) {

            signupUser(
                event
            );

        }

    }
);


// =========================================================
// PREVENT AUTH FORM CLICK FROM CLOSING MODAL
// =========================================================

document.addEventListener(
    "click",
    function (event) {

        const loginForm =
            document.getElementById(
                "login-form"
            );


        const signupForm =
            document.getElementById(
                "signup-form"
            );


        if (
            loginForm &&
            loginForm.contains(
                event.target
            )
        ) {

            event.stopPropagation();

        }


        if (
            signupForm &&
            signupForm.contains(
                event.target
            )
        ) {

            event.stopPropagation();

        }

    },
    true
);


// =========================================================
// LOAD USER FEEDBACK
// =========================================================

async function loadUserFeedback() {

    if (!currentUser) {

        return;

    }


    try {

        const response =
            await fetch(
                "/feedback"
            );


        if (
            !response.ok
        ) {

            return;

        }


        const data =
            await response.json();


        const feedback =
            data.feedback || [];


        feedback.forEach(
            function (item) {

                const movieId =
                    String(
                        item.movie_id
                    );


                document
                    .querySelectorAll(
                        ".movie-card"
                    )
                    .forEach(
                        function (card) {

                            const likeButton =
                                card.querySelector(
                                    ".like-button"
                                );


                            const dislikeButton =
                                card.querySelector(
                                    ".dislike-button"
                                );


                            if (
                                likeButton
                            ) {

                                likeButton.dataset.movieId =
                                    movieId;

                            }


                            if (
                                dislikeButton
                            ) {

                                dislikeButton.dataset.movieId =
                                    movieId;

                            }

                        }
                    );

            }
        );

    }

    catch (error) {

        console.error(
            "Could not load feedback:",
            error
        );

    }

}


// =========================================================
// REFRESH FEEDBACK AFTER LOGIN
// =========================================================

const originalUpdateAuthUI =
    updateAuthUI;


updateAuthUI =
    function () {

        originalUpdateAuthUI();


        if (currentUser) {

            loadUserFeedback();

        }

    };


// =========================================================
// PASSWORD VISIBILITY
// =========================================================

function togglePassword(
    inputId,
    button
) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) {

        return;

    }


    if (
        input.type ===
        "password"
    ) {

        input.type =
            "text";


        if (button) {

            button.innerHTML =
                `<i class="bi bi-eye-slash-fill"></i>`;

        }

    }

    else {

        input.type =
            "password";


        if (button) {

            button.innerHTML =
                `<i class="bi bi-eye-fill"></i>`;

        }

    }

}


// =========================================================
// VALIDATE EMAIL
// =========================================================

function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            email
        );

}


// =========================================================
// AUTH INPUT VALIDATION
// =========================================================

function validateLoginInputs() {

    const emailInput =
        document.getElementById(
            "login-email"
        );


    const passwordInput =
        document.getElementById(
            "login-password"
        );


    if (
        !emailInput ||
        !passwordInput
    ) {

        return false;

    }


    const email =
        emailInput.value.trim();


    const password =
        passwordInput.value;


    if (!isValidEmail(email)) {

        alert(
            "Please enter a valid email address."
        );

        emailInput.focus();

        return false;

    }


    if (!password) {

        alert(
            "Please enter your password."
        );

        passwordInput.focus();

        return false;

    }


    return true;

}


function validateSignupInputs() {

    const nameInput =
        document.getElementById(
            "signup-name"
        );


    const emailInput =
        document.getElementById(
            "signup-email"
        );


    const passwordInput =
        document.getElementById(
            "signup-password"
        );


    if (
        !nameInput ||
        !emailInput ||
        !passwordInput
    ) {

        return false;

    }


    const name =
        nameInput.value.trim();


    const email =
        emailInput.value.trim();


    const password =
        passwordInput.value;


    if (!name) {

        alert(
            "Please enter your name."
        );

        nameInput.focus();

        return false;

    }


    if (!isValidEmail(email)) {

        alert(
            "Please enter a valid email address."
        );

        emailInput.focus();

        return false;

    }


    if (
        password.length < 6
    ) {

        alert(
            "Password must contain at least 6 characters."
        );

        passwordInput.focus();

        return false;

    }


    return true;

}
// =========================================================
// FINAL AUTH INITIALIZATION
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Make sure login state is checked
        checkLogin();

    }
);


// =========================================================
// AUTH BUTTON HELPERS
// =========================================================

function openLoginModal() {

    openLogin();

}


function openSignupModal() {

    openSignup();

}


// =========================================================
// CLOSE AUTH MODAL WITH CLOSE BUTTON
// =========================================================

document.addEventListener(
    "click",
    function (event) {

        if (
            event.target.closest(
                ".auth-modal-close"
            )
        ) {

            closeAuthModal();

        }

    }
);


// =========================================================
// LOGOUT CONFIRMATION
// =========================================================

async function confirmLogout() {

    const confirmed =
        window.confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmed) {

        return;

    }


    await logoutUser();

}


// =========================================================
// SAFE MOVIE ID
// =========================================================

function getMovieId(
    movie
) {

    if (!movie) {

        return null;

    }


    if (
        movie.movieId !== undefined &&
        movie.movieId !== null
    ) {

        return movie.movieId;

    }


    if (
        movie.movie_id !== undefined &&
        movie.movie_id !== null
    ) {

        return movie.movie_id;

    }


    if (
        movie.id !== undefined &&
        movie.id !== null
    ) {

        return movie.id;

    }


    return null;

}


// =========================================================
// SAFE MOVIE TITLE
// =========================================================

function getMovieTitle(
    movie
) {

    if (
        movie &&
        movie.title
    ) {

        return movie.title;

    }


    return "Movie";

}


// =========================================================
// FEEDBACK BUTTON STATE
// =========================================================

function setFeedbackButtonState(
    button,
    state
) {

    if (!button) {

        return;

    }


    button.classList.remove(
        "active"
    );


    if (
        state === "like"
    ) {

        button.classList.add(
            "active"
        );


        button.innerHTML = `

            <i class="bi bi-hand-thumbs-up-fill"></i>
            Liked

        `;

    }


    else if (
        state === "dislike"
    ) {

        button.classList.add(
            "active"
        );


        button.innerHTML = `

            <i class="bi bi-hand-thumbs-down-fill"></i>
            Disliked

        `;

    }

}


// =========================================================
// SHOW FEEDBACK MESSAGE
// =========================================================

function showFeedbackMessage(
    message
) {

    let messageBox =
        document.getElementById(
            "feedback-message"
        );


    if (!messageBox) {

        messageBox =
            document.createElement(
                "div"
            );


        messageBox.id =
            "feedback-message";


        document.body.appendChild(
            messageBox
        );

    }


    messageBox.textContent =
        message;


    messageBox.classList.add(
        "visible"
    );


    setTimeout(
        function () {

            messageBox.classList.remove(
                "visible"
            );

        },
        2200
    );

}


// =========================================================
// IMPROVED LIKE HANDLER
// =========================================================

const originalLikeMovie =
    likeMovie;


likeMovie =
    async function (
        movie,
        button
    ) {

        if (!currentUser) {

            showFeedbackMessage(
                "Please login first."
            );


            openLogin();

            return;

        }


        await originalLikeMovie(
            movie,
            button
        );


        if (button) {

            setFeedbackButtonState(
                button,
                "like"
            );

        }


        

    };


// =========================================================
// IMPROVED DISLIKE HANDLER
// =========================================================

const originalDislikeMovie =
    dislikeMovie;


dislikeMovie =
    async function (
        movie,
        button
    ) {

        if (!currentUser) {

            showFeedbackMessage(
                "Please login first."
            );


            openLogin();

            return;

        }


        await originalDislikeMovie(
            movie,
            button
        );


        if (button) {

            setFeedbackButtonState(
                button,
                "dislike"
            );

        }


        showFeedbackMessage(
            `"${getMovieTitle(movie)}" disliked`
        );

    };


// =========================================================
// AUTH MODAL KEYBOARD ACCESSIBILITY
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !== "Escape"
        ) {

            return;

        }


        const authModal =
            document.getElementById(
                "auth-modal"
            );


        if (
            authModal &&
            authModal.classList.contains(
                "active"
            )
        ) {

            closeAuthModal();

        }

    }
);


// =========================================================
// MOVIE CARD ACCESSIBILITY
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !== "Enter" &&
            event.key !== " "
        ) {

            return;

        }


        const card =
            event.target.closest(
                ".movie-card"
            );


        if (
            !card
        ) {

            return;

        }


        if (
            event.target.closest(
                "button"
            )
        ) {

            return;

        }


        event.preventDefault();

        card.click();

    }
);


// =========================================================
// INITIAL PAGE STATE
// =========================================================

window.addEventListener(
    "load",
    function () {

        updateAuthUI();

    }
);


// =========================================================
// FINAL SAFETY CHECK
// =========================================================

console.log(
    "Movie Recommendation System loaded successfully."
);
// =========================================================
// LOGIN / SIGNUP FORM SWITCHING
// =========================================================

function showSignupForm() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (loginForm) {
        loginForm.style.display = "none";
    }

    if (signupForm) {
        signupForm.style.display = "block";
    }
}

function showLoginForm() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (signupForm) {
        signupForm.style.display = "none";
    }

    if (loginForm) {
        loginForm.style.display = "block";
    }
}
// =========================================================
// WATCH NOW + PENDING WATCH + WATCHLIST INTEGRATION
// =========================================================

(function () {

    "use strict";

    // -----------------------------------------------------
    // Small helper
    // -----------------------------------------------------

    function watchNowMovieId(movie) {

        return String(
            movie.movieId ||
            movie.movie_id ||
            ""
        );
    }


    function watchNowTmdbId(movie) {

        return String(
            movie.tmdb_id ||
            movie.tmdbId ||
            ""
        );
    }


    // -----------------------------------------------------
    // WATCH NOW CLICK
    // -----------------------------------------------------

    window.startWatchNow = async function (
        movie,
        providerUrl
    ) {

        if (!providerUrl) {
            return;
        }


        if (!currentUser) {

            alert(
                "Please login first to use Watch Now."
            );

            if (typeof openLogin === "function") {
                openLogin();
            }

            return;
        }


        const movieId =
            watchNowMovieId(movie);


        if (!movieId) {

            console.error(
                "Watch Now: movie ID missing.",
                movie
            );

            window.open(
                providerUrl,
                "_blank",
                "noopener,noreferrer"
            );

            return;
        }


        try {

            const response =
                await fetch(
                    "/watch-started",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            movie_id:
                                movieId,

                            movie_title:
                                movie.title ||
                                "Movie",

                            tmdb_id:
                                watchNowTmdbId(
                                    movie
                                ),

                            poster:
                                movie.poster ||
                                "",

                            tmdb_rating:
                                movie.tmdb_rating ??
                                "",

                            overview:
                                movie.overview ||
                                ""
                        })
                    }
                );


            if (!response.ok) {

                console.warn(
                    "Could not save Watch Now event."
                );

            }

        }

        catch (error) {

            console.error(
                "Watch Now tracking error:",
                error
            );

        }
// Feedback popup is ONLY for Familiar mode
// Show feedback popup after Watch Now in all modes
sessionStorage.setItem(
    "show_movie_feedback_after_watch",
    "true"
);

        // Open provider after tracking request
        window.open(
            providerUrl,
            "_blank",
            "noopener,noreferrer"
        );

    };


    // -----------------------------------------------------
    // PROVIDER TYPE LABEL
    // -----------------------------------------------------

    function providerTypeLabel(type) {

        const value =
            String(
                type || ""
            ).toLowerCase();


        if (
            value.includes("sub")
        ) {

            return "Subscription";

        }


        if (
            value.includes("free")
        ) {

            return "Free";

        }


        if (
            value.includes("rent")
        ) {

            return "Rent";

        }


        if (
            value.includes("buy")
        ) {

            return "Buy";

        }


        return type
            ? String(type)
            : "Watch";

    }


    // -----------------------------------------------------
    // LOAD WATCHMODE SOURCES
    // -----------------------------------------------------

    async function loadWatchNowSources(
        movie
    ) {

        const container =
            document.getElementById(
                "movie-detail-streaming"
            );


        const note =
            document.getElementById(
                "movie-detail-streaming-note"
            );


        if (!container) {
            return;
        }


        const tmdbId =
            watchNowTmdbId(movie);


        if (!tmdbId) {

            container.innerHTML = `

                <p class="streaming-no-results">

                    Streaming links unavailable
                    for this movie.

                </p>

            `;

            return;

        }


        // Show loading state
        container.innerHTML = `

            <div class="streaming-loading">

                Finding where to watch...

            </div>

        `;


        if (note) {

            note.textContent =
                "Checking streaming availability in India...";

        }


        try {

            const response =
                await fetch(
                    `/streaming/${encodeURIComponent(
                        tmdbId
                    )}`
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Streaming lookup failed."
                );

            }


            const providers =
                Array.isArray(
                    data.providers
                )
                    ? data.providers
                    : [];


            container.innerHTML = "";


            // -------------------------------------------------
            // NO PROVIDERS
            // -------------------------------------------------

            if (
                providers.length === 0
            ) {

                container.innerHTML = `

                    <p class="streaming-no-results">

                        No direct streaming link
                        was found for this movie
                        in India.

                    </p>

                `;


                if (note) {

                    note.textContent =
                        data.attribution ||
                        "Streaming availability may change over time.";

                }


                return;

            }


            // -------------------------------------------------
            // PROVIDER BUTTONS
            // -------------------------------------------------

            providers.forEach(
                function (provider) {

                    if (
                        !provider ||
                        !provider.web_url
                    ) {

                        return;

                    }


                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "watch-provider-item";


                    const info =
                        document.createElement(
                            "div"
                        );


                    info.className =
                        "watch-provider-info";


                    const name =
                        document.createElement(
                            "strong"
                        );


                    name.textContent =
                        provider.name ||
                        "Streaming Provider";


                    const type =
                        document.createElement(
                            "span"
                        );


                    type.textContent =
                        providerTypeLabel(
                            provider.type
                        );


                    type.className =
                        "watch-provider-type";


                    info.appendChild(
                        name
                    );


                    info.appendChild(
                        type
                    );


                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "watch-now-button";


                    button.innerHTML = `

                        <i class="bi bi-play-fill"></i>
                        Watch Now

                    `;


                    button.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();

                            event.stopPropagation();


                            window.startWatchNow(
                                movie,
                                provider.web_url
                            );

                        }
                    );


                    item.appendChild(
                        info
                    );


                    item.appendChild(
                        button
                    );


                    container.appendChild(
                        item
                    );

                }
            );


            if (note) {

                note.textContent =
                    data.attribution ||
                    "Streaming availability data provided by Watchmode.";

            }

        }

        catch (error) {

            console.error(
                "Watchmode lookup error:",
                error
            );


            container.innerHTML = `

                <p class="streaming-no-results">

                    Unable to load direct
                    streaming links right now.

                </p>

            `;


            if (note) {

                note.textContent =
                    "Please try again later.";

            }

        }

    }


    // -----------------------------------------------------
    // DETECT MOVIE MODAL OPENING
    // -----------------------------------------------------

    function setupMovieModalWatcher() {

        const modal =
            document.getElementById(
                "movie-modal"
            );


        if (!modal) {
            return;
        }


        let lastMovieKey =
            null;


        const observer =
            new MutationObserver(
                function () {

                    if (
                        !modal.classList.contains(
                            "active"
                        )
                    ) {

                        return;

                    }


                    const titleElement =
                        document.getElementById(
                            "movie-detail-title"
                        );


                    const title =
                        titleElement
                            ? titleElement.textContent.trim()
                            : "";


                    const movieKey =
                        title;


                    if (
                        movieKey &&
                        movieKey !== lastMovieKey
                    ) {

                        lastMovieKey =
                            movieKey;


                        // Find movie object from
                        // the currently visible card.
                        const movie =
                            findCurrentMovie(
                                title
                            );


                        if (movie) {

                            loadWatchNowSources(
                                movie
                            );

                        }

                    }

                }
            );


        observer.observe(
            modal,
            {
                attributes: true,
                attributeFilter: [
                    "class"
                ]
            }
        );


        // Reset when modal closes
        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    lastMovieKey =
                        null;

                }

            }
        );

    }


    // -----------------------------------------------------
    // FIND CURRENT MOVIE
    // -----------------------------------------------------

    function findCurrentMovie(
        title
    ) {

        for (
            const queueId in
            recommendationQueues
        ) {

            const queue =
                recommendationQueues[
                    queueId
                ];


            if (
                !queue ||
                !Array.isArray(
                    queue.allMovies
                )
            ) {

                continue;

            }


            const movie =
                queue.allMovies.find(
                    function (item) {

                        return (
                            String(
                                item.title ||
                                ""
                            ).trim() ===
                            title
                        );

                    }
                );


            if (movie) {

                return movie;

            }

        }


        return null;

    }


    // -----------------------------------------------------
    // PENDING WATCH REMINDER
    // -----------------------------------------------------

    async function loadPendingWatchReminder() {
        
    const shouldShow =
        sessionStorage.getItem(
            "show_movie_feedback_after_watch"
        );

    if (shouldShow !== "true") {
        return;
    }

    if (!currentUser) return;

    // baaki existing code...
        if (!currentUser) {
            return;
        }


        try {

            const response =
                await fetch(
                    "/pending-watch"
                );


            if (!response.ok) {
                return;
            }


            const data =
                await response.json();


            if (
                !data.pending
            ) {

                return;

            }


            showMovieFeedbackPrompt(
    data.pending
);

        }

        catch (error) {

            console.error(
                "Pending watch error:",
                error
            );

        }

    }


    // -----------------------------------------------------
    // CREATE PENDING REMINDER
    // -----------------------------------------------------

    // -----------------------------------------------------
// MOVIE FEEDBACK AFTER WATCH
// Familiar mode only
// -----------------------------------------------------

function showMovieFeedbackPrompt(movie) {

    // Don't show duplicate popup
    if (
        document.getElementById(
            "movie-feedback-prompt"
        )
    ) {
        return;
    }

    const overlay =
        document.createElement("div");

    overlay.id =
        "movie-feedback-prompt";

    overlay.className =
        "pending-watch-overlay";

    const poster =
        movie.poster
            ? `
                <img
                    src="${escapeAttribute(
                        movie.poster
                    )}"
                    alt="${escapeAttribute(
                        movie.movie_title ||
                        "Movie"
                    )}"
                    class="pending-watch-poster"
                >
              `
            : `
                <div class="pending-watch-poster-placeholder">
                    🎬
                </div>
              `;

    const rating =
        movie.tmdb_rating
            ? `TMDB ${escapeHTML(
                movie.tmdb_rating
            )}/10`
            : "Rating unavailable";

    overlay.innerHTML = `
        <div
            class="pending-watch-card"
            role="dialog"
            aria-modal="true"
        >

            <button
                type="button"
                class="pending-watch-close"
                id="movie-feedback-close"
                aria-label="Close"
            >
                ×
            </button>

            <div class="pending-watch-content">

                ${poster}

                <div class="pending-watch-info">

                    <div class="pending-watch-label">
                        MOVIE FEEDBACK
                    </div>

                    <h2>
                        Did you like the movie?
                    </h2>

                    <h3>
                        ${escapeHTML(
                            movie.movie_title ||
                            "Movie"
                        )}
                    </h3>

                    <div class="pending-watch-rating">
                        ${rating}
                    </div>

                    <div class="pending-watch-actions">

                        <button
                            type="button"
                            id="movie-feedback-like"
                            class="pending-watch-add"
                        >
                            👍 Like
                        </button>

                        <button
                            type="button"
                            id="movie-feedback-dislike"
                            class="pending-watch-dismiss"
                        >
                            👎 Dislike
                        </button>

                        <button
                            type="button"
                            id="movie-feedback-watchlist"
                            class="pending-watch-add"
                        >
                            ✓ Add to Watchlist
                        </button>

                    </div>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);


    // -------------------------------------------------
    // LIKE
    // -------------------------------------------------

    const likeButton =
        document.getElementById(
            "movie-feedback-like"
        );

    if (likeButton) {

        likeButton.addEventListener(
            "click",
            async function () {

                const movieData = {
                    movieId:
                        movie.movie_id ||
                        movie.movieId,

                    title:
                        movie.movie_title ||
                        "Movie"
                };

                await likeMovie(
                    movieData,
                    likeButton
                );

                sessionStorage.removeItem(
                    "show_movie_feedback_after_watch"
                );

                await dismissPendingWatch();
            }
        );
    }


    // -------------------------------------------------
    // DISLIKE
    // -------------------------------------------------

    const dislikeButton =
        document.getElementById(
            "movie-feedback-dislike"
        );

    if (dislikeButton) {

        dislikeButton.addEventListener(
            "click",
            async function () {

                const movieData = {
                    movieId:
                        movie.movie_id ||
                        movie.movieId,

                    title:
                        movie.movie_title ||
                        "Movie"
                };

                await dislikeMovie(
                    movieData,
                    dislikeButton
                );

                sessionStorage.removeItem(
                    "show_movie_feedback_after_watch"
                );

                await dismissPendingWatch();
            }
        );
    }


    // -------------------------------------------------
    // ADD TO WATCHLIST
    // -------------------------------------------------

    const watchlistButton =
        document.getElementById(
            "movie-feedback-watchlist"
        );

    if (watchlistButton) {

        watchlistButton.addEventListener(
            "click",
            async function () {

                watchlistButton.disabled =
                    true;

                watchlistButton.textContent =
                    "Adding...";

                try {

                    const response =
                        await fetch(
                            "/watchlist",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        movie_id:
                                            movie.movie_id ||
                                            movie.movieId,

                                        movie_title:
                                            movie.movie_title ||
                                            "Movie",

                                        tmdb_id:
                                            movie.tmdb_id ||
                                            "",

                                        poster:
                                            movie.poster ||
                                            "",

                                        tmdb_rating:
                                            movie.tmdb_rating ||
                                            "",

                                        overview:
                                            movie.overview ||
                                            ""
                                    })
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            "Could not add movie."
                        );
                    }


                    sessionStorage.removeItem(
                        "show_movie_feedback_after_watch"
                    );

                    await dismissPendingWatch();

                    alert(
                        "Movie added to your Watchlist ✓"
                    );

                }
                catch (error) {

                    console.error(
                        "Watchlist error:",
                        error
                    );

                    watchlistButton.disabled =
                        false;

                    watchlistButton.textContent =
                        "✓ Add to Watchlist";

                    alert(
                        "Could not add movie to Watchlist."
                    );
                }
            }
        );
    }


    // -------------------------------------------------
    // X = DISMISS
    // -------------------------------------------------

    const closeButton =
        document.getElementById(
            "movie-feedback-close"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            async function () {

                sessionStorage.removeItem(
                    "show_movie_feedback_after_watch"
                );

                await dismissPendingWatch();
            }
        );
    }

}
async function dismissPendingWatch() {
        try {

            await fetch(
                "/pending-watch/dismiss",
                {
                    method: "POST"
                }
            );

        }

        catch (error) {

            console.error(
                "Dismiss error:",
                error
            );

        }


        closePendingReminder();

    }


    // -----------------------------------------------------
    // CLOSE REMINDER
    // -----------------------------------------------------

    function closePendingReminder(){
    const reminder =
        document.getElementById(
            "movie-feedback-prompt"
        );

    if (reminder) {
        reminder.remove();
    }
}
        

    // -----------------------------------------------------
    // ESCAPE HELPERS
    // -----------------------------------------------------

    function escapeHTMLLocal(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    // Use existing global helper if available
    function escapeHTML(
        value
    ) {

        if (
            typeof window.escapeHTML ===
            "function"
        ) {

            return window.escapeHTML(
                value
            );

        }


        return escapeHTMLLocal(
            value
        );

    }


    function escapeAttribute(
        value
    ) {

        if (
            typeof window.escapeAttribute ===
            "function"
        ) {

            return window.escapeAttribute(
                value
            );

        }


        return escapeHTMLLocal(
            value
        );

    }


    // -----------------------------------------------------
    // INITIALIZE
    // -----------------------------------------------------

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            // Wait because the original page
            // also initializes the application.
            setTimeout(
                function () {

                    setupMovieModalWatcher();

                    if (
                        currentUser
                    ) {

                        // loadPendingWatchReminder();

                    }

                },
                500
            );

        }
    );


    // -----------------------------------------------------
    // ALSO CHECK AFTER LOGIN
    // -----------------------------------------------------

    // The existing login function changes
    // currentUser. We watch for that change
    // without modifying the original login code.

    let previousUserState =
        null;


    setInterval(
        function () {

            const loggedIn =
                !!currentUser;


            if (
                loggedIn &&
                !previousUserState
            ) {

                setTimeout(
                    loadPendingWatchReminder,
                    400
                );

            }


            previousUserState =
                loggedIn;

        },
        1000
    );


})();
// =========================================================
// AUTH LANDING PAGE CONTROL
// =========================================================
// Keeps the login/signup page separate from the main app.
// Existing login/signup backend functions remain unchanged.
// =========================================================


function showAuthLanding() {

    const landing =
        document.getElementById("auth-landing");

    const app =
        document.querySelector("main");

    const header =
        document.querySelector("header");

    const footer =
        document.querySelector("footer");


    if (landing) {

        landing.style.display = "flex";

    }


    /*
     * Hide the main application while the user
     * is not logged in.
     */

    if (app) {

        app.style.display = "none";

    }

    if (header) {

        header.style.display = "none";

    }

    if (footer) {

        footer.style.display = "none";

    }


    /*
     * Make sure login form is shown first.
     */

    const loginForm =
        document.getElementById("login-form");

    const signupForm =
        document.getElementById("signup-form");


    if (loginForm) {

        loginForm.style.display = "block";

    }


    if (signupForm) {

        signupForm.style.display = "none";

    }

}


function hideAuthLanding() {

    const landing =
        document.getElementById("auth-landing");

    const app =
        document.querySelector("main");

    const header =
        document.querySelector("header");

    const footer =
        document.querySelector("footer");


    if (landing) {

        landing.style.display = "none";

    }


    /*
     * Show the main application after login.
     */

    if (app) {

        app.style.display = "";

    }

    if (header) {

        header.style.display = "";

    }

    if (footer) {

        footer.style.display = "";

    }

}


/* =========================================================
   LANDING PAGE LOGIN / SIGNUP SWITCH
   ========================================================= */


function showLoginForm() {

    const loginForm =
        document.getElementById("login-form");

    const signupForm =
        document.getElementById("signup-form");


    if (loginForm) {

        loginForm.style.display = "block";

    }


    if (signupForm) {

        signupForm.style.display = "none";

    }

}


function openSignup() {

    const loginForm =
        document.getElementById("login-form");

    const signupForm =
        document.getElementById("signup-form");


    if (loginForm) {

        loginForm.style.display = "none";

    }


    if (signupForm) {

        signupForm.style.display = "block";

    }

}


/*
 * Keep old openLogin() compatible with the new
 * landing page.
 */

function openLogin() {

    /*
     * If the new landing page exists,
     * use it instead of the old modal.
     */

    const landing =
        document.getElementById("auth-landing");


    if (landing) {

        showAuthLanding();

        return;

    }


    /*
     * Fallback for old modal behaviour.
     */

    const modal =
        document.getElementById("auth-modal");

    const loginForm =
        document.getElementById("login-form");

    const signupForm =
        document.getElementById("signup-form");


    if (modal) {

        modal.classList.add("active");

    }


    if (loginForm) {

        loginForm.style.display = "block";

    }


    if (signupForm) {

        signupForm.style.display = "none";

    }

}


/* =========================================================
   UPDATE AUTH UI
   ========================================================= */


function updateAuthUI() {

    const loginButton =
        document.getElementById("login-button");

    const accountBar =
        document.getElementById("user-account-bar");

    const userName =
        document.getElementById("logged-user-name");


    if (currentUser) {

        /*
         * USER IS LOGGED IN
         */

        if (loginButton) {

            loginButton.style.display = "none";

        }


        if (accountBar) {

            accountBar.style.display = "flex";

        }


        if (userName) {

            userName.textContent =
                currentUser.name ||
                currentUser.email ||
                "User";

        }


        hideAuthLanding();

    }


    else {

        /*
         * USER IS NOT LOGGED IN
         */

        if (loginButton) {

            loginButton.style.display =
                "inline-flex";

        }


        if (accountBar) {

            accountBar.style.display = "none";

        }


        showAuthLanding();

    }

}


/* =========================================================
   LOGIN SUCCESS HANDLER
   ========================================================= */


async function handleLandingLogin(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const emailInput =
        document.getElementById("login-email");

    const passwordInput =
        document.getElementById("login-password");


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    const message =
        document.getElementById("login-message");


    if (!email || !password) {

        if (message) {

            message.textContent =
                "Please enter your email and password.";

        }

        return;

    }


    try {

        const response =
            await fetch(
                "/login",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            email: email,

                            password: password

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            if (message) {

                message.textContent =
                    data.error ||
                    "Login failed.";

            }

            return;

        }


        /*
         * Save logged-in user.
         */

        currentUser =
            data.user || null;


        /*
         * Update entire application UI.
         */

        updateAuthUI();


        /*
         * Clear form.
         */

        if (emailInput) {

            emailInput.value = "";

        }


        if (passwordInput) {

            passwordInput.value = "";

        }


        if (message) {

            message.textContent = "";

        }


        /*
         * Give pending-watch system a chance
         * to load after login.
         */

        setTimeout(
            function () {

                if (
                    typeof loadPendingWatchReminder ===
                    "function"
                ) {

                    loadPendingWatchReminder();

                }

            },
            300
        );


        alert("Login successful!");

    }


    catch (error) {

        console.error(
            "Landing login error:",
            error
        );


        if (message) {

            message.textContent =
                "Unable to login. Please try again.";

        }

    }

}


/* =========================================================
   SIGNUP SUCCESS HANDLER
   ========================================================= */


async function handleLandingSignup(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const nameInput =
        document.getElementById("signup-name");

    const emailInput =
        document.getElementById("signup-email");

    const passwordInput =
        document.getElementById("signup-password");


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    const message =
        document.getElementById("signup-message");


    if (!name || !email || !password) {

        if (message) {

            message.textContent =
                "Please fill in all fields.";

        }

        return;

    }


    if (password.length < 6) {

        if (message) {

            message.textContent =
                "Password must contain at least 6 characters.";

        }

        return;

    }


    try {

        const response =
            await fetch(
                "/signup",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            name: name,

                            email: email,

                            password: password

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            if (message) {

                message.textContent =
                    data.error ||
                    "Signup failed.";

            }

            return;

        }


        /*
         * Signup automatically logs the user in
         * if backend returns the user object.
         */

        currentUser =
            data.user || null;


        updateAuthUI();


        /*
         * Clear form.
         */

        if (nameInput) {

            nameInput.value = "";

        }


        if (emailInput) {

            emailInput.value = "";

        }


        if (passwordInput) {

            passwordInput.value = "";

        }


        if (message) {

            message.textContent = "";

        }


        setTimeout(
            function () {

                if (
                    typeof loadPendingWatchReminder ===
                    "function"
                ) {

                    loadPendingWatchReminder();

                }

            },
            300
        );


        alert(
            "Account created successfully!"
        );

    }


    catch (error) {

        console.error(
            "Landing signup error:",
            error
        );


        if (message) {

            message.textContent =
                "Unable to create account. Please try again.";

        }

    }

}


/* =========================================================
   REPLACE FORM SUBMIT HANDLERS
   ========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const loginForm =
            document.getElementById("login-form");


        const signupForm =
            document.getElementById("signup-form");


        /*
         * Prevent old inline loginUser()
         * from being used.
         */

        if (loginForm) {

            const form =
                loginForm.querySelector("form");


            if (form) {

                form.onsubmit =
                    handleLandingLogin;

            }

        }


        /*
         * Prevent old inline signupUser()
         * from being used.
         */

        if (signupForm) {

            const form =
                signupForm.querySelector("form");


            if (form) {

                form.onsubmit =
                    handleLandingSignup;

            }

        }


        /*
         * Existing checkLogin() will determine
         * whether landing page should be visible.
         */

        setTimeout(
            function () {

                if (typeof checkLogin === "function") {

                    checkLogin();

                }
                else {

                    showAuthLanding();

                }

            },
            100
        );

    }
);


/* =========================================================
   LOGOUT WRAPPER
   =========================================================
   Existing logoutUser() can be overwritten safely here.
   ========================================================= */


async function performLogout() {

    try {

        const response =
            await fetch(
                "/logout",
                {

                    method: "POST"

                }
            );


        if (response.ok) {

            currentUser = null;

            updateAuthUI();

            /*
             * Start from login screen.
             */

            showAuthLanding();

            showLoginForm();


            alert(
                "You have been logged out."
            );

        }

    }


    catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

}


/* =========================================================
   INITIAL LANDING STATE
   ========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
         * Initially hide app until /me confirms
         * whether the user is logged in.
         */

        const landing =
            document.getElementById("auth-landing");

        const app =
            document.querySelector("main");


        if (landing) {

            landing.style.display = "flex";

        }


        if (app) {

            app.style.display = "none";

        }

    }
);
// =========================================================
// FINAL LOGIN / SIGNUP BUTTON FIX
// =========================================================

window.showSignupForm = function () {

    const loginForm =
        document.getElementById("login-form");

    const signupForm =
        document.getElementById("signup-form");

    if (loginForm) {
        loginForm.style.display = "none";
    }

    if (signupForm) {
        signupForm.style.display = "block";
    }

};


// =========================================================
// FINAL LOGIN BUTTON FIX
// =========================================================

window.showLoginForm = function () {

    const loginForm =
        document.getElementById("login-form");

    const signupForm =
        document.getElementById("signup-form");

    if (signupForm) {
        signupForm.style.display = "none";
    }

    if (loginForm) {
        loginForm.style.display = "block";
    }

};


// =========================================================
// OPEN SIGNUP COMPATIBILITY
// =========================================================

window.openSignup = function () {

    window.showSignupForm();

};
// =========================================================
// ABSOLUTE FINAL LANDING SIGNUP FIX
// =========================================================

window.openSignup = function () {

    console.log("SIGN UP CLICKED");

    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (!loginForm || !signupForm) {
        console.error("Login/Signup form not found.");
        return;
    }

    loginForm.style.display = "none";
    signupForm.style.display = "block";

    console.log("SIGNUP FORM OPENED");
};


// Also force the actual landing-page button
document.addEventListener("click", function (event) {

    const button = event.target.closest("button");

    if (!button) return;

    if (button.textContent.trim() === "Sign Up") {

        event.preventDefault();
        event.stopPropagation();

        window.openSignup();
    }

}, true);
// =========================================================
// FAMILIAR MODE - WATCHLIST FUNCTIONS
// =========================================================

let familiarWatchlist = [];


/*
 * Load the logged-in user's Watchlist.
 * This is used only by Familiar mode.
 */
async function loadFamiliarWatchlist() {

    if (!currentUser) {
        familiarWatchlist = [];
        return [];
    }

    try {

        const response = await fetch("/watchlist");

        if (!response.ok) {
            familiarWatchlist = [];
            return [];
        }

        const data = await response.json();

        familiarWatchlist =
            Array.isArray(data.watchlist)
                ? data.watchlist
                : [];

        return familiarWatchlist;

    } catch (error) {

        console.error(
            "Could not load Familiar Watchlist:",
            error
        );

        familiarWatchlist = [];

        return [];
    }
}


/*
 * Check whether a movie is already in Watchlist.
 */
function isMovieInFamiliarWatchlist(movieId) {

    const id = String(movieId || "");

    return familiarWatchlist.some(
        function (movie) {

            return String(
                movie.movie_id || ""
            ) === id;

        }
    );
}


/*
 * Add a movie to Watchlist.
 */
async function addMovieToFamiliarWatchlist(movie) {

    if (!currentUser) {

        if (typeof openLogin === "function") {
            openLogin();
        }

        return false;
    }

    const movieId =
        String(
            movie.movie_id ||
            movie.movieId ||
            movie.id ||
            ""
        );

    if (!movieId) {

        console.error(
            "Cannot add movie: movie ID missing."
        );

        return false;
    }

    try {

        const response =
            await fetch(
                "/watchlist",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        movie_id:
                            movieId,

                        movie_title:
                            movie.title ||
                            movie.movie_title ||
                            "Movie",

                        tmdb_id:
                            movie.tmdb_id ||
                            movie.tmdbId ||
                            null,

                        poster:
                            movie.poster ||
                            null,

                        tmdb_rating:
                            movie.tmdb_rating ??
                            null,

                        overview:
                            movie.overview ||
                            ""

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            console.error(
                "Watchlist error:",
                data.error
            );

            return false;
        }


        await loadFamiliarWatchlist();

        return true;


    } catch (error) {

        console.error(
            "Could not add movie to Familiar Watchlist:",
            error
        );

        return false;
    }
}


/*
 * Remove a movie from Watchlist.
 */
async function removeMovieFromFamiliarWatchlist(movieId) {

    if (!currentUser) {
        return false;
    }

    const id =
        String(movieId || "");

    if (!id) {
        return false;
    }

    try {

        const response =
            await fetch(
                "/watchlist",
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        movie_id: id
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            console.error(
                "Could not remove movie from Watchlist:",
                data.error
            );

            return false;
        }


        await loadFamiliarWatchlist();

        return true;


    } catch (error) {

        console.error(
            "Could not remove movie from Familiar Watchlist:",
            error
        );

        return false;
    }
}
function toggleProfileMenu() {
    const menu = document.getElementById("profile-menu");

    if (menu) {
        menu.classList.toggle("open");
    }
}

async function openLikedMoviesSection() {
    document.getElementById("profile-menu")?.classList.remove("open");

    try {
        const response = await fetch("/feedback");
        const data = await response.json();

        let liked = (data.feedback || []).filter(
            movie => movie.feedback === "like"
        );

        // Get complete TMDB details for every liked movie
        liked = await Promise.all(
            liked.map(async movie => {
                try {
                    const detailResponse = await fetch(
                        `/movie-details/${encodeURIComponent(movie.movie_id)}`
                    );

                    if (detailResponse.ok) {
                        const details = await detailResponse.json();

                        return {
                            ...movie,
                            ...details,
                            movie_id: movie.movie_id,
                            movie_title:
                                movie.movie_title ||
                                details.title ||
                                "Movie"
                        };
                    }
                } catch (error) {
                    console.error(
                        "Could not load movie details:",
                        error
                    );
                }

                return movie;
            })
        );

        showUserMovieList("Liked Movies", liked);

    } catch (error) {
        console.error(error);
        alert("Could not load Liked Movies.");
    }
}

async function openWatchlistSection() {
    document.getElementById("profile-menu")?.classList.remove("open");

    try {
        const response = await fetch("/watchlist");
        const data = await response.json();

        showUserMovieList(
            "My Watchlist",
            data.watchlist || []
        );
    } catch (error) {
        console.error(error);
        alert("Could not load Watchlist.");
    }
}

function showUserMovieList(title, movies) {
    window.userMovieListCache = movies;

    document.getElementById("user-movie-list-popup")?.remove();

    const popup = document.createElement("div");
    popup.id = "user-movie-list-popup";

    popup.innerHTML = `
        <div class="user-movie-list-card">

            <button
                class="user-movie-list-close"
                onclick="document.getElementById('user-movie-list-popup')?.remove()"
            >×</button>

            <h2>${title}</h2>

            <div class="user-movie-list-items">

                ${
                    movies.length
                    ? movies.map((movie, index) => {

                        const poster =
                            movie.poster ||
                            movie.poster_path ||
                            "";

                        const movieTitle =
                            movie.movie_title ||
                            movie.title ||
                            "Movie";

                        return `
                            <div class="user-movie-item">

                                <div class="user-movie-poster-box">
                                    ${
                                        poster
                                        ? `<img src="${poster}" alt="${movieTitle}">`
                                        : `<div class="user-movie-no-poster">🎬</div>`
                                    }
                                </div>

                                <div class="user-movie-info">
                                    <strong>${movieTitle}</strong>

                                    <button
                                        class="user-movie-details-button"
                                        onclick="openSavedMovieDetails(${index})"
                                    >
                                        View Movie Details
                                    </button>
                                </div>

                            </div>
                        `;
                    }).join("")
                    : `
                        <p class="user-movie-empty">
                            No movies saved yet.
                        </p>
                    `
                }

            </div>
        </div>
    `;

    document.body.appendChild(popup);
}

async function openSavedMovieDetails(index) {
    const movie = (window.userMovieListCache || [])[index];

    if (!movie) {
        alert("Movie details could not be loaded.");
        return;
    }

    const movieData = {
        movieId: movie.movie_id || movie.movieId || movie.id,
        movie_id: movie.movie_id || movie.movieId || movie.id,
        title: movie.movie_title || movie.title || "Movie",
        poster: movie.poster || movie.poster_path || "",
        tmdb_rating: movie.tmdb_rating || movie.rating || "",
        overview: movie.overview || "",
        tmdb_id: movie.tmdb_id || movie.tmdbId || "",
        streaming_providers: movie.streaming_providers || []
    };

    document
        .getElementById("user-movie-list-popup")
        ?.remove();

    openMovieModal(movieData, "familiar");
}