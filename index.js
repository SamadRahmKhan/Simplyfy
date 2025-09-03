console.log("Credits:- Samad Rahim Khan,Youtube,Chatgpt");
// Global variables
let playbarplay = document.getElementById("playbarplay");
let currentSong = new Audio();
let songs = [];
let currFolder = "SONGS/ncs"; // default folder

// Helper: format time
function formatTime(timeInSeconds) {
    let minutes = Math.floor(timeInSeconds / 60);
    let seconds = Math.floor(timeInSeconds % 60);
    if (seconds < 10) seconds = "0" + seconds;
    return `${minutes}:${seconds}`;
}

// Load songs from songs.json
async function getSongsFromFolder(folder) {
    try {
        let response = await fetch(`${folder}/songs.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let data = await response.json();
        return data; // array of filenames
    } catch (e) {
        console.error("Error loading songs.json from", folder, e);
        return [];
    }
}

// Play a song
function playsong(track, pause = false) {
    currentSong.src = `${currFolder}/` + encodeURIComponent(track);
    document.querySelector(".playbar-song-info").innerHTML = decodeURI(track);
    document.querySelector(".playbar-song-time").innerHTML = "00:00 / 00:00";

    if (!pause) {
        currentSong.play();
        playbarplay.src = "play.svg";
    }
}



// Load songs with metadata (title, artist, picture)
async function getSongsWithTags(folder) {
    const files = await getSongsFromFolder(folder); // load filenames
    const songsWithTags = [];

    for (let file of files) {
        try {
            let response = await fetch(`${folder}/${file}`);
            let blob = await response.blob();

            await new Promise((resolve) => {
                jsmediatags.read(blob, {
                    onSuccess: (tag) => {
                        songsWithTags.push({
                            file: file,
                            title: tag.tags.title || file,
                            artist: tag.tags.artist || "Unknown",
                            picture: tag.tags.picture
                                ? `data:${tag.tags.picture.format};base64,${arrayBufferToBase64(tag.tags.picture.data)}`
                                : null
                        });
                        resolve();
                    },
                    onError: () => {
                        songsWithTags.push({
                            file: file,
                            title: file,
                            artist: "Unknown",
                            picture: null
                        });
                        resolve();
                    }
                });
            });
        } catch (e) {
            songsWithTags.push({
                file: file,
                title: file,
                artist: "Unknown",
                picture: null
            });
        }
    }

    return songsWithTags;
}

// Helper to convert cover art bytes → base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}





// Main function
async function main() {

    await displayAlbums();
    
    // Load default folder songs
    songs = await getSongsFromFolder(currFolder);

    
    displaySongs();
    
    if (songs.length > 0) {
        playsong(songs[0], true);
    }

    // Play/Pause button
    playbarplay.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            playbarplay.src = "play.svg";
        } else {
            currentSong.pause();
            playbarplay.src = "pause.svg";
        }
    });

    



    
    
    // Previous button
    previous.addEventListener("click", () => {
        let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (index > 0) playsong(songs[index - 1]);
    });

    // Next button
    next.addEventListener("click", () => {
        let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (index < songs.length - 1) playsong(songs[index + 1]);
    });

    // Update song time
    currentSong.addEventListener("timeupdate", () => {
        let current = formatTime(currentSong.currentTime);
        let total = formatTime(currentSong.duration || 0);
        document.querySelector(".playbar-song-time").innerHTML = `${current} / ${total}`;
        document.querySelector(".circle").style.left =
            (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seekbar click
    document.querySelector(".seekbar").addEventListener("click", (e) => {
        let seekbarWidth = e.currentTarget.clientWidth;
        let percent = e.offsetX / seekbarWidth;
        document.querySelector(".circle").style.left = percent * 100 + "%";
        currentSong.currentTime = percent * currentSong.duration;
    });

    // Volume control
    let volumeBarRange = document.querySelector(".volume input");
    let savedVolume = 0.5;
    currentSong.volume = savedVolume;
    volumeBarRange.value = savedVolume * 100;

    volumeBarRange.addEventListener("input", (e) => {
        savedVolume = e.target.value / 100;
        currentSong.volume = savedVolume;
        document.querySelector(".Volume-Button").src =
            savedVolume === 0 ? "volumeOFF.svg" : "volumeON.svg";
    });

    // Volume button toggle
    let muted = false;
    document.querySelector(".Volume-Button").addEventListener("click", () => {
        if (!muted) {
            currentSong.volume = 0;
            volumeBarRange.value = 0;
            document.querySelector(".Volume-Button").src = "volumeOFF.svg";
        } else {
            currentSong.volume = savedVolume;
            volumeBarRange.value = savedVolume * 100;
            document.querySelector(".Volume-Button").src = "volumeON.svg";
        }
        muted = !muted;
    });
}

// Hamburger menu toggle
let visible = false;
document.querySelectorAll(".hamburger").forEach((e) => {
    e.addEventListener("click", () => {
        document.querySelector(".left").style.left = visible ? "-100%" : "0%";
        visible = !visible;
    });
});

main();



    async function displaySongs() {
    let songsWithTags = await getSongsWithTags(currFolder);

    const cardContainer = document.querySelector(".card-container");
    cardContainer.innerHTML = ""; // clear previous cards

    for (let song of songsWithTags) {
        let RawName = song.file || song.title;
        let StillRawName = RawName.split("_")[0];
        let DisplayName = StillRawName.replaceAll("%20", " ").replace(".mp3", "");

        cardContainer.innerHTML += `
            <div class="card rounded" data-file="${song.file || song.title}">
                <div class="play">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
                        <circle cx="24" cy="24" r="24" fill="green" />
                        <path fill="white" fill-rule="evenodd" clip-rule="evenodd"
                            d="M19 18c0-1.2 1.2-2 2.2-1.4l10 6c1 .6 1 2.2 0 2.8l-10 6c-1 .6-2.2-0.1-2.2-1.4V18z" />
                    </svg>
                </div>
                <img class="secondPlay" src="secondPlay.svg" alt="Play-Button">
                <img class="rounded" src="${song.picture || '/default.jpg'}" alt="cover">
                <h4>${DisplayName}</h4>
                <p>${song.artist}</p>
            </div>
        `;
    }

    // Attach click events
    Array.from(cardContainer.getElementsByClassName("card")).forEach(card => {
        card.addEventListener("click", () => {
            let file = card.getAttribute("data-file");
            playsong(file);
        });
    });
}


async function displayAlbums() {
    try {
        // fetch albums.json
        let response = await fetch("SONGS/albums.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let albums = await response.json();

        let ul = document.querySelector(".song-list ul"); // left sidebar
        ul.innerHTML = ""; // clear old playlists

        for (let album of albums) {
            let li = document.createElement("li");
            li.dataset.folder = album.folder;

            li.innerHTML = `
                <div class="playlist-info">
                    <div class="playlist-info-albums">
                        <div>
                            <h4>${album.title}</h4>
                            <p>${album.description}</p>
                        </div>
                        <div class="play-song display">
                            <img class="invert" src="outline/outline-play.svg" alt="">
                        </div>
                    </div>
                </div>
            `;
            ul.appendChild(li);
        }

        // click on playlist → load its songs
        Array.from(ul.getElementsByTagName("li")).forEach(li => {
            li.addEventListener("click", async () => {
                currFolder = `SONGS/${li.dataset.folder}`;
                songs = await getSongsFromFolder(currFolder);
                displaySongs();
                if (songs.length > 0) playsong(songs[0], true);
            });
        });

    } catch (e) {
        console.error("Error loading albums:", e);
    }
}




// let playbarplay = document.getElementById("playbarplay")
// let currentSong = new Audio();
// let songs = []; 
// let currFolder;

// // returns Promise<tagObject> using jsmediatags
// function readTagsFromUrl(url) {
//   return new Promise((resolve, reject) => {
//     jsmediatags.read(url, {
//       onSuccess: function(tag) { resolve(tag); },
//       onError: function(err) { reject(err); }
//     });
//   });
// }

// // convert picture (tag.tags.picture) to data URL (returns Promise<string>)
// function pictureToDataURL(picture) {
//   if (!picture || !picture.data || !picture.format) return Promise.resolve(null);
//   const byteArray = new Uint8Array(picture.data);
//   const blob = new Blob([byteArray], { type: picture.format });
//   return new Promise((resolve) => {
//     const reader = new FileReader();
//     reader.onload = () => resolve(reader.result); // data:... string
//     reader.readAsDataURL(blob);
//   });
// }

// // safe read: try reading by URL, if CORS/other error -> fetch blob and read
// async function readTagsSafe(url) {
//   try {
//     const tag = await readTagsFromUrl(url);
//     return tag;
//   } catch (err) {
//     // fallback: fetch the file as blob and read from blob
//     try {
//       const res = await fetch(url);
//       const blob = await res.blob();
//       return await new Promise((resolve, reject) => {
//         jsmediatags.read(blob, {
//           onSuccess: resolve,
//           onError: reject
//         });
//       });
//     } catch (err2) {
//       throw err2;
//     }
//   }
// }

// //The Change
// // async function getSongs(folder) {
// //     currFolder = folder;

// //     // Load songs.json instead of trying to scrape folder
// //     let response = await fetch(`${folder}/songs.json`);
// //     let data = await response.json();
// //     songs = data.songs; // array of .mp3 filenames

// //     console.log("Songs loaded:", songs);

// //     // Get metadata
// //     let songsWithTags = await getSongsWithTags(folder);

// //     let cardContainer = document.querySelector(".card-container"); 
// //     cardContainer.innerHTML = ""; // clear old songs

// //     console.log(songsWithTags);
// //     for (let song of songsWithTags) {
// //         let RawName = song.file || song.title;
// //         let StillRawName = RawName.split("_")[0];
// //         let DisplayName = StillRawName.replaceAll("%20"," ").replace(".mp3","");

// //         cardContainer.innerHTML += `
// //             <div class="card rounded" data-file="${song.file || song.title}">
// //                 <div class="play">
// //                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
// //                         <circle cx="24" cy="24" r="24" fill="green" />
// //                         <path fill="white" fill-rule="evenodd" clip-rule="evenodd"
// //                             d="M19 18c0-1.2 1.2-2 2.2-1.4l10 6c1 .6 1 2.2 0 2.8l-10 6c-1 .6-2.2-0.1-2.2-1.4V18z" />
// //                     </svg>
// //                 </div>
// //                 <img class="secondPlay" src="secondPlay.svg" alt="Play-Button">
// //                 <img class="rounded" src="${song.picture || '/default.jpg'}" alt="cover">
// //                 <h4>${DisplayName}</h4>
// //                 <p>${song.artist}</p>
// //             </div>
// //         `;
// //     }

// //     // Attach click events
// //     Array.from(cardContainer.getElementsByClassName("card")).forEach(card => {
// //         card.addEventListener("click", () => {
// //             let file = card.getAttribute("data-file");
// //             playsong(file);
// //         });
// //     });
// // }




// //The Change
// // Function to load songs.json first
// async function loadSongs(folder) {
//     try {
//         let response = await fetch(`${folder}/songs.json`);
//         let data = await response.json();
//         return data.songs; // returns ["song1.mp3", "song2.mp3", ...]
//     } catch (e) {
//         console.error("Error loading songs.json from", folder, e);
//         return [];
//     }
// }

// // Defining the NEW tags reader Function
// async function getSongsWithTags(folder) {
//     let songsWithTags = [];

//     // ✅ First load songs from songs.json
//     let songs = await loadSongs(folder);

//     for (let song of songs) {
//         try {
//             let response = await fetch(`${folder}/${song}`);
//             let blob = await response.blob();

//             await new Promise((resolve) => {
//                 jsmediatags.read(blob, {
//                     onSuccess: (tag) => {
//                         songsWithTags.push({
//                             file: song, // keep actual filename
//                             title: tag.tags.title || song,
//                             artist: tag.tags.artist || "Unknown",
//                             album: tag.tags.album || "Unknown",
//                             picture: tag.tags.picture
//                                 ? `data:${tag.tags.picture.format};base64,${arrayBufferToBase64(tag.tags.picture.data)}`
//                                 : null,
//                         });
//                         resolve();
//                     },
//                     onError: (error) => {
//                         console.log("Tag error for", song, error);
//                         songsWithTags.push({
//                             file: song,
//                             title: song,
//                             artist: "Unknown",
//                             album: "Unknown",
//                             picture: null
//                         });
//                         resolve();
//                     }
//                 });
//             });
//         } catch (e) {
//             console.log("Error fetching file:", song, e);
//         }
//     }
//     return songsWithTags;
// }


// // helper function to convert cover art bytes → base64
// function arrayBufferToBase64(buffer) {
//     let binary = '';
//     let bytes = new Uint8Array(buffer);
//     let len = bytes.byteLength;
//     for (let i = 0; i < len; i++) {
//         binary += String.fromCharCode(bytes[i]);
//     }
//     return window.btoa(binary);
// }



// function playsong(track, pause = false) {
//     currentSong.src = `${currFolder}/` + track;
//     if (!pause) {
//         currentSong.play();
//         playbarplay.src = "play.svg"
//     }
//     document.querySelector(".playbar-song-info").innerHTML = decodeURI(track);
//     document.querySelector(".playbar-song-time").innerHTML = "00:00 / 00:00";

//     // const obj = document.createElement("video");
//     currentSong.addEventListener("loadeddata", () => {
//         let duration = Number(currentSong.duration);
//         // console.log(Math.floor(duration));
//     })

// }

// async function displayAlbums() {
//     let a = await fetch(`/SONGS/`);
//     let response = await a.text();
//     let div = document.createElement("div");
//     div.innerHTML = response;
//     let anchars = div.getElementsByTagName("a");

//     let ul = document.querySelector(".song-list ul"); // left sidebar
//     ul.innerHTML = ""; // clear old playlists

//     for (let e of anchars) {
//         if (e.href.includes("/SONGS")) {
//             let folder = e.href.split("/").slice(-1)[0];
//             if (folder === "SONGS") continue;

//             // fetch info.json
//             let res = await fetch(`/SONGS/${folder}/info.json`);
//             let info = await res.json();

//             // add playlist item
//             let li = document.createElement("li");
//             li.dataset.folder = folder;
//             li.innerHTML = `
//                         <div class="playlist-info  ">
//                             <div class="playlist-info-albums" >
//                             <div>
//                                 <h4>${info.title}</h4>
//                                 <p>${info.discription}</p>
//                             </div>
//                                 <div class="play-song display ">
//                                     <img class="invert" src="outline/outline-play.svg" alt="">
//                                 </div>
//                             </div>
//                         </div>
//             `;
//             ul.appendChild(li);
//         }
//     }

//     // click on playlist → load its songs
//     Array.from(ul.getElementsByTagName("li")).forEach(li => {
//         li.addEventListener("click", async () => {
//             songs = await getSongsFromFolder(`SONGS/${li.dataset.folder}`);
//         });
//     });
// }

// // 📂 Reads songs.json inside a folder and returns list of filenames
// async function getSongsFromFolder(folder) {
//     try {
//         let response = await fetch(`${folder}/songs.json`);
//         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//         let songs = await response.json();
//         return songs;
//     } catch (e) {
//         console.error("Error loading songs.json from", folder, e);
//         return [];
//     }
// }



// async function main() {
//     // Choose which folder to load
//     songs = await getSongsFromFolder("SONGS/ncs"); // change to "SONGS/Phasto" if needed

//     // Play the first song if available
//     if (songs.length > 0) {
//         playsong(songs[0], true);
//     }

//     // Play/Pause button
//     playbarplay.addEventListener("click", () => {
//         if (currentSong.paused) {
//             currentSong.play();
//             playbarplay.src = "play.svg";
//         } else {
//             currentSong.pause();
//             playbarplay.src = "pause.svg";
//         }
//     });

//     // Previous button
//     previous.addEventListener("click", () => {
//         let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
//         if (index > 0) playsong(songs[index - 1]);
//     });

//     // Next button
//     next.addEventListener("click", () => {
//         let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
//         if (index < songs.length - 1) playsong(songs[index + 1]);
//     });

//     // Update song time
//     currentSong.addEventListener("timeupdate", () => {
//         let current = newFunction(currentSong.currentTime);
//         let total = newFunction(currentSong.duration);
//         document.querySelector(".playbar-song-time").innerHTML = `${current} / ${total}`;
//         document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
//     });

//     // Seekbar
//     document.querySelector(".seekbar").addEventListener("click", (e) => {
//         let seekbarWidth = e.currentTarget.clientWidth;
//         let percent = (e.offsetX / seekbarWidth) * 100;
//         document.querySelector(".circle").style.left = percent + "%";
//         currentSong.currentTime = (percent / 100) * currentSong.duration;
//     });

//     // Volume control
//     let volumeBarRange = document.querySelector(".volume input");
//     let SoundBefore = 0.50;
//     volumeBarRange.addEventListener("input", (e) => {
//         SoundBefore = e.target.value / 100;
//         currentSong.volume = SoundBefore;
//         document.querySelector(".Volume-Button").src = SoundBefore === 0 ? "volumeOFF.svg" : "volumeON.svg";
//     });

//     // Volume button toggle
//     let soundOn = true;
//     document.querySelector(".Volume-Button").addEventListener("click", () => {
//         if (soundOn) {
//             currentSong.volume = 0;
//             volumeBarRange.value = 0;
//             document.querySelector(".Volume-Button").src = "volumeOFF.svg";
//         } else {
//             currentSong.volume = SoundBefore;
//             volumeBarRange.value = SoundBefore * 100;
//             document.querySelector(".Volume-Button").src = "volumeON.svg";
//         }
//         soundOn = !soundOn;
//     });
// }

// main();



// function newFunction(timeInSeconds) {
//     let minutes = Math.floor(timeInSeconds / 60);
//     let seconds = Math.floor(timeInSeconds % 60);

//     // Add leading zero if seconds < 10
//     if (seconds < 10) {
//         seconds = "0" + seconds;
//     }
//     return `${minutes}:${seconds}`;
// }

// // MAKING THE HAMBURGER FUNCTIONAL
// let visible = false;
// document.querySelectorAll(".hamburger").forEach(e => {
//     e.addEventListener("click", () => {
//         if (!visible) {
//             document.querySelector(".left").style.left = 0 + "%";
//             visible = true;
//         }
//         else {
//             document.querySelector(".left").style.left = -100 + "%";
//             visible = false;
//         }
//         // Alternativly visible = !visible; 
//     })
// });

