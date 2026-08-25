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


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        fetchAvailableGenres();

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
                                16

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
                                16

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
                            16

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


    container.innerHTML = "";


    const start =
        queue.currentPage * 4;


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


            <p class="movie-card-click">

                Click to view details →

            </p>

        </div>

    `;


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
// MOVIE MODAL
// =========================================================

function openMovieModal(
    movie,
    mode
) {

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


    // POSTER

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

        }

    }


    // TITLE

    if (title) {

        title.textContent =
            movie.title ||
            "Movie";

    }


    // META

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
            movie.tmdb_rating !== undefined
        ) {

            parts.push(

                `TMDB ${
                    movie.tmdb_rating
                }/10`

            );

        }


        meta.textContent =
            parts.join(
                " • "
            );

    }


    // STORY

    if (overview) {

        overview.textContent =
            movie.overview ||
            "Movie description unavailable.";

    }


    // WHY RECOMMENDED

    if (reason) {

        reason.textContent =
            `Selected because it aligns strongly with your selected genres (${movie.genres || "your preferences"}).`;

    }


    // TMDB LINK

    if (tmdbButton) {

        if (movie.tmdb_url) {

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


    modal.classList.add(
        "active"
    );

}


// =========================================================
// CLOSE MODAL
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

function escapeHTML(value) {

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


function escapeAttribute(value) {

    return escapeHTML(
        value
    );

}


// =========================================================
// CLOSE MODAL OUTSIDE CLICK
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