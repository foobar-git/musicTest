/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const { put } = require('request');

var client_id = ''; // Your client id
var client_secret = ''; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var token = ""; // Access token copy
var user_id = ""; // User id

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var ejs = require('ejs'); // EDIT

var app = express();

app.set('view engine', 'ejs');  // EDIT

//app.use(express.static(__dirname + '/public'))
app.use(express.static(__dirname + '/'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = /*'user-read-private user-read-email' */'streaming user-modify-playback-state user-read-email user-library-read playlist-modify-public user-read-playback-state user-read-recently-played user-read-private playlist-read-private user-library-modify playlist-read-collaborative playlist-modify-private user-read-currently-playing';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
  }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
            token = access_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
          token = access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
/// playlist functionality

/*app.get('/show_playlists', function(req, res) {
    token = "Bearer " + token;
    // get user_id for current user
    request ({ url: "https://api.spotify.com/v1/me", headers: {"Authorization": token} }, function(err, res) {
        if (res) {
            user_id = JSON.parse(res.body).id;
            console.log ("USER_ID: " + user_id);
        }
    });
    
    var playlists_url="https://api.spotify.com/v1/users/" + user_id + "/playlists";
    request ({ url: playlists_url, headers: {"Authorization": token} }, function(err, res) {
        if (res) {
            var playlists = JSON.parse(res.body);
            //console.log ( JSON.stringify(playlists.items, null, " ") );

            // list current user's playlists
            if (res) {
                var playlist = JSON.parse(res.body);
                playlist.items.forEach ( function(playlist) {
                    console.log ("playlist: " + playlist.name);
                });
            }
        }
    });
});

app.get('/show_playlistTracks1', function(req, res) { // CONSOLE ONLY AS OF YET
  token = "Bearer " + token;
  var playlists_url="https://api.spotify.com/v1/users/" + user_id + "/playlists";
  request ({ url: playlists_url, headers: {"Authorization": token} }, function(err, res) {
      if (res) {
          var playlists = JSON.parse(res.body);
          //console.log ( JSON.stringify(playlists.items, null, " ") );

          // list current user's playlists
          if (res) {
              var playlist = JSON.parse(res.body);
              playlist.items.forEach ( function(playlist) {
                  //console.log ("playlist: " + playlist.name);
              });
          }

          // list tracks (songs) from selected playlist
          var playlist_url = playlists.items[1].href;
          request ({ url: playlist_url, headers: {"Authorization":token} }, function(err, res) {
              if (res) {
                  var playlist = JSON.parse(res.body);
                  console.log ("Selected playlist: " + playlist.name);
                  playlist.tracks.items.forEach ( function(track) {
                      console.log ("track: " + track.track.name);
                  });
              }
          });
      }
  });
});

app.get('/show_playlistTracks2', function(req, res) { // CONSOLE ONLY AS OF YET
  token = "Bearer " + token;
  var playlists_url="https://api.spotify.com/v1/users/" + user_id + "/playlists";
  request ({ url: playlists_url, headers: {"Authorization": token} }, function(err, res) {
      if (res) {
          var playlists = JSON.parse(res.body);
          //console.log ( JSON.stringify(playlists.items, null, " ") );

          // list current user's playlists
          if (res) {
              var playlist = JSON.parse(res.body);
              playlist.items.forEach ( function(playlist) {
                  //console.log ("playlist: " + playlist.name);
              });
          }

          // list tracks (songs) from selected playlist
          var playlist_url = playlists.items[0].href;
          request ({ url: playlist_url, headers: {"Authorization": token} }, function(err, res) {
              if (res) {
                  var playlist = JSON.parse(res.body);
                  console.log ("Selected playlist: " + playlist.name);
                  playlist.tracks.items.forEach ( function(track) {
                      console.log ("track: " + track.track.name);
                  });
              }
          });
      }
  });
});*/

app.get('/play_track1', function(req, res) {
  token = "Bearer " + token;
  var play_url="https://api.spotify.com/v1/me/player/play";
  //var album_uri="spotify:album:5ht7ItJgpBH7W6vJ5BqpPr";
  //var context_uri="spotify:track:2nLtzopw4rPReszdYBJU6h";
  var track = "spotify:track:0gzqZ9d1jIKo9psEIthwXe";
  
  request ({ method: "PUT", uri: play_url, headers: {"Accept": "application/json", "Content-Type": "application/json", "Authorization": token}, body: {"uris":[track]}, json: true }, function(err, res) {
      if (res) {
        console.log (res.body);
      }
  });
});

app.get('/pause_song', function(req, res) {
  token = "Bearer " + token;
  var play_url="https://api.spotify.com/v1/me/player/pause";
  
  request ({ method: "PUT", uri: play_url, headers: {"Accept": "application/json", "Content-Type": "application/json", "Authorization": token}, json: true }, function(err, res) {
      if (res) {
        console.log (res.body);
      }
  });
});

app.get('/play_song', function(req, res) {
  token = "Bearer " + token;
  var play_url="https://api.spotify.com/v1/me/player/play";
  
  request ({ method: "PUT", uri: play_url, headers: {"Accept": "application/json", "Content-Type": "application/json", "Authorization": token}, json: true }, function(err, res) {
      if (res) {
        console.log (res.body);
      }
  });
});

app.get('/', function(req, res) {
  //res.sendFile(__dirname + '/index.html');
  res.render('./index.ejs', {
    loadWebPlayer: true
  });
});

/////////////////////////////////////////////////////////////////////////////////////////
const port = 8888; //for localhost
//const port = process.env.PORT || 80;
app.listen(port);
console.log('Listening on ' + port);
