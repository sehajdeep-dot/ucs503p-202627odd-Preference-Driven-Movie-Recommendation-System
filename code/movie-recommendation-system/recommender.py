
import re
import requests
import pandas as pd
import numpy as np
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics.pairwise import cosine_similarity


class MovieRecommender:

    def __init__(
        self,
        movies_path,
        ratings_path,
        links_path,
        tmdb_api_key
    ):

        self.movies_path = movies_path
        self.ratings_path = ratings_path
        self.links_path = links_path
        self.tmdb_api_key = tmdb_api_key

        self.movies_df = None
        self.mlb = None
        self.genre_matrix = None

        self._load_data()
        self._load_ratings()
        self._load_links()
        self._build_genre_vectors()


    # ---------------------------------------------------------
    # LOAD MOVIE DATA
    # ---------------------------------------------------------

    def _load_data(self):

        self.movies_df = pd.read_csv(
            self.movies_path
        )

        self.movies_df = self.movies_df.dropna(
            subset=["title", "genres"]
        ).copy()

        # Remove movies where genres are not available
        self.movies_df = self.movies_df[
            self.movies_df["genres"] != "(no genres listed)"
        ].copy()

        # Convert pipe-separated genres into lists
        self.movies_df["genre_list"] = (
            self.movies_df["genres"].apply(
                lambda x: x.split("|")
            )
        )


    # ---------------------------------------------------------
    # LOAD RATINGS
    # ---------------------------------------------------------

    def _load_ratings(self):

        ratings_df = pd.read_csv(
            self.ratings_path
        )

        avg_ratings = (
            ratings_df
            .groupby("movieId")["rating"]
            .mean()
            .reset_index()
            .rename(
                columns={
                    "rating": "avg_rating"
                }
            )
        )

        self.movies_df = self.movies_df.merge(
            avg_ratings,
            on="movieId",
            how="left"
        )

        # If a movie has no rating, use neutral/default rating
        self.movies_df["avg_rating"] = (
            self.movies_df["avg_rating"]
            .fillna(3.0)
        )


    # ---------------------------------------------------------
    # LOAD MOVIELENS -> TMDB LINKS
    # ---------------------------------------------------------

    def _load_links(self):

        links_df = pd.read_csv(
            self.links_path
        )

        # Keep only the columns required by the recommender
        links_df = links_df[
            ["movieId", "tmdbId"]
        ].copy()

        self.movies_df = self.movies_df.merge(
            links_df,
            on="movieId",
            how="left"
        )


    # ---------------------------------------------------------
    # BUILD GENRE VECTORS
    # ---------------------------------------------------------

    def _build_genre_vectors(self):

        self.mlb = MultiLabelBinarizer()

        self.genre_matrix = (
            self.mlb.fit_transform(
                self.movies_df["genre_list"]
            )
        )


    # ---------------------------------------------------------
    # GET AVAILABLE GENRES
    # ---------------------------------------------------------

    def get_available_genres(self):

        return list(
            self.mlb.classes_
        )


    # ---------------------------------------------------------
    # BUILD USER GENRE VECTOR
    # ---------------------------------------------------------

    def _build_user_vector(
        self,
        selected_genres
    ):

        return self.mlb.transform(
            [selected_genres]
        )


    # ---------------------------------------------------------
    # DEPTH SCORE
    #
    # How much of a movie's genres match the user's preferences.
    #
    # Example:
    # User: Action, Comedy, Drama
    # Movie: Action, Comedy
    #
    # Depth = 2 / 2 = 1.0
    # ---------------------------------------------------------

    def _compute_depth_scores(
        self,
        selected_genres
    ):

        selected_set = set(
            selected_genres
        )

        def calculate_depth(
            movie_genres
        ):

            movie_set = set(
                movie_genres
            )

            if not movie_set:
                return 0.0

            matched = movie_set.intersection(
                selected_set
            )

            return len(matched) / len(
                movie_set
            )

        return self.movies_df[
            "genre_list"
        ].apply(
            calculate_depth
        )


    # ---------------------------------------------------------
    # BREADTH SCORE
    #
    # How much of the user's selected preference is represented
    # in the movie.
    #
    # Example:
    # User: Action, Comedy, Drama
    # Movie: Action, Comedy
    #
    # Breadth = 2 / 3
    # ---------------------------------------------------------

    def _compute_breadth_scores(
        self,
        selected_genres
    ):

        selected_set = set(
            selected_genres
        )

        if not selected_set:

            return pd.Series(
                0.0,
                index=self.movies_df.index
            )

        def calculate_breadth(
            movie_genres
        ):

            movie_set = set(
                movie_genres
            )

            matched = movie_set.intersection(
                selected_set
            )

            return len(matched) / len(
                selected_set
            )

        return self.movies_df[
            "genre_list"
        ].apply(
            calculate_breadth
        )


    # ---------------------------------------------------------
    # NORMALIZE RATING
    # ---------------------------------------------------------

    def _rating_score(self):

        return (
            self.movies_df["avg_rating"]
            / 5.0
        )


    # ---------------------------------------------------------
    # RECOMMEND MOVIES
    # ---------------------------------------------------------

    def recommend(
        self,
        selected_genres,
        mode="familiar",
        discover_genre=None,
        top_n=20
    ):

        if not selected_genres:
            return []


        # -----------------------------------------------------
        # USER VECTOR + COSINE SIMILARITY
        # -----------------------------------------------------

        user_vector = (
            self._build_user_vector(
                selected_genres
            )
        )

        cosine_scores = cosine_similarity(
            user_vector,
            self.genre_matrix
        )[0]


        # -----------------------------------------------------
        # DEPTH + BREADTH
        # -----------------------------------------------------

        depth_scores = (
            self._compute_depth_scores(
                selected_genres
            )
        )

        breadth_scores = (
            self._compute_breadth_scores(
                selected_genres
            )
        )


        # -----------------------------------------------------
        # CREATE RESULT DATAFRAME
        # -----------------------------------------------------

        results = self.movies_df.copy()

        results["similarity"] = (
            cosine_scores
        )

        results["depth_score"] = (
            depth_scores
        )

        results["breadth_score"] = (
            breadth_scores
        )

        results["rating_score"] = (
            results["avg_rating"] / 5.0
        )


        # -----------------------------------------------------
        # MODE SELECTION
        # -----------------------------------------------------

        if mode == "familiar":

            results["final_score"] = (
                0.50 * results["similarity"]
                + 0.20 * results["breadth_score"]
                + 0.15 * results["depth_score"]
                + 0.15 * results["rating_score"]
            )


        elif mode == "discover":

            if discover_genre:

                results = results[
                    results["genre_list"].apply(
                        lambda genres:
                            discover_genre in genres
                    )
                ].copy()

            results["final_score"] = (
                0.35 * results["similarity"]
                + 0.25 * results["breadth_score"]
                + 0.10 * results["depth_score"]
                + 0.30 * results["rating_score"]
            )


        else:

            results["final_score"] = (
                0.50 * results["similarity"]
                + 0.20 * results["breadth_score"]
                + 0.15 * results["depth_score"]
                + 0.15 * results["rating_score"]
            )


        # -----------------------------------------------------
        # REMOVE ZERO-SCORE MOVIES
        # -----------------------------------------------------

        results = results[
            results["final_score"] > 0
        ].copy()


        # -----------------------------------------------------
        # SORT RECOMMENDATIONS
        # -----------------------------------------------------

        results = results.sort_values(
            by=[
                "final_score",
                "avg_rating",
                "title"
            ],
            ascending=[
                False,
                False,
                True
            ]
        )


        # -----------------------------------------------------
        # BUILD RECOMMENDATION OUTPUT
        # -----------------------------------------------------

        recommendations = []


        for _, movie in results.head(
            top_n
        ).iterrows():

            movie_genres = set(
                movie["genre_list"]
            )

            user_genres = set(
                selected_genres
            )


            matched_genres = sorted(
                movie_genres.intersection(
                    user_genres
                )
            )


            extra_genres = sorted(
                movie_genres.difference(
                    user_genres
                )
            )


            # ---------------------------------------------
            # EXPLAINABLE RECOMMENDATION
            # ---------------------------------------------

            explanation_parts = []


            if matched_genres:

                explanation_parts.append(
                    "Matches your preferred genres: "
                    + ", ".join(
                        matched_genres
                    )
                )


            depth_percentage = round(
                movie["depth_score"] * 100
            )


            breadth_percentage = round(
                movie["breadth_score"] * 100
            )


            explanation_parts.append(
                f"{depth_percentage}% genre depth match"
            )


            explanation_parts.append(
                f"{breadth_percentage}% preference coverage"
            )


            explanation_parts.append(
                f"MovieLens rating: "
                f"{movie['avg_rating']:.1f}/5"
            )


            if extra_genres:

                explanation_parts.append(
                    "Also includes: "
                    + ", ".join(
                        extra_genres
                    )
                )


            explanation = " • ".join(
                explanation_parts
            )


            # ---------------------------------------------
            # TMDB ID
            # ---------------------------------------------

            tmdb_id = movie.get(
                "tmdbId"
            )


            if pd.isna(tmdb_id):

                tmdb_id = None

            else:

                try:

                    tmdb_id = int(
                        tmdb_id
                    )

                except (
                    ValueError,
                    TypeError
                ):

                    tmdb_id = None


            # ---------------------------------------------
            # ADD RECOMMENDATION
            # ---------------------------------------------

            recommendations.append(
                {
                    "movieId": int(
                        movie["movieId"]
                    ),

                    "title": movie["title"],

                    "genres": movie["genres"],

                    # Similarity information
                    "match_score": round(
                        float(
                            movie["similarity"]
                        ),
                        4
                    ),

                    "breadth_score": round(
                        float(
                            movie["breadth_score"]
                        ),
                        4
                    ),

                    "depth_score": round(
                        float(
                            movie["depth_score"]
                        ),
                        4
                    ),

                    # Rating
                    "rating": round(
                        float(
                            movie["avg_rating"]
                        ),
                        2
                    ),

                    # TMDB mapping
                    "tmdbId": tmdb_id,

                    # Explainability
                    "matched_genres":
                        matched_genres,

                    "extra_genres":
                        extra_genres,

                    "explanation":
                        explanation,

                    # Filled/enriched by app.py
                    "poster_url": None,

                    "overview": None,

                    "tmdb_rating": None,

                    "tmdb_url": None,

                    "streaming_providers": []
                }
            )


        return recommendations