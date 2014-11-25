//         _  __                      _     _
//    __ _(_)/ _|_ __ ___   __ _  ___| |__ (_)_ __   ___
//   / _` | | |_| '_ ` _ \ / _` |/ __| '_ \| | '_ \ / _ \
//  | (_| | |  _| | | | | | (_| | (__| | | | | | | |  __/
//   \__, |_|_| |_| |_| |_|\__,_|\___|_| |_|_|_| |_|\___|
//   |___/


// Construct gif_master_url from current location
var loc = window.location, gif_master_url;
if (loc.protocol === "https:") {
    gif_master_url = "wss:";
} else {
    gif_master_url = "ws:";
}
gif_master_url += "//" + loc.host;
gif_master_url += loc.pathname;

var socket;

var gif_tag = document.getElementById('gif');

var meme_top = document.getElementById('meme-top');
var meme_bottom = document.getElementById('meme-bottom');

meme_top.style.fontSize = '40px';
meme_bottom.style.fontSize = '40px';

var next_meme_top = '';
var next_meme_bottom = '';

// For background loading of gifs
var hidden_gif_tag = document.getElementById('gif-hidden');

// http://stackoverflow.com/a/11744120/831768
// Get the width and height of the viewport
var w = window,
    d = document,
    e = d.documentElement,
    g = d.body,
    x = w.innerWidth || e.clientWidth || g.clientWidth,
    y = w.innerHeight || e.clientHeight || g.clientHeight;

var update_screen_dimensions = function () {
    w = window,
        d = document,
        e = d.documentElement,
        g = d.body,
        x = w.innerWidth || e.clientWidth || g.clientWidth,
        y = w.innerHeight || e.clientHeight || g.clientHeight;
};

// Set meme url and text - resizes if img is loaded
var set_image_and_text = function (img, top, bottom) {
    hidden_gif_tag.src = img;
    set_text(top, bottom);
};

// Set meme text only - doesn't resize automagically
var set_text = function (top, bottom) {
    if (top !== undefined || top !== null) {
        next_meme_top = top;
    }
    if (bottom !== undefined || bottom !== null) {
        next_meme_bottom = bottom;
    }
};

// Swap loaded gif with unloaded when done.
// Unload gif on hidden tag.
var swap_gif_buffer = function () {
    // Swap the DOM ids
    gif_tag.id = 'gif-hidden';
    hidden_gif_tag.id = 'gif';

    // Swap the objects
    var gif_temp = gif_tag;
    gif_tag = hidden_gif_tag;
    hidden_gif_tag = gif_temp;

    // Reset image (no event bound here)
    hidden_gif_tag.src = '';

    // Swap the event bindings
    hidden_gif_tag.onload = gif_tag.onload;

    gif_tag.onload = function () {
    };
};

// Make the image as big as possible
var fix_image_size = function () {
    var nx = gif_tag.naturalWidth;
    var ny = gif_tag.naturalHeight;
    var aspect_ratio_screen = x / y;
    var aspect_ratio_image = nx / ny;

    if (aspect_ratio_screen > aspect_ratio_image) {
        // screen is fatter than image
        // make height bounding dimension
        gif_tag.style.height = y + 'px';
        gif_tag.style.width = (y / ny) * nx + 'px';
    }
    else {
        gif_tag.style.width = x + 'px';
        gif_tag.style.height = (x / nx) * ny + 'px';
    }
};

// Reposition meme text
var meme_text_position = function () {
    meme_top.textContent = next_meme_top;
    meme_bottom.textContent = next_meme_bottom;

    meme_text_element(meme_top);
    meme_text_element(meme_bottom);

    meme_top.style.left = '' + ((x / 2) - (meme_top.offsetWidth / 2)) + 'px';

    meme_bottom.style.left = '' + ((x / 2) - (meme_bottom.offsetWidth / 2)) + 'px';
    meme_bottom.style.bottom = '' + (y - gif_tag.height) + 'px';
};

var meme_text_element = function (element) {
    var gif_width = parse_px(gif_tag.style.width);

    var element_width = element.clientWidth;
    var element_height = element.clientHeight;

    var bounding_height = parse_px(gif_tag.style.height) / 4;

    var font_size_correction = parse_px(element.style.fontSize) / element_height;

    var reverse_aspect_ratio = element_height / element_width;

    // Set the font size to a maximum of 1/4th the image height.
    if (gif_width * reverse_aspect_ratio > bounding_height) {
        // Bound by height
        element.style.fontSize = font_size_correction * bounding_height + 'px';
    }
    else {
        // Bound by width - let's pad it a little by reducing the font-size to 90% of what the width allows
        element.style.fontSize = font_size_correction * gif_width * reverse_aspect_ratio * 0.9 + 'px';
    }
};

// Use the value already set in style, and remove 'px'
var parse_px = function (style) {
    return parseInt(style.substr(0, style.length - 2), 10);
};

// WebSocket stuff
// Setup websocket
var web_socket_connect = function () {
    socket = new WebSocket(gif_master_url);
    // Handle socket messages
    socket.onmessage = web_socket_on_message;
    // Handle socket connection
    socket.onopen = web_socket_on_connect;
};

// Handle messages and update page
var web_socket_on_message = function (event) {
    var msg = JSON.parse(event.data);
    switch (msg.type) {
        case 'gif':
            set_image_and_text(msg.url, msg.meme_top, msg.meme_bottom);
            break;
        case 'reload':
            document.location.reload(true);
            break;
    }
};

// Log connection for debug purposes
var web_socket_on_connect = function () {
    console.log('Connected!');
};

// Reconnect websocket if it dies. Log concerning states.
var check_connection = function () {
    var state = socket.readyState;
    switch (state) {
        case 0: // CONNNECTING
            console.log('Connecting...');
            break;
        case 1: // OPEN
            break;
        case 2: // CLOSING
            console.log('Closing...');
            break;
        case 3: // CLOSED
            // attempt to reconnect on close.
            console.log('Reconnecting...');
            web_socket_connect();
            break;
    }
};

// Fix image size and reposition text on image load
hidden_gif_tag.onload = function () {
    swap_gif_buffer();
    fix_image_size();
    meme_text_position();
};

// Fix image size and reposition text when resizing window
window.addEventListener('resize', function () {
    update_screen_dimensions();
    fix_image_size();
    meme_text_position();
});