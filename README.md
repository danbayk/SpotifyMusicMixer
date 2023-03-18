# SpotifyMusicMixer - Create a Spotify playlist based on most common genres
This project is a site where two users can create a shared genre-based Spotify playlist based on their most common genres. The playlist consists of a genre-appropriate mix of the users current top 50 songs.
## Setup
Currently, this server can be run locally. To do this:
1. Create an account on the [Spotify Developer Site](https://developer.spotify.com/dashboard/) and create an application.
2. Set http://localhost:8888/callback as the redirect URI in the application settings.
3. Create a `.env` file in the root of the project and include the following three variables:
````
HOST=http://localhost:8888/callback
CLIENT_ID=<client_id>
CLIENT_SECRET=<client_secret>
````
## Running the server
1. Install all required dependencies by running `npm install`
2. Run the server by running `node app.js`
3. Clients can connect to server by navigating to `http://localhost:8888/` in their local browser.
## Usage
Open two local clients, the first client can invite the second given the generated room code. Once joined, users can choose to create a playlist based on the common genres provided. Once created, the playlist can be found by opening the Spotify application.
