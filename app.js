// Dependencies
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const SpotifyWebApi = require('spotify-web-api-node');
require('ejs');
require('dotenv').config();

let currSocketID;
let connections = 0;
let users = [];
let rooms = [];

// Scopes
const scopes = [
        'user-read-email',
        'user-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-read-private',
        'playlist-modify-private',
        'user-library-modify',
        'user-library-read',
        'user-top-read',
        'user-follow-modify'
    ],
    redirectUri = 'http://localhost:8888/callback',
    clientId = process.env.CLIENT_ID,
    clientSecret = process.env.CLIENT_SECRET

// Create SpotifyWebAPI object
const spotifyApi = new SpotifyWebApi({
    redirectUri: redirectUri,
    clientId: clientId,
    clientSecret: clientSecret
});

// Initialize Express and socket IO
const app = express();
app.set("view engine", "ejs");
const server = http.createServer(app);
const io = socketio(server);

// Set home.ejs as static page
app.use(express.static(path.join(__dirname, "views")));

// Server-side socket IO events, more detailed event descriptions in main.js
io.on('connection', socket => {

    currSocketID = socket.id;
    console.log(socket.id);
    connections++;

    socket.on('invite', roomCode => {
        socket.join(roomCode);
        rooms.push(roomCode);
    });

    socket.on('join', data => {
        if(rooms.includes(data.code) === true) {
            socket.join(data.code);
            socket.broadcast.to(data.code).emit('partnerID', {socket_id: socket.id, display_name: data.display_name});
        }
        else{
            io.to(socket.id).emit('roomError');
        }
    });

    socket.on('partnerID2', data => {
        socket.broadcast.to(data.roomCode).emit('partnerID3', {socket_id: socket.id, display_name: data.display_name});
    });

    socket.on('render', data => {
        let room = Array.from(socket.rooms)[1];
        socket.broadcast.to(room).emit('createList', data);
    });

    socket.on('createList2', data => {
        let room = Array.from(socket.rooms)[1];
        io.to(room).emit('createList3', {sortedGenres: SortGenres(data.arr1.concat(data.arr2)), combinedSongs: data.songs1.concat(data.songs2)});
    });

    socket.on('newPlaylistGenres', data => {
        let room = Array.from(socket.rooms)[1];
        createPlaylist(getUserGivenID(socket.id), data.playlistGenres, data.combinedSongs, room, data.me, data.partner);
    });

    socket.on('checkbox', ID => {
        let room = Array.from(socket.rooms)[1];
        socket.broadcast.to(room).emit('checkbox2', ID);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected');
        users.splice(users.indexOf(socket.id));
        let room = Array.from(socket.rooms)[1];
        io.emit('syncRoomList', {code: room, action: 'remove'});
        connections--;
    });
});

// Render home.ejs as homepage, prompts for authorization
app.get('/', (req, res) => {
    res.render("home");
});

// Redirect client to Spotify authorization page
app.get('/login', (req, res) => {
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
});

// Get authorization code on callback and get/set token, then pass token to GetSongs()
app.get('/callback', (req, res) => {
    res.render("index");
    const code = req.query.code;
    spotifyApi.authorizationCodeGrant(code).then(
        function(data) {
            var access_token = data.body['access_token'];
            GetSongs(currSocketID, access_token);
        },
        function(err) {
            console.log(err);
        }
    );
});

// Get user's top genres and create a playlist
function createPlaylist(user, requestGenres, songs, room, display_name, partner_display_name) {
    spotifyApi.setAccessToken(user.token);

    // Old function
    let list = [];
    for(let i = 0; i < songs.length; i++)
    {
        spotifyApi.getArtist(songs[i].artistID)
            .then(function(data) {
                if(IncludesElement(data.body.genres, requestGenres) === true)
                {
                    list.push(songs[i].songURI);
                }
            }, function(err) {
                console.error(err);
            });
    }

    spotifyApi.createPlaylist(display_name + '\'s and ' + partner_display_name + '\'s playlist', {'public': true })
        .then(function(data) {
            addSongsToPlaylist(data.body.owner.id, data.body.id, list, user.token, room);
            io.to(room).emit('removelist', data.body.external_urls.spotify);
        }, function(err) {
            console.log(err);
        });
}

// Add appropriate songs to playlist
function addSongsToPlaylist(userID, playlistID, songURIsToAdd, token, room) {
    spotifyApi.setAccessToken(token);
    spotifyApi.addTracksToPlaylist(playlistID, songURIsToAdd)
        .then(function(data) {
            console.log('Added tracks to playlist!');
        }, function(err) {
            console.log('Something went wrong!', err);
        });
}

// Return true if arrays have a common element
function IncludesElement(arr1, arr2)
{
    for(let i = 0; i < arr1.length; i++)
    {
        for(let j = 0; j < arr2.length; j++)
        {
            if(arr1[i] === arr2[j])
            {
                return true;
            }
        }
    }
    return false;
}

// Get user given their current socket ID
function getUserGivenID(socketID) {
    for(let i = 0; i < users.length; i++)
    {
        if(users[i].socketID === socketID)
        {
            return users[i];
        }
    }
}

// Get a users top 50 songs
function GetSongs(socketID, access_token){
    // push new user to array
    users.push({socketID: currSocketID, token: access_token});
    spotifyApi.setAccessToken(access_token);
    let songs = [];
    var artists = [];
    spotifyApi.getMyTopTracks({limit: 50})
        .then(function(data) {
            var maxLength = data.body.items.length;
            for(let i = 0; i < maxLength; i++)
            {
                songs.push({title: data.body.items[i].name, artistID: data.body.items[i].artists[0].id, songURI: data.body.items[i].uri});
                artists.push(data.body.items[i].artists[0].id);
                if(i === maxLength - 1)
                {
                    spotifyApi.getMe()
                        .then(function(data) {
                            io.to(socketID).emit('getSongs', {songs: songs, display_name: data.body.display_name});
                        }, function(err) {
                            console.log(err);
                        });
                    getArtists(socketID, artists, access_token);
                }
            }
        }, function(err) {
            console.log(err);
        });
}

// Get user's list of genres based on the geners of their top artist
function getArtists(socketID, artists, token) {
    let genres = [];
    spotifyApi.setAccessToken(token);
    spotifyApi.getArtists(artists)
        .then(function(data) {
            for(let i = 0; i < data.body.artists.length; i++)
            {
                for(let x = 0; x < data.body.artists[i].genres.length; x++)
                {
                    genres.push(data.body.artists[i].genres[x]);
                }
            }
            io.to(socketID).emit('getGenres', SortGenres(genres));
        }, function(err) {
            console.error(err);
        });
}

// Sort array with most frequent elements first
function SortGenres(list)
{
    var frequency = {}, value;
    for(var i = 0; i < list.length; i++) {
        value = list[i];
        if(value in frequency) {
            frequency[value]++;
        }
        else {
            frequency[value] = 1;
        }
    }
    var uniques = [];
    for(value in frequency) {
        uniques.push(value);
    }
    function compareFrequency(a, b) {
        return frequency[b] - frequency[a];
    }
    uniques = uniques.sort(compareFrequency);
    return uniques;
}

// Run server
let port = process.env.PORT;
server.listen(port);
console.log("Listening on 8888");