// renderer.js - Frontend logic
const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const trackName = document.getElementById('trackName');
const trackDetails = document.getElementById('trackDetails');
const progress = document.getElementById('progress');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const addFileBtn = document.getElementById('addFileBtn');
const addFolderBtn = document.getElementById('addFolderBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const playlistElement = document.getElementById('playlist');
const transformBtn = document.getElementById('transformBtn');
const status = document.getElementById('status');
const loadingOverlay = document.getElementById('loadingOverlay');

let playlist = [];
let currentIndex = -1;

// Initialize
audioPlayer.volume = 0.7;

// Add event listeners
playBtn.addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
stopBtn.addEventListener('click', stop);
prevBtn.addEventListener('click', previousTrack);
nextBtn.addEventListener('click', nextTrack);
volumeSlider.addEventListener('input', changeVolume);
addFileBtn.addEventListener('click', addFile);
addFolderBtn.addEventListener('click', addFolder);
clearPlaylistBtn.addEventListener('click', clearPlaylist);
transformBtn.addEventListener('click', transformAudio);

// Audio player events
audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('loadedmetadata', updateDuration);
audioPlayer.addEventListener('ended', nextTrack);

// Progress bar click
document.querySelector('.progress-bar').addEventListener('click', seek);

// Add file to playlist
async function addFile() {
  const filePath = await window.electronAPI.selectAudioFile();
  if (filePath) {
    addToPlaylist(filePath);
  }
}

// Add folder to playlist
async function addFolder() {
  const files = await window.electronAPI.selectAudioFolder();
  if (files && files.length > 0) {
    files.forEach(file => addToPlaylist(file));
    status.textContent = `Added ${files.length} files`;
    setTimeout(() => status.textContent = 'Ready', 3000);
  }
}

// Add track to playlist
async function addToPlaylist(filePath) {
  // Check if already in playlist
  if (playlist.find(track => track.path === filePath)) {
    return;
  }

  const fileInfo = await window.electronAPI.getFileInfo(filePath);
  const track = {
    name: fileInfo.name,
    path: filePath
  };

  playlist.push(track);
  renderPlaylist();
}

// Render playlist
function renderPlaylist() {
  if (playlist.length === 0) {
    playlistElement.innerHTML = '<div class="empty-playlist">Add audio files to get started</div>';
    return;
  }

  playlistElement.innerHTML = '';
  playlist.forEach((track, index) => {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    if (index === currentIndex) {
      item.classList.add('active');
    }
    
    item.innerHTML = `
      <div class="playlist-item-name">${track.name}</div>
    `;
    
    item.addEventListener('click', () => {
      currentIndex = index;
      loadTrack();
      play();
    });
    
    playlistElement.appendChild(item);
  });
}

// Clear playlist
function clearPlaylist() {
  stop();
  playlist = [];
  currentIndex = -1;
  renderPlaylist();
  trackName.textContent = 'No track loaded';
  trackDetails.textContent = '';
  status.textContent = 'Playlist cleared';
  setTimeout(() => status.textContent = 'Ready', 3000);
}

// Load track
function loadTrack() {
  if (currentIndex >= 0 && currentIndex < playlist.length) {
    const track = playlist[currentIndex];
    audioPlayer.src = track.path;
    trackName.textContent = track.name;
    trackDetails.textContent = track.path;
    renderPlaylist();
  }
}

// Play
function play() {
  if (playlist.length === 0) {
    status.textContent = 'Add files to playlist first';
    setTimeout(() => status.textContent = 'Ready', 3000);
    return;
  }

  if (currentIndex === -1) {
    currentIndex = 0;
    loadTrack();
  }

  audioPlayer.play();
  playBtn.style.display = 'none';
  pauseBtn.style.display = 'flex';
  status.textContent = 'Playing';
}

// Pause
function pause() {
  audioPlayer.pause();
  playBtn.style.display = 'flex';
  pauseBtn.style.display = 'none';
  status.textContent = 'Paused';
}

// Stop
function stop() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  playBtn.style.display = 'flex';
  pauseBtn.style.display = 'none';
  status.textContent = 'Stopped';
}

// Previous track
function previousTrack() {
  if (playlist.length === 0) return;
  
  currentIndex--;
  if (currentIndex < 0) {
    currentIndex = playlist.length - 1;
  }
  
  loadTrack();
  play();
}

// Next track
function nextTrack() {
  if (playlist.length === 0) return;
  
  currentIndex++;
  if (currentIndex >= playlist.length) {
    currentIndex = 0;
  }
  
  loadTrack();
  play();
}

// Change volume
function changeVolume(e) {
  const volume = e.target.value / 100;
  audioPlayer.volume = volume;
  volumeValue.textContent = `${e.target.value}%`;
}

// Update progress bar
function updateProgress() {
  if (audioPlayer.duration) {
    const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = `${percentage}%`;
    currentTime.textContent = formatTime(audioPlayer.currentTime);
  }
}

// Update duration display
function updateDuration() {
  if (audioPlayer.duration) {
    duration.textContent = formatTime(audioPlayer.duration);
  }
}

// Seek in track
function seek(e) {
  const progressBar = e.currentTarget;
  const clickX = e.offsetX;
  const width = progressBar.offsetWidth;
  const percentage = clickX / width;
  
  if (audioPlayer.duration) {
    audioPlayer.currentTime = audioPlayer.duration * percentage;
  }
}

// Format time (seconds to mm:ss)
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Transform audio
async function transformAudio() {
  if (currentIndex === -1 || playlist.length === 0) {
    status.textContent = 'Please select a track first';
    setTimeout(() => status.textContent = 'Ready', 3000);
    return;
  }

  const currentTrack = playlist[currentIndex];
  
  // Disable button and show loading
  transformBtn.disabled = true;
  loadingOverlay.style.display = 'flex';
  status.textContent = 'Transforming...';

  try {
    const result = await window.electronAPI.transformAudio(currentTrack.path);
    
    loadingOverlay.style.display = 'none';
    transformBtn.disabled = false;
    
    if (result.success) {
      status.textContent = 'Transformation complete! ✓';
      await addToPlaylist(result.outputFile);
    }
  } catch (error) {
    console.error(error);
    status.textContent = 'Error during transformation';
    loadingOverlay.style.display = 'none';
    transformBtn.disabled = false;
  }
}