const socket = io();
var mySocketID;
var partnerSocketID;
var roomCode;
var listLength;
var songs = [];
var genres = [];
var allSongs = [];
var display_name;
var partner_display_name;

// Client-size socket IO events
socket.on('connect', () => {
    mySocketID = socket.id;
    console.log(mySocketID);
    document.getElementById('create').style.display = 'none';
});

// Get user's top songs from server
socket.on('getSongs', elements => {
    songs = elements.songs;
    display_name = elements.display_name;
});

// Get user's genres from server
socket.on('getGenres', elements => {
    genres = elements;
});

// Exchange socket ID's with partner
// Flow: partnerID (client) --> partnerID2 (server) --> partnerID3 (client)
socket.on('partnerID', data => {
    partnerSocketID = data.socket_id;
    console.log(partnerSocketID);
    console.log(data.display_name);
    partner_display_name = data.display_name;
    socket.emit('partnerID2', {roomCode: roomCode, display_name: display_name});
    document.getElementById('create').style.display = 'inline';
    document.getElementById('invite').style.display = 'none';
    document.getElementById('join').style.display = 'none';
});

socket.on('partnerID3', data => {
    partnerSocketID = data.socket_id;
    console.log(partnerSocketID);
    console.log(data.display_name);
    partner_display_name = data.display_name;
    socket.emit('render', {songs: songs, genres: genres});
    document.getElementById('textbox').remove();
    document.getElementById('submitButton').remove();
    document.getElementById('create').style.display = 'inline';
    document.getElementById('invite').style.display = 'none';
    document.getElementById('join').style.display = 'none';
});

// Create list of common genres and present to both clients
// Flow: createList (client) --> createList2 (server) -- createList3 (client)
socket.on('createList', data => {
    document.getElementById('code').remove();
    socket.emit('createList2', {arr1: genres, arr2: data.genres, songs1: songs, songs2: data.songs});
});

socket.on('createList3', data => {
    allSongs = data.combinedSongs;
    CreateElements(data.sortedGenres);
});

// Sync currently selected checkboxes
socket.on('checkbox2', ID => {
    document.getElementById(ID).checked = document.getElementById(ID).checked !== true;
});

socket.on('removelist', () => {
    document.getElementById('InviteJoin').remove();
    let newText = document.createElement('h3');
    newText.textContent = 'Playlist created!';
    newText.id = 'code';
    document.getElementById('createdPlaylist').append(newText);
});

socket.on('roomError', () => {
    if(document.getElementById('code') === null)
    {
        let newText = document.createElement('h3');
        newText.textContent = 'Invalid code!';
        newText.id = 'code';
        document.getElementById('createdPlaylist').append(newText);
    }
});

// Invite button click
// Generate code and join room
function InviteButton() {
    roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    if(document.getElementById('code') === null)
    {
        let code = document.createElement('h3');
        code.textContent = "Your invite code is: " + roomCode;
        code.id = 'code';
        document.getElementById('InviteJoin').append(code);
    }
    if(document.getElementById('textbox') != null)
    {
        document.getElementById('textbox').remove();
        document.getElementById('submitButton').remove();
    }
    else {
        code.textContent = "Your invite code is: " + roomCode;
    }
    socket.emit('invite', roomCode);
}

// Join button
function JoinButton() {
    if(document.getElementById('textbox') === null)
    {
        let textbox = document.createElement('input');
        textbox.setAttribute('type', 'text');
        textbox.id = 'textbox';
        document.getElementById('InviteJoin').append(textbox);

        let submitButton = document.createElement('input');
        submitButton.setAttribute('type', 'button');
        submitButton.setAttribute('value', 'Submit');
        submitButton.id = 'submitButton'
        submitButton.addEventListener('click', () => SubmitButton(document.getElementById('textbox').value));
        document.getElementById('InviteJoin').append(submitButton);
    }
    if(document.getElementById('code') != null)
    {
        document.getElementById('code').remove();
    }
}

// Submit room code button
function SubmitButton(code) {
    socket.emit('join', {code: code, display_name: display_name});
}

// Create playlist button
function CreatePlaylist() {
    let newPlaylistGenres = [];
    for(let i = 0; i < listLength; i++)
    {
        if(document.getElementById(i).checked)
        {
            newPlaylistGenres.push(document.getElementById(i).name);
        }
    }
    console.log(newPlaylistGenres.length);
    if(newPlaylistGenres.length === 0)
    {
        if(document.getElementById('code') === null)
        {
            let errorMessage = document.createElement('h3');
            errorMessage.textContent = "No genres selected!";
            errorMessage.id = 'code';
            document.getElementById('InviteJoin').prepend(errorMessage);
        }
    }
    else{
        socket.emit('newPlaylistGenres', {playlistGenres: newPlaylistGenres, combinedSongs: allSongs, me: display_name, partner: partner_display_name});
    }
}

// Render html
function CreateElements(list) {
    listLength = list.length;
    let newDiv = document.createElement('div');
    newDiv.setAttribute('class', 'innercontent');
    let usersLabel = document.createElement('label');
    usersLabel.textContent = 'Yours and ' + partner_display_name + '\'s common genres (sorted most common to least common):';
    newDiv.append(usersLabel);
    document.getElementById('InviteJoin').append(newDiv);
    for(let i = 0; i < list.length; i++)
    {
        let newDiv = document.createElement('div');
        newDiv.setAttribute('class', 'innercontent');
        let newCheckbox = document.createElement('input');
        newCheckbox.setAttribute('type', 'checkbox');
        newCheckbox.id = i;
        newCheckbox.name = list[i];
        let newLabel = document.createElement('label');
        newLabel.setAttribute('for', i);
        newLabel.textContent = list[i];
        newLabel.name = list[i];
        newDiv.append(newCheckbox);
        newDiv.append(newLabel);
        document.getElementById('InviteJoin').append(newDiv);
    }
    let checkboxes = document.querySelectorAll('input[type=checkbox]');
    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', () => checkboxChange(checkbox.id));
    });
}

// Sync checkboxes
function checkboxChange(ID) {
    socket.emit('checkbox', ID);
}