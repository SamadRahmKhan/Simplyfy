
let playbarplay = document.getElementById("playbarplay")
let currentSong = new Audio();
let songs = [];
let currFolder;

// returns Promise<tagObject> using jsmediatags
function readTagsFromUrl(url) {
  return new Promise((resolve, reject) => {
    jsmediatags.read(url, {
      onSuccess: function(tag) { resolve(tag); },
      onError: function(err) { reject(err); }
    });
  });
}

// convert picture (tag.tags.picture) to data URL (returns Promise<string>)
function pictureToDataURL(picture) {
  if (!picture || !picture.data || !picture.format) return Promise.resolve(null);
  const byteArray = new Uint8Array(picture.data);
  const blob = new Blob([byteArray], { type: picture.format });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data:... string
    reader.readAsDataURL(blob);
  });
}

// safe read: try reading by URL, if CORS/other error -> fetch blob and read
async function readTagsSafe(url) {
  try {
    const tag = await readTagsFromUrl(url);
    return tag;
  } catch (err) {
    // fallback: fetch the file as blob and read from blob
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        jsmediatags.read(blob, {
          onSuccess: resolve,
          onError: reject
        });
      });
    } catch (err2) {
      throw err2;
    }
  }
}


async function getSongs(folder) {
    currFolder = folder;
    let a = await fetch(`http://127.0.0.1:5500/${folder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    
    let as = div.getElementsByTagName("a");
    songs = [];
    for (let element of as) {
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1]);
        }
    }
    console.log(songs);
    
    // Get metadata
    let songsWithTags = await getSongsWithTags(folder);
    
    let cardContainer = document.querySelector(".card-container"); // now songs go here
    cardContainer.innerHTML = ""; // clear old songs
    

    console.log(songsWithTags);
    for (let song of songsWithTags) {
        let RawName = song.file || song.title;
        let StillRawName = RawName.split("_")[0];
        let DisplayName = StillRawName.replaceAll("%20"," ").replace(".mp3","");
        console.log(DisplayName);


        // let card = document.createElement("div");
        // card.classList.add("card");
        // card.setAttribute("data-file", song.file || song.title);
        let cardContainerMain = document.querySelector(".card-container")
        let SongName = fetch
        cardContainerMain.innerHTML += `


                    <div class="card rounded" data-file="${song.file || song.title}" >
                        <div class="play">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
                                <!-- Circular green background -->
                                <circle cx="24" cy="24" r="24" fill="green" />
                                <!-- Play button moved 2px down from original (1px up from last version) -->
                                <path fill="white" fill-rule="evenodd" clip-rule="evenodd"
                                    d="M19 18c0-1.2 1.2-2 2.2-1.4l10 6c1 .6 1 2.2 0 2.8l-10 6c-1 .6-2.2-0.1-2.2-1.4V18z" />
                            </svg>
                        </div>
                                <img class="secondPlay" src="secondPlay.svg" alt="Play-Button">
                        <img class="rounded"  src="${song.picture || '/default.jpg'}"
                            alt="cover">
                        <h4>${DisplayName}</h4>
                        <p>${song.artist}</p>
                    </div>
        `;

        // cardContainer.appendChild(card);
    }

    // Attach click events
    Array.from(cardContainer.getElementsByClassName("card")).forEach(card => {
        card.addEventListener("click", (element) => {
        let file = card.getAttribute("data-file");
        playsong(file);
        });
    });

    
}




//Defining the NEW tags reader Function
async function getSongsWithTags(folder) {
    let songsWithTags = [];

    for (let song of songs) {
        try {
            let response = await fetch(`${folder}/${song}`);
            let blob = await response.blob();

            await new Promise((resolve) => {
                jsmediatags.read(blob, {
                    onSuccess: (tag) => {
                        songsWithTags.push({
                            file: song, // ✅ keep actual filename
                            title: tag.tags.title || song,
                            artist: tag.tags.artist || "Unknown",
                            album: tag.tags.album || "Unknown",
                            picture: tag.tags.picture
                                ? `data:${tag.tags.picture.format};base64,${arrayBufferToBase64(tag.tags.picture.data)}`
                                : null,
                        });
                        resolve();
                    },
                    onError: (error) => {
                        console.log("Tag error for", song, error);
                        songsWithTags.push({
                            file: song, // ✅ still save filename
                            title: song,
                            artist: "Unknown",
                            album: "Unknown",
                            picture: null
                        });
                        resolve();
                    }
                });
            });
        } catch (e) {
            console.log("Error fetching file:", song, e);
        }
    }
    return songsWithTags;
}


// helper function to convert cover art bytes → base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}



function playsong(track, pause = false) {
    currentSong.src = `/${currFolder}/` + track;
    if (!pause) {
        currentSong.play();
        playbarplay.src = "play.svg"
    }
    document.querySelector(".playbar-song-info").innerHTML = decodeURI(track);
    document.querySelector(".playbar-song-time").innerHTML = "00:00 / 00:00";

    // const obj = document.createElement("video");
    currentSong.addEventListener("loadeddata", () => {
        let duration = Number(currentSong.duration);
        // console.log(Math.floor(duration));
    })

}

async function displayAlbums() {
    let a = await fetch(`http://127.0.0.1:5500/SONGS/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchars = div.getElementsByTagName("a");

    let ul = document.querySelector(".song-list ul"); // left sidebar
    ul.innerHTML = ""; // clear old playlists

    for (let e of anchars) {
        if (e.href.includes("/SONGS")) {
            let folder = e.href.split("/").slice(-1)[0];
            if (folder === "SONGS") continue;

            // fetch info.json
            let res = await fetch(`http://127.0.0.1:5500/SONGS/${folder}/info.json`);
            let info = await res.json();

            // add playlist item
            let li = document.createElement("li");
            li.dataset.folder = folder;
            li.innerHTML = `
                        <div class="playlist-info  ">
                            <div class="playlist-info-albums" >
                            <div>
                                <h4>${info.title}</h4>
                                <p>${info.discription}</p>
                            </div>
                                <div class="play-song display ">
                                    <img class="invert" src="outline/outline-play.svg" alt="">
                                </div>
                            </div>
                        </div>
            `;
            ul.appendChild(li);
        }
    }

    // click on playlist → load its songs
    Array.from(ul.getElementsByTagName("li")).forEach(li => {
        li.addEventListener("click", async () => {
            songs = await getSongs(`SONGS/${li.dataset.folder}`);
        });
    });
}

async function main() {

    // Get songs from above
    await getSongs("SONGS/ncs")

    playsong(songs[0], true)

    //Display the Albums 
    displayAlbums()

    //Attach an event listner to play, previous ,next
    playbarplay.addEventListener("click", () => {
        if (currentSong.paused) {
            console.log("Playiing");
            currentSong.play();
            playbarplay.src = "play.svg"
        }
        else {
            console.log("Paused");
            currentSong.pause();
            playbarplay.src = "pause.svg"
        }
    })

    //Attaching event listner with previous
    previous.addEventListener("click", () => {
        console.log(currentSong);
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if ((index - 1) >= 0) {
            playsong(songs[index - 1])
        }
    })

    //Attaching event listner with next
    next.addEventListener("click", () => {
        console.log(currentSong);
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if ((index + 1) < songs.length) {
            playsong(songs[index + 1])
        }
        console.log(songs, index);
    })

    //Displaying the time of a song
    currentSong.addEventListener("timeupdate", () => {
        let current = newFunction(currentSong.currentTime);
        let total = newFunction(currentSong.duration);

        document.querySelector(".playbar-song-time").innerHTML = `${current} / ${total}`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";

    });

    document.querySelector(".seekbar").addEventListener("click", (e) => {

        let seekbar = document.querySelector(".seekbar");
        let circle = document.querySelector(".circle");

        let clickX = e.offsetX;
        let seekbarWidth = seekbar.clientWidth;
        let percent = (clickX / seekbarWidth) * 100;

        circle.style.left = percent + "%";

        // Jump song to that position
        currentSong.currentTime = (percent / 100) * currentSong.duration;
    })

    //Adding an event to the volume range input
    let volumeBarRange = document.querySelector(".volume input");
    let SoundBefore = 0.50;//Defining this outside the event because we will uuse it in another event also
    document.querySelector(".volume").getElementsByTagName("input")[0].addEventListener("input", (e) => {
        SoundBefore = parseInt(e.target.value) / 100
        currentSong.volume = parseInt(e.target.value) / 100;
    })

    //Adding an event volume range
    document.querySelector(".volume input").addEventListener("input", () => {
        let volumeRange = document.querySelector(".Volume-Button");
        volumeRange.src = "volumeON.svg";
    })

    document.querySelector(".volume input").addEventListener("input", () => {
        let volumeRange = document.querySelector(".Volume-Button");
        if (parseInt(volumeBarRange.value) === 0){
            volumeRange.src = "volumeOFF.svg";
        }
        else{
            volumeRange.src = "volumeON.svg";
        }
    })

    //adding an event to the volume svg itself
    let soundOn = false;
    document.querySelector(".Volume-Button ").addEventListener("click", (e) => {
        if (!soundOn) {
            currentSong.volume = 0;
            volumeBarRange.value = 0;
            document.querySelector(".Volume-Button ").src = "volumeOFF.svg";
            console.log("sound OFF");
            soundOn = true;
        }
        else {
            currentSong.volume = SoundBefore;
            volumeBarRange.value = SoundBefore * 100;
            document.querySelector(".Volume-Button ").src = "volumeON.svg";
            console.log("Sound ON");
            soundOn = false;
        }
    })



}
main();

function newFunction(timeInSeconds) {
    let minutes = Math.floor(timeInSeconds / 60);
    let seconds = Math.floor(timeInSeconds % 60);

    // Add leading zero if seconds < 10
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return `${minutes}:${seconds}`;
}

// MAKING THE HAMBURGER FUNCTIONAL
let visible = false;
document.querySelectorAll(".hamburger").forEach(e => {
    e.addEventListener("click", () => {
        if (!visible) {
            document.querySelector(".left").style.left = 0 + "%";
            visible = true;
        }
        else {
            document.querySelector(".left").style.left = -100 + "%";
            visible = false;
        }
        // Alternativly visible = !visible; 
    })
});



// async function main() {
//     try {
//         // Fetch the HTML of the SONGS folder
//         let response = await fetch("http://127.0.0.1:5500/SONGS/");
//         let html = await response.text();

//         // Create a temporary DOM to parse the HTML
//         let tempDiv = document.createElement("div");
//         tempDiv.innerHTML = html;

//         // Get all <a> elements inside the fetched HTML
//         let links = tempDiv.getElementsByTagName("a");

//         let songs = [];
//         for (let i = 0; i < links.length; i++) {
//             let href = links[i].getAttribute("href");
//             if (href && href.endsWith(".mp3")) {
//                 // Convert relative link to full link
//                 let fullUrl = new URL(href, "http://127.0.0.1:5500/SONGS/").href;
//                 songs.push(fullUrl);
//             }
//         }

//         console.log(songs); // Final array of song URLs
//         return songs;
//     } catch (error) {
//         console.error("Error fetching songs:", error);
//         return [];
//     }
// }

// main();

//================================================================================================

// let playbarplay = document.getElementById("playbarplay")
// let currentSong = new Audio();
// let songs = [];
// let currFolder;

// async function getSongs(folder) {
//     currFolder = folder;
//     let a = await fetch(`http://127.0.0.1:5500/${folder}/`)
//     let response = await a.text();
//     let div = document.createElement("div");
//     div.innerHTML = response;

//     let as = div.getElementsByTagName("a")
//     songs = [];
//     for (let index = 0; index < as.length; index++) {
//         const element = as[index];
//         if (element.href.endsWith(".mp3"))
//             songs.push(element.href.split(`/${folder}/`)[1]);
//     }

//     // Show the songs in the playlist 
//     let songUL = document.querySelector(".song-list").getElementsByTagName("ul")[0];
//     songUL.innerHTML = "";
//     for (const song of songs) {

//         // FOR Song Name
//         let name = song;
//         let nameStr = String(name);
//         let nameStrSplit = nameStr.split("_")[0];
//         let nameStrSplit2 = String(nameStrSplit);
//         let outputOfName = nameStrSplit2.replaceAll("%20", " ");


//         // FOR Song Information
//         let info = song;
//         let infoStr = String(info);
//         let infoStrSplit = infoStr.split("_").slice(1);
//         let infoStrSplit2 = String(infoStrSplit);
//         let output = infoStrSplit2.replaceAll("%20", " ").replaceAll(".mp3", "");

//         songUL.innerHTML = songUL.innerHTML + `
        
//                        <li class="display"  data-file="${song}">
//                             <div class="logo-info display " >
//                                 <img class="invert" src="outline/outline-music.svg" alt="">
//                                 <div class="song-info">
//                                     <div><h4>${outputOfName}</h4></div>
//                                     <div><p>${output}</p></div>
//                                 </div>
//                             </div>
//                             <div class="play-song display ">
//                                 <img class="invert" src="outline/outline-play.svg" alt="">
//                             </div>
//                         </li>  `;
//     }

//     //Attach an event listner to each song
//     Array.from(document.querySelector(".song-list").getElementsByTagName('li')).forEach(element => {
//         element.addEventListener("click", () => {
//             let file = element.getAttribute("data-file");
//             playsong(decodeURI(file).trim())

//             // console.log(element.querySelector(".logo-info").children[1].firstElementChild.firstChild.innerHTML);
//             // playsong(element.querySelector(".logo-info").children[1].firstElementChild.firstChild.innerHTML.trim())
//         })
//     });

// }

// function playsong(track, pause = false) {
//     currentSong.src = `/${currFolder}/` + track;
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
//     let a = await fetch(`http://127.0.0.1:5500/SONGS/`)
//     let response = await a.text();
//     let div = document.createElement("div");
//     div.innerHTML = response;
//     let anchars = div.getElementsByTagName("a");
//     let cardContainer = document.querySelector(".card-container");
//     let array = Array.from(anchars)
//     for (let index = 0; index < array.length; index++) {
//         const e = array[index];

//         if (e.href.includes("/SONGS")) {
//             // console.log(e.href.split("/").slice(-1)[0]);
//             let folder = e.href.split("/").slice(-1)[0];
//             if (folder === "SONGS") continue;
//             // Get the metadata of the folder
//             let a = await fetch(`http://127.0.0.1:5500/SONGS/${folder}/info.json`);
//             let response = await a.json();
//             console.log(response);
//             cardContainer.innerHTML = cardContainer.innerHTML + `
//             <div data-folder="${folder}" class="card rounded">
//                         <div class="play">
//                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
//                                 <!-- Circular green background -->
//                                 <circle cx="24" cy="24" r="24" fill="green" />
//                                 <!-- Play button moved 2px down from original (1px up from last version) -->
//                                 <path fill="white" fill-rule="evenodd" clip-rule="evenodd"
//                                     d="M19 18c0-1.2 1.2-2 2.2-1.4l10 6c1 .6 1 2.2 0 2.8l-10 6c-1 .6-2.2-0.1-2.2-1.4V18z" />
//                             </svg>
//                         </div>
//                         <img class="rounded"  src="/SONGS/${folder}/COVER.jpeg"
//                             alt="Darro Not Available">
//                         <h4>${response.title}</h4>
//                         <p>${response.discription}</p>
//                     </div>`
//         }
//     }

//     // Load the playlist whenever the card is played
//     Array.from(document.getElementsByClassName("card")).forEach(e => {
//         e.addEventListener("click", async item => {
//             console.log(item.currentTarget.dataset);
//             songs = await getSongs(`SONGS/${item.currentTarget.dataset.folder}`)
//         })
//     })
// }

// async function main() {

//     // Get songs from above
//     await getSongs("SONGS/ncs")
//     console.log(songs);

//     playsong(songs[0], true)

//     //Display the Albums 
//     displayAlbums()

//     //Attach an event listner to play, previous ,next
//     playbarplay.addEventListener("click", () => {
//         if (currentSong.paused) {
//             console.log("Playiing");
//             currentSong.play();
//             playbarplay.src = "play.svg"
//         }
//         else {
//             console.log("Paused");
//             currentSong.pause();
//             playbarplay.src = "pause.svg"
//         }
//     })

//     //Attaching event listner with previous
//     previous.addEventListener("click", () => {
//         console.log(currentSong);
//         let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
//         if ((index - 1) >= 0) {
//             playsong(songs[index + 1])
//         }
//     })

//     //Attaching event listner with next
//     next.addEventListener("click", () => {
//         console.log(currentSong);
//         let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
//         if ((index + 1) < songs.length) {
//             playsong(songs[index + 1])
//         }
//         console.log(songs, index);
//     })

//     //Displaying the time of a song
//     currentSong.addEventListener("timeupdate", () => {
//         let current = newFunction(currentSong.currentTime);
//         let total = newFunction(currentSong.duration);

//         document.querySelector(".playbar-song-time").innerHTML = `${current} / ${total}`;
//         document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";

//     });

//     document.querySelector(".seekbar").addEventListener("click", (e) => {

//         let seekbar = document.querySelector(".seekbar");
//         let circle = document.querySelector(".circle");

//         let clickX = e.offsetX;
//         let seekbarWidth = seekbar.clientWidth;
//         let percent = (clickX / seekbarWidth) * 100;

//         circle.style.left = percent + "%";

//         // Jump song to that position
//         currentSong.currentTime = (percent / 100) * currentSong.duration;
//     })

//     //Adding an event to the volume range input
//     let volumeBarRange = document.querySelector(".volume input");
//     let SoundBefore = 0.50;//Defining this outside the event because we will uuse it in another event also
//     document.querySelector(".volume").getElementsByTagName("input")[0].addEventListener("input", (e) => {
//         SoundBefore = parseInt(e.target.value) / 100
//         currentSong.volume = parseInt(e.target.value) / 100;
//     })

//     //Adding an event volume range
//     document.querySelector(".volume input").addEventListener("input", () => {
//         let volumeRange = document.querySelector(".Volume-Button");
//         volumeRange.src = "volumeON.svg";
//     })

//     document.querySelector(".volume input").addEventListener("input", () => {
//         let volumeRange = document.querySelector(".Volume-Button");
//         if (parseInt(volumeBarRange.value) === 0){
//             volumeRange.src = "volumeOFF.svg";
//         }
//         else{
//             volumeRange.src = "volumeON.svg";
//         }
//     })

//     //adding an event to the volume svg itself
//     let soundOn = false;
//     document.querySelector(".Volume-Button ").addEventListener("click", (e) => {
//         if (!soundOn) {
//             currentSong.volume = 0;
//             volumeBarRange.value = 0;
//             document.querySelector(".Volume-Button ").src = "volumeOFF.svg";
//             console.log("sound OFF");
//             soundOn = true;
//         }
//         else {
//             currentSong.volume = SoundBefore;
//             volumeBarRange.value = SoundBefore * 100;
//             document.querySelector(".Volume-Button ").src = "volumeON.svg";
//             console.log("Sound ON");
//             soundOn = false;
//         }
//     })



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



// // async function main() {
// //     try {
// //         // Fetch the HTML of the SONGS folder
// //         let response = await fetch("http://127.0.0.1:5500/SONGS/");
// //         let html = await response.text();

// //         // Create a temporary DOM to parse the HTML
// //         let tempDiv = document.createElement("div");
// //         tempDiv.innerHTML = html;

// //         // Get all <a> elements inside the fetched HTML
// //         let links = tempDiv.getElementsByTagName("a");

// //         let songs = [];
// //         for (let i = 0; i < links.length; i++) {
// //             let href = links[i].getAttribute("href");
// //             if (href && href.endsWith(".mp3")) {
// //                 // Convert relative link to full link
// //                 let fullUrl = new URL(href, "http://127.0.0.1:5500/SONGS/").href;
// //                 songs.push(fullUrl);
// //             }
// //         }

// //         console.log(songs); // Final array of song URLs
// //         return songs;
// //     } catch (error) {
// //         console.error("Error fetching songs:", error);
// //         return [];
// //     }
// // }

// // main();
