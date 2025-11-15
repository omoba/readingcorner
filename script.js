// ==================== IMPORT FIREBASE MODULES ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// ==================== CONFIG & INITIALIZATION ====================
const firebaseConfig = {
  apiKey: "AIzaSyBcki4xFMJkWaRWDMKgXBFG47j_HMtDkJQ",
  authDomain: "littlemuslimreading.firebaseapp.com",
  projectId: "littlemuslimreading",
  storageBucket: "littlemuslimreading.appspot.com",
  messagingSenderId: "475924759605",
  appId: "1:475924759605:web:32a35f3d530171bcbcdd7c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Firebase initialization logging
if (typeof console !== 'undefined' && console.log) {
  console.log("✅ Firebase initialized");
}

// ==================== AUTHENTICATION SECTION ====================
const authContainer = document.getElementById("auth-container");
const appContainer = document.querySelector(".container");
const logoutBtn = document.getElementById("logoutBtn");
const logoutContainer = document.getElementById("logout-container");
const authStatus = document.getElementById("auth-status");

// Login
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Login successful for user:", email);
  } catch (err) {
    console.error("Login error:", err);
    alert("❌ Login failed: " + (err.message || "Unknown error"));
  }
});

// Register
document.getElementById("registerBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    console.log("Registration successful for user:", email);
    alert("✅ Registered successfully");
  } catch (err) {
    console.error("Registration error:", err);
    alert("❌ Registration failed: " + (err.message || "Unknown error"));
  }
});






// Clear reading positions for all stories
function clearAllReadingPositions() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('readingPosition_')) {
      localStorage.removeItem(key);
    }
  });
}

// Stop TTS on logout
logoutBtn.addEventListener("click", async () => {
  try {
    stopSpeaking();
    clearAllReadingPositions();
    // Clear saved states
    localStorage.removeItem("currentPage");
    localStorage.removeItem("currentStoryId");
    sessionStorage.clear();

    // Sign out from Firebase
    await signOut(auth);

    console.log("✅ User logged out and session cleared");
    

    // Force full page reload to reset in-memory state
    window.location.reload();
  } catch (error) {
    console.error("Logout error:", error);
    alert("Logout failed. Please try again.");
  }
});

// Monitor Login State
onAuthStateChanged(auth, (user) => {
  // ✅ Show body only after auth check
  document.body.style.visibility = "visible";
  if (user) {
    authContainer.style.display = "none";
    logoutContainer.style.display = "block";
    // Hide panels initially to prevent flash
    const storyPanel = document.getElementById("story-panel");
    const hadithPanel = document.getElementById("hadith-panel");
    storyPanel.style.display = "none";
    hadithPanel.style.display = "none";
    appContainer.style.display = "flex";
    initializeAppContent(user.uid);
  } else {
    // Logged out logic:
    document.body.classList.remove("homepage-active"); 
    authContainer.style.display = "block";
    appContainer.style.display = "none";
    logoutContainer.style.display = "none";
  }
});

// ==================== SESSION STATE HELPERS ====================
function saveAppState(state) {
  sessionStorage.setItem("currentView", JSON.stringify(state));
}

function loadAppState() {
  const raw = sessionStorage.getItem("currentView");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ==================== TTS FUNCTIONALITY ====================
function getMultilingualVoice() {
  const voices = speechSynthesis.getVoices();
  
  // Try to find Ava Multilingual Neural voice first
  let voice = voices.find(v => v.name.includes('AvaMultilingualNeural') || v.voiceURI.includes('AvaMultilingualNeural'));
  
  // Fallback to any Ava voice
  if (!voice) {
    voice = voices.find(v => v.name.toLowerCase().includes('ava'));
  }
  
  // Final fallback to any English voice
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith('en'));
  }
  
  return voice;
}



let audioState = {
  isPlaying: false,
  isPaused: false,
  currentButton: null,
  currentText: '',
  pausedAt: 0,
  startTime: 0,
  currentStoryId: null,
  currentUtterance: null
};

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    audioState.isPlaying = false;
    audioState.isPaused = false;
    audioState.pausedAt = 0;
    if (audioState.currentButton) {
      if (audioState.currentButton.innerHTML.includes('Listen')) {
        audioState.currentButton.innerHTML = '🔊 Listen';
      } else {
        audioState.currentButton.innerHTML = '🔊';
      }
    }
    audioState.currentButton = null;
    audioState.currentText = '';
  }
}

function addPunctuationPauses(text) {
  return text
    // Replace Islamic phrases with phonetic pronunciations
    .replace(/\b(allahu akbar)\b/gi, 'al laa hu akbar')
    .replace(/\b(subhanallah)\b/gi, 'soob haa na llaah')
    .replace(/\b(alhamdulillah)\b/gi, 'al haam du leel laah')
    .replace(/\b(audhubillah)\b/gi, 'a uhoo dzu bil laah')
    .replace(/\b(bismillah)\b/gi, 'bis mil laah')
    .replace(/\b(astaghfirullah)\b/gi, 'Astag feerul laaah')
    .replace(/\b(maa shaa allah|mashaallah)\b/gi, 'maa shaa Al laah')
    .replace(/\b(assalaam alaykum|as-salamu alaykum)\b/gi, 'assa laam a lay koom')
    .replace(/\b(wa alaykum as-salam|wa alaykum assalam)\b/gi, 'wa a lay koom assa laam')
    .replace(/\b(insha allah|inshallah)\b/gi, 'in shaa Al laah')
    .replace(/\b(barakallahu feeki|barakallahu feek)\b/gi, 'baa ra ka llaahu fee ki')
    .replace(/\b(jazakallahu khairan)\b/gi, 'jaa za ka llaahu khay ran')
    .replace(/\b(la hawla wa la quwwata illa billah)\b/gi, 'laa hawla wa laa quwwata illa bil laah')
    .replace(/\b(astaghfirullah al-azeem)\b/gi, 'astag feerul laah al a zeem')
    .replace(/\b(rabbi ighfir li)\b/gi, 'rabbi igh fir lee')
    .replace(/\b(salallahu alayhi wa sallam)\b/gi, 'sal lal laahu a lay hi wa sal lam')
    .replace(/\b(peace be upon him)\b/gi, 'peace be upon him')
    .replace(/\(ﷺ\)/g, 'peace be upon him')
    .replace(/\[([^\]]+)\]/g, 'Collected by $1')
    // Handle quotation marks with proper pauses
    .replace(/'/g, ' ')
    .replace(/"/g, ' ')
    // Punctuation pauses with proper timing
    .replace(/\./g, '. ... ')
    .replace(/\!/g, '! ... ')
    .replace(/\?/g, '? ... ')
    .replace(/;/g, '; .. ')
    .replace(/:/g, ': .. ')
    .replace(/,/g, ', . ')
    // Handle parentheses with slight pauses
    .replace(/\(/g, ' .. (')
    .replace(/\)/g, ') .. ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function speakFromPosition(text, startPosition = 0) {
  const words = text.split(' ');
  const textToSpeak = words.slice(startPosition).join(' ');
  
  if (!textToSpeak.trim()) {
    stopSpeaking();
    return;
  }
  
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.addEventListener('voiceschanged', () => {
      speakFromPosition(text, startPosition);
    }, { once: true });
    return;
  }
  
  const processedText = addPunctuationPauses(textToSpeak);
  const utterance = new SpeechSynthesisUtterance(processedText);
  audioState.currentUtterance = utterance;
  
  const selectedVoice = getMultilingualVoice();
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  utterance.pitch = 1.2;
  utterance.volume = 0.9;
  
  // Track word position during speech
  let wordIndex = startPosition;
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      wordIndex++;
      audioState.pausedAt = wordIndex;
      saveReadingPosition(audioState.currentStoryId, wordIndex);
    }
  };
  
  utterance.onend = () => {
    saveReadingPosition(audioState.currentStoryId, words.length);
    stopSpeaking();
  };
  
  utterance.onerror = () => {
    stopSpeaking();
  };
  
  speechSynthesis.speak(utterance);
}

function saveReadingPosition(storyId, position) {
  if (storyId !== null) {
    localStorage.setItem(`readingPosition_${storyId}`, position);
  }
}

function updateProgressBar(progressElement, text, storyId) {
  const words = text.split(' ');
  const totalWords = words.length;
  
  const updateProgress = () => {
    if (audioState.currentStoryId === storyId && audioState.isPlaying) {
      const progress = (audioState.pausedAt / totalWords) * 100;
      progressElement.style.width = progress + '%';
      setTimeout(updateProgress, 500);
    }
  };
  updateProgress();
}

function getReadingPosition(storyId) {
  const saved = localStorage.getItem(`readingPosition_${storyId}`);
  return saved ? parseInt(saved) : 0;
}

function speakTextWithControls(button, text, storyId = null) {
  // If currently playing, pause and track position
  if (audioState.isPlaying && audioState.currentButton === button) {
    speechSynthesis.cancel();
    audioState.isPlaying = false;
    audioState.isPaused = true;
    
    if (button.innerHTML.includes('Listen')) {
      button.innerHTML = '🔊 Listen';
    } else {
      button.innerHTML = '🔊';
    }
    return;
  }
  
  // If paused, resume from saved position
  if (audioState.isPaused && audioState.currentButton === button) {
    audioState.isPlaying = true;
    audioState.isPaused = false;
    audioState.startTime = Date.now();
    
    if (button.innerHTML.includes('Listen')) {
      button.innerHTML = '⏸️ Listen';
    } else {
      button.innerHTML = '⏸️';
    }
    
    speakFromPosition(text, audioState.pausedAt);
    return;
  }
  
  // Start new audio from saved position or beginning
  audioState.isPlaying = true;
  audioState.isPaused = false;
  audioState.currentButton = button;
  audioState.currentText = text;
  audioState.currentStoryId = storyId;
  audioState.pausedAt = storyId ? getReadingPosition(storyId) : 0;
  audioState.startTime = Date.now();
  
  if (button.innerHTML.includes('Listen')) {
    button.innerHTML = '⏸️ Listen';
  } else {
    button.innerHTML = '⏸️';
  }
  
  speakFromPosition(text, audioState.pausedAt);
}



// ==================== MAIN APP SECTION ====================
function initializeAppContent(userId) {
  let currentStoryIndex = null;
  let stories = [];
  let hadiths = [];
  let quizzes = [];
  let completedStories = new Set(JSON.parse(localStorage.getItem(`completedStories_${userId}`) || "[]"));
  let streakData = JSON.parse(localStorage.getItem(`streakData_${userId}`) || '{"currentStreak": 0, "longestStreak": 0, "lastReadDate": null, "readDates": []}');
  let playerScore = JSON.parse(localStorage.getItem(`playerScore_${userId}`) || '{"totalPoints": 0, "quizzesCompleted": 0, "averageScore": 0}');
  
  // Quiz game state
  let quizState = {
    currentQuestion: 0,
    timeLeft: 15,
    timer: null,
    score: 0,
    answers: [],
    isAnswered: false
  };

  const storyPanel = document.getElementById("story-panel");
  const hadithPanel = document.getElementById("hadith-panel");
  const tileScrollWrapper = document.querySelector(".tile-scroll-wrapper"); 
  const scrollHintArrow = document.getElementById("scroll-hint-arrow");
  const scrollFadeHint = document.getElementById("scroll-fade-hint");
  let arrowInterval = null; 

  // --- ARROW & FADE HINT LOGIC ---
  function setScrollHints(show) {
    if (show) {
      scrollHintArrow.style.display = "block";
      scrollHintArrow.style.animationPlayState = "running";
    } else {
      scrollHintArrow.style.display = "none";
      scrollHintArrow.style.animationPlayState = "paused";
      scrollFadeHint.style.display = "none";
    }
  }

  function checkScrollPosition() {
    if (!document.body.classList.contains("homepage-active")) return;

    const isScrollable = tileScrollWrapper.scrollHeight > tileScrollWrapper.clientHeight;
    const isScrolledToBottom = (tileScrollWrapper.scrollTop + tileScrollWrapper.clientHeight) >= (tileScrollWrapper.scrollHeight - 5); 

    if (isScrollable && !isScrolledToBottom) {
      scrollFadeHint.style.display = "block";
    } else {
      scrollFadeHint.style.display = "none";
      stopArrowHint();
    }
  }
  
  function startArrowHint() {
    stopArrowHint(); 
    const isScrollable = tileScrollWrapper.scrollHeight > tileScrollWrapper.clientHeight;
    if (isScrollable && tileScrollWrapper.scrollTop <= 5) {
      setScrollHints(true);
    }

    arrowInterval = setInterval(() => {
      const isScrolledToBottom = (tileScrollWrapper.scrollTop + tileScrollWrapper.clientHeight) >= (tileScrollWrapper.scrollHeight - 5);
      if (!isScrolledToBottom) {
        setScrollHints(true);
      } else {
        setScrollHints(false);
      }
    }, 5000);
  }

  function stopArrowHint() {
    if (arrowInterval) clearInterval(arrowInterval);
    scrollHintArrow.style.display = "none";
    scrollHintArrow.style.animationPlayState = "paused";
  }

  tileScrollWrapper.addEventListener("scroll", () => {
    stopArrowHint(); 
    checkScrollPosition();
    startArrowHint(); 
  });

 
    const savedState = null;
    sessionStorage.setItem("activeUserId", userId);


Promise.all([
  fetch("stories.json").then(res => {
    if (!res.ok) throw new Error(`Failed to load stories: ${res.status}`);
    return res.json();
  }),
  fetch("quiz.json").then(res => {
    if (!res.ok) throw new Error(`Failed to load quiz: ${res.status}`);
    return res.json();
  })
]).then(([storiesData, quizzesData]) => {
  if (!storiesData || !storiesData.stories || !storiesData.hadith) {
    throw new Error("Invalid stories data format");
  }
  if (!Array.isArray(quizzesData)) {
    throw new Error("Invalid quiz data format");
  }
  
  stories = storiesData.stories;
  hadiths = storiesData.hadith;
  quizzes = quizzesData;

  // Restore saved state after both JSONs are loaded
  if (savedState && savedState.page) {
    switch (savedState.page) {
      case "story":
        if (savedState.index >= 0 && savedState.index < stories.length) {
          loadStory(savedState.index);
        } else {
          loadHomepage();
        }
        break;
      case "quiz":
        if (savedState.index >= 0 && savedState.index < stories.length) {
          loadQuiz(savedState.index);
        } else {
          loadHomepage();
        }
        break;
      case "cover":
        if (savedState.index >= 0 && savedState.index < stories.length) {
          showCover(savedState.index);
        } else {
          loadHomepage();
        }
        break;
      case "homepage":
      default:
        loadHomepage();
        break;
    }
  } else {
    loadHomepage();
  }
}).catch(err => {
  console.error("Error loading data:", err);
  alert("Failed to load application data. Please refresh the page.");
});


  // ------------------ STREAK FUNCTIONS ------------------
  function updateStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (streakData.lastReadDate !== today) {
      if (streakData.lastReadDate === yesterday) {
        streakData.currentStreak++;
      } else if (streakData.lastReadDate !== null) {
        streakData.currentStreak = 1;
      } else {
        streakData.currentStreak = 1;
      }
      
      streakData.lastReadDate = today;
      if (!streakData.readDates.includes(today)) {
        streakData.readDates.push(today);
      }
      
      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }
      
      localStorage.setItem(`streakData_${userId}`, JSON.stringify(streakData));
    }
  }
  
  function createStreakPanel() {
    const streakPanel = document.createElement('div');
    streakPanel.style.cssText = `
      background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
      border-radius: 15px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      animation: fadeInDown 0.8s ease-out;
    `;
    
    const completionPercentage = Math.round((completedStories.size / stories.length) * 100);
    
    streakPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 2em; margin-bottom: 5px;">🔥</div>
          <div style="font-size: 1.5em; font-weight: bold; color: #d32f2f;">${streakData.currentStreak}</div>
          <div style="font-size: 0.9em; color: #666;">Days Reading Streak</div>
        </div>
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 2em; margin-bottom: 5px;">🏆</div>
          <div style="font-size: 1.5em; font-weight: bold; color: #f57c00;">${playerScore.totalPoints}</div>
          <div style="font-size: 0.9em; color: #666;">Total Quiz Points</div>
        </div>
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 2em; margin-bottom: 5px;">📚</div>
          <div style="font-size: 1.5em; font-weight: bold; color: #388e3c;">${completionPercentage}%</div>
          <div style="font-size: 0.9em; color: #666;">Stories Completed</div>
        </div>
      </div>
    `;
    
    return streakPanel;
  }

  // ------------------ HOMEPAGE ------------------
  function loadHomepage() {
    clearAllReadingPositions();
    saveAppState({ page: "homepage" });

    document.body.classList.add("homepage-active");
    hadithPanel.style.display = "none";
    storyPanel.style.display = "flex"; 
    tileScrollWrapper.innerHTML = ""; 
    tileScrollWrapper.style.display = "block"; 
    storyPanel.innerHTML = ""; 
    storyPanel.appendChild(scrollHintArrow);
    storyPanel.appendChild(scrollFadeHint);
    tileScrollWrapper.scrollTop = 0;
    
    // Add fixed streak panel above scroll area
    const streakPanel = createStreakPanel();
    storyPanel.insertBefore(streakPanel, scrollHintArrow);
    
    // Adjust tile wrapper to account for streak panel height
    tileScrollWrapper.style.marginTop = '0';
    tileScrollWrapper.style.paddingTop = '10px';

    const grid = document.createElement("div");
    grid.classList.add("story-grid");
    grid.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 20px;
    `;

    stories.forEach((story, idx) => {
      const tile = document.createElement("div");
      tile.classList.add("story-tile");
      tile.dataset.index = idx;

      const imageSrc = `images/${encodeURIComponent(story.title)}.jpeg`;
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = story.title;
      img.className = 'tile-image';
      img.onerror = function() { this.style.display = 'none'; };
      
      const title = document.createElement('h3');
      title.textContent = story.title;
      
      tile.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        cursor: pointer;
        width: 200px;
        min-height: 250px;
      `;
      
      tile.appendChild(img);
      tile.appendChild(title);

      if (completedStories.has(idx)) {
        const imprint = document.createElement("div");
        imprint.classList.add("read-imprint");
        imprint.textContent = "READ";
        tile.appendChild(imprint);
      }

      tile.addEventListener("click", () => showCover(idx));

      grid.appendChild(tile);
    });

    tileScrollWrapper.appendChild(grid); 
    storyPanel.appendChild(tileScrollWrapper);

    setTimeout(() => {
      checkScrollPosition();
      startArrowHint(); 
    }, 50); 
  }

  // ------------------ COVER PAGE ------------------
  function showCover(idx) {
    clearAllReadingPositions();
    saveAppState({ page: "cover", index: idx });

    const coverPage = document.getElementById("cover-page");
    const coverImage = document.getElementById("cover-image");
    
    // Clear existing content and rebuild
    coverPage.innerHTML = '';
    
    // Add story title above image
    const storyTitle = document.createElement('h1');
    storyTitle.textContent = stories[idx].title;
    storyTitle.style.cssText = `
      color: #8B4513;
      margin: 20px 0;
      font-size: 2.2em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    `;
    
    // Recreate image
    const newCoverImage = document.createElement('img');
    newCoverImage.src = `images/${encodeURIComponent(stories[idx].title)}.jpeg`;
    newCoverImage.alt = 'Story Cover';
    newCoverImage.style.cssText = 'max-width: 80%; height: auto;';
    
    // Add hidden read button (for compatibility)
    const readBtn = document.createElement('button');
    readBtn.id = 'cover-read-btn';
    readBtn.textContent = 'READ';
    readBtn.style.display = 'none';
    
    coverPage.appendChild(storyTitle);
    coverPage.appendChild(newCoverImage);
    coverPage.appendChild(readBtn);
    
    coverPage.style.display = "flex";
    coverPage.style.flexDirection = "column";
    coverPage.style.alignItems = "center";
    coverPage.style.justifyContent = "center";
    setScrollHints(false);
    storyPanel.style.display = "none";
    hadithPanel.style.display = "none";
    
    // Create loading progress bar
    const loadingDiv = document.createElement("div");
    loadingDiv.style.cssText = "margin-top: 20px; text-align: center;";
    
    const loadingText = document.createElement("p");
    loadingText.textContent = "Loading story...";
    loadingText.style.cssText = "margin: 0 0 10px 0; color: #666;";
    
    const progressContainer = document.createElement("div");
    progressContainer.style.cssText = `
      width: 200px;
      height: 8px;
      background-color: #f3f3f3;
      border-radius: 4px;
      margin: 0 auto;
      overflow: hidden;
    `;
    
    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background-color: #3498db;
      border-radius: 4px;
      transition: width 0.1s ease;
    `;
    
    progressContainer.appendChild(progressBar);
    loadingDiv.appendChild(loadingText);
    loadingDiv.appendChild(progressContainer);
    coverPage.appendChild(loadingDiv);
    
    // Animate progress bar
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      progressBar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
    
    // Stop progress animation when TTS ends
    setTimeout(() => {
      const utterance = speechSynthesis.speaking;
      if (!utterance) {
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
      }
    }, 2000);
    
    // Add hadith display to cover page
    const hadith = hadiths[stories[idx].hadithIndex];
    const hadithDiv = document.createElement('div');
    hadithDiv.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin: 60px auto 20px auto;
      max-width: 80%;
      text-align: center;
    `;
    
    const hadithTitle = document.createElement('h3');
    hadithTitle.textContent = 'Hadith';
    hadithTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 1.2em;';
    
    const hadithText = document.createElement('p');
    hadithText.textContent = hadith.text;
    hadithText.style.cssText = 'margin: 0; line-height: 1.5; font-size: 1.3em;';
    
    hadithDiv.appendChild(hadithTitle);
    hadithDiv.appendChild(hadithText);
    coverPage.insertBefore(hadithDiv, loadingDiv);
    
    // Auto-read title and hadith with TTS
    setTimeout(() => {
      const hadithQuote = hadith.text.replace(/The Prophet \(ﷺ\) said: '/g, '').replace(/The Prophet \(ﷺ\) was asked: .* He said: '/g, '').replace(/\[([^\]]+)\]/g, 'Collected by $1');
      const ttsText = `${stories[idx].title}. Based on the Hadith of the prophet, peace be upon him, ${hadithQuote}`;
      
      const speakCoverText = () => {
        const utterance = new SpeechSynthesisUtterance(ttsText);
        const selectedVoice = getMultilingualVoice();
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        
        utterance.onend = () => {
          setTimeout(() => {
            loadingDiv.remove();
            coverPage.style.display = "none";
            storyPanel.style.display = "block"; 
            hadithPanel.style.display = "none";
            loadStory(idx);
          }, 2000);
        };
        
        speechSynthesis.speak(utterance);
      };
      
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener('voiceschanged', speakCoverText, { once: true });
      } else {
        speakCoverText();
      }
    }, 1000);
  }

  // ------------------ STORY PAGE ------------------
  function loadStory(index) {
    currentStoryIndex = index;
    saveAppState({ page: "story", index });

    setScrollHints(false);
    document.body.classList.remove("homepage-active"); 
    tileScrollWrapper.style.display = "none"; 
    storyPanel.style.cssText = "display: block; height: 100vh; overflow: hidden;";
    hadithPanel.style.display = "none";
    storyPanel.innerHTML = ""; 
    
    // Add CSS animations if not already added
    if (!document.getElementById('story-animations')) {
      const style = document.createElement('style');
      style.id = 'story-animations';
      style.textContent = `
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.4; transform: translateY(0px); }
          50% { opacity: 1; transform: translateY(5px); }
        }
        /* Hide scrollbars globally */
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }

    const story = stories[index];
    const hadith = hadiths[story.hadithIndex];

    const storyDiv = document.createElement("div");
    storyDiv.classList.add("story");
    storyDiv.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      border-radius: 20px;
      box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3);
      position: relative;
      height: 100vh;
      display: flex;
      flex-direction: column;
      animation: fadeInRight 0.8s ease-out;
      border: 2px solid rgba(255,255,255,0.2);
    `;
    
    // Fixed header
    const storyHeader = document.createElement('div');
    storyHeader.style.cssText = `
      padding: 25px 25px 0 25px;
      flex-shrink: 0;
    `;
    
    // Add sparkle decorations to header
    for(let i = 0; i < 3; i++) {
      const sparkle = document.createElement('div');
      sparkle.textContent = '✨';
      sparkle.style.cssText = `
        position: absolute;
        font-size: 20px;
        animation: sparkle 2s ease-in-out infinite;
        animation-delay: ${i * 0.5}s;
        top: ${20 + i * 15}px;
        right: ${10 + i * 15}px;
      `;
      storyHeader.appendChild(sparkle);
    }
    
    const storyTitleRow = document.createElement('div');
    storyTitleRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const storyHeaderPlayBtn = document.createElement('button');
    storyHeaderPlayBtn.innerHTML = '🔊';
    storyHeaderPlayBtn.style.cssText = `
      background: rgba(255,255,255,0.25);
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 1.2em;
      margin-left: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
    `;
    storyHeaderPlayBtn.onclick = () => {
      const textContent = story.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      speakTextWithControls(storyHeaderPlayBtn, textContent, `story_${index}`);
    };
    
    const storyTitle = document.createElement('h2');
    storyTitle.textContent = '📖 ' + story.title;
    storyTitle.style.cssText = `
      color: white;
      margin: 0;
      font-size: 2em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
      animation: slideInDown 0.6s ease-out;
      font-weight: bold;
    `;
    
    storyTitleRow.appendChild(storyTitle);
    storyTitleRow.appendChild(storyHeaderPlayBtn);
    storyHeader.appendChild(storyTitleRow);
    
    // Scrollable content
    const storyScrollContent = document.createElement('div');
    storyScrollContent.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px 25px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    `;
    storyScrollContent.style.setProperty('-webkit-scrollbar', 'none', 'important');
    
    const storyContent = document.createElement('div');
    storyContent.innerHTML = story.text;
    storyContent.style.cssText = `
      color: white;
      line-height: 1.8;
      font-size: 1.2em;
      animation: fadeIn 1s ease-out 0.4s both;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    `;
    storyScrollContent.appendChild(storyContent);
    
    // Add hadith section beneath story
    const hadithSection = document.createElement('div');
    hadithSection.style.cssText = `
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      padding: 25px;
      border-radius: 15px;
      margin: 40px 0;
      animation: fadeIn 1s ease-out 0.6s both;
      box-shadow: 0 8px 25px rgba(79, 172, 254, 0.3);
      border: 1px solid rgba(255,255,255,0.2);
    `;
    
    const hadithTitle = document.createElement('h3');
    hadithTitle.textContent = 'Hadith';
    hadithTitle.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 1.3em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    `;
    
    const hadithText = document.createElement('p');
    hadithText.textContent = hadith.text;
    hadithText.style.cssText = `
      line-height: 1.6;
      font-size: 1.1em;
      margin: 0 0 10px 0;
    `;
    
    const hadithPlayBtn = document.createElement('button');
    hadithPlayBtn.innerHTML = '🔊 Listen';
    hadithPlayBtn.style.cssText = `
      background: rgba(255,255,255,0.2);
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.9em;
    `;
    hadithPlayBtn.onclick = () => {
      const textContent = hadith.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      speakTextWithControls(hadithPlayBtn, textContent, `hadith_${index}`);
    };
    
    hadithSection.appendChild(hadithTitle);
    hadithSection.appendChild(hadithText);
    hadithSection.appendChild(hadithPlayBtn);
    storyScrollContent.appendChild(hadithSection);
    
    // Add scroll indicator
    const scrollIndicator = document.createElement('div');
    scrollIndicator.innerHTML = '⬇️';
    scrollIndicator.style.cssText = `
      position: absolute;
      bottom: 120px;
      right: 25px;
      font-size: 24px;
      animation: scrollPulse 2s infinite;
      z-index: 10;
      pointer-events: none;
    `;
    storyDiv.appendChild(scrollIndicator);
    
    // Hide scroll indicator when scrolled or when content fits
    const checkScrollIndicator = () => {
      const isScrollable = storyScrollContent.scrollHeight > storyScrollContent.clientHeight;
      const isScrolledDown = storyScrollContent.scrollTop > 50;
      scrollIndicator.style.display = (isScrollable && !isScrolledDown) ? 'block' : 'none';
    };
    
    storyScrollContent.addEventListener('scroll', checkScrollIndicator);
    setTimeout(checkScrollIndicator, 1000);
    
    // Fixed footer with buttons
    const storyFooter = document.createElement('div');
    storyFooter.style.cssText = `
      padding: 0 25px 25px 25px;
      flex-shrink: 0;
    `;
    
    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';
    btnRow.style.cssText = `
      animation: slideInUp 0.8s ease-out 0.6s both;
      display: flex;
      justify-content: center;
      gap: 15px;
    `;
    
    const doneBtn = document.createElement('button');
    doneBtn.id = 'doneBtn';
    doneBtn.textContent = '✅ DONE READING';
    doneBtn.style.cssText = `
      background: linear-gradient(45deg, #2196F3, #1976D2);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
      transition: all 0.3s ease;
    `;
    
    const homeBtn = document.createElement('button');
    homeBtn.id = 'homeBtn';
    homeBtn.textContent = '🏠 BACK TO HOMEPAGE';
    homeBtn.style.cssText = `
      background: linear-gradient(45deg, #2196F3, #1976D2);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
      transition: all 0.3s ease;
    `;
    
    // Add hover effects
    doneBtn.onmouseover = () => doneBtn.style.transform = 'translateY(-2px) scale(1.05)';
    doneBtn.onmouseout = () => doneBtn.style.transform = 'translateY(0) scale(1)';
    homeBtn.onmouseover = () => homeBtn.style.transform = 'translateY(-2px) scale(1.05)';
    homeBtn.onmouseout = () => homeBtn.style.transform = 'translateY(0) scale(1)';
    
    btnRow.appendChild(doneBtn);
    btnRow.appendChild(homeBtn);
    
    // Remove individual margins since we're using flexbox gap
    doneBtn.style.marginRight = '0';
    homeBtn.style.marginLeft = '0';
    storyFooter.appendChild(btnRow);
    
    storyDiv.appendChild(storyHeader);
    storyDiv.appendChild(storyScrollContent);
    storyDiv.appendChild(storyFooter);
    storyPanel.appendChild(storyDiv);

    document.getElementById("doneBtn").addEventListener("click", () => {
      // Update reading streak when user clicks DONE READING
      updateStreak();
      
      // Mark story as completed and add READ stamp
      completedStories.add(index);
      localStorage.setItem(`completedStories_${userId}`, JSON.stringify([...completedStories]));
      animateReadStamp(index);
      
      // Change button text and functionality
      const doneBtn = document.getElementById("doneBtn");
      doneBtn.textContent = '🧠 TAKE QUIZ';
      doneBtn.style.background = 'linear-gradient(45deg, #2196F3, #1976D2)';
      
      // Remove old event listener by cloning the button
      const newDoneBtn = doneBtn.cloneNode(true);
      doneBtn.parentNode.replaceChild(newDoneBtn, doneBtn);
      
      // Add new event listener for TAKE QUIZ
      newDoneBtn.addEventListener("click", () => {
        loadQuiz(index);
      });
    });

    document.getElementById("homeBtn").addEventListener("click", () => {
      loadHomepage();
    });
  }



  // Sound effects
  function playSound(type) {
    const audio = new Audio();
    const sounds = {
      correct: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      wrong: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      tick: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
    };
    audio.src = sounds[type];
    audio.play().catch(() => {});
  }

  // ------------------ KAHOOT-STYLE QUIZ ------------------
  function loadQuiz(storyId) {
    clearAllReadingPositions();
    saveAppState({ page: "quiz", index: storyId });
    storyPanel.innerHTML = "";
    tileScrollWrapper.style.display = "none";

    const quiz = quizzes.find(q => q.storyId === storyId);
    hadithPanel.style.display = "none";

    if (!quiz) {
      storyPanel.innerHTML = "<p>No quiz available for this story.</p>";
      return;
    }

    // Shuffle quiz questions
    const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);
    quiz.questions = shuffledQuestions;
    
    // Reset quiz state
    quizState = {
      currentQuestion: 0,
      timeLeft: 15,
      timer: null,
      score: 0,
      answers: [],
      isAnswered: false,
      isTimed: true
    };

    showQuizStartScreen(quiz, storyId);
  }

  function showQuizStartScreen(quiz, storyId) {
    storyPanel.innerHTML = `
      <div class="quiz-start-screen" style="position: relative; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); color: white; padding: 20px 20px 80px 20px; border-radius: 20px; box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3); border: 2px solid rgba(255,255,255,0.2); height: 80vh; overflow-y: auto;">
        <h2>🧠 Ready for the Quiz?</h2>
        <div class="quiz-info">
          <p>📝 ${quiz.questions.length} Questions</p>
        </div>
        <div class="quiz-mode-selection">
          <h3>Choose Quiz Mode:</h3>
          <div class="mode-buttons">
            <button class="mode-btn timed" onclick="startKahootQuiz(${JSON.stringify(quiz).replace(/"/g, '&quot;')}, ${storyId}, true)">
              ⏱️ TIMED QUIZ
              <span>15 seconds per question</span>
              <span>Points based on speed</span>
            </button>
            <button class="mode-btn untimed" onclick="startKahootQuiz(${JSON.stringify(quiz).replace(/"/g, '&quot;')}, ${storyId}, false)">
              ♾️ UNTIMED QUIZ
              <span>Take your time</span>
              <span>50 points per correct answer</span>
            </button>
          </div>
        </div>
        <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; z-index: 100;">
          <button onclick="backToStory(${storyId})" style="background: #2196F3; color: white; border: none; padding: 15px 25px; border-radius: 25px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.5); font-size: 14px;">BACK TO STORY</button>
          <button onclick="backToHome()" style="background: #2196F3; color: white; border: none; padding: 15px 25px; border-radius: 25px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.5); font-size: 14px;">BACK TO HOME</button>
        </div>
      </div>
    `;
  }

  window.startKahootQuiz = function(quiz, storyId, isTimed = true) {
    quizState.isTimed = isTimed;
    loadKahootQuestion(quiz, storyId);
  };

  function loadKahootQuestion(quiz, storyId) {
    quizState.isAnswered = false;
    const question = quiz.questions[quizState.currentQuestion];
    
    // Shuffle options while keeping track of correct answer
    const shuffledOptions = [...question.options];
    const correctAnswer = question.answer;
    shuffledOptions.sort(() => Math.random() - 0.5);
    question.options = shuffledOptions;
    question.answer = correctAnswer; // Keep original correct answer
    
    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
    const shapes = ['▲', '♦', '●', '■'];

    storyPanel.innerHTML = `
      <div class="kahoot-quiz" style="position: relative; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); color: white; padding: 30px 30px 80px 30px; border-radius: 20px; box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3); border: 2px solid rgba(255,255,255,0.2);">
        <button onclick="quitQuiz()" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(255,68,68,0.9); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; z-index: 10; box-shadow: 0 4px 15px rgba(255,68,68,0.3);">✕ QUIT QUIZ</button>
        <div class="quiz-header">
          <div class="question-counter" style="color: black; font-weight: bold; font-size: 1.4em;">${quizState.currentQuestion + 1}/${quiz.questions.length}</div>
          ${quizState.isTimed ? `
            <div class="timer-circle">
              <div class="timer-text">${quizState.timeLeft}</div>
            </div>
          ` : '<div class="untimed-indicator">♾️ UNTIMED</div>'}
          <div class="score-display" style="color: black; font-weight: bold; font-size: 1.4em;">Score: ${quizState.score}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 15px; margin: 20px 0;">
          <div class="question-text" style="flex: 1;">${question.question}</div>
          <button onclick="playQuestionAudio(${quizState.currentQuestion})" style="background: rgba(255,255,255,0.25); color: white; border: none; padding: 8px 12px; border-radius: 20px; cursor: pointer; font-size: 1em; box-shadow: 0 4px 15px rgba(0,0,0,0.2); flex-shrink: 0;">🔊</button>
        </div>
        <div class="answer-grid">
          ${question.options.map((option, i) => `
            <button class="answer-btn" data-answer="${option}" style="background: ${colors[i]}; position: relative;">
              <span style="position: absolute; top: 5px; left: 8px; font-size: 0.8em; font-weight: bold;">${String.fromCharCode(65 + i)}</span>
              <span class="shape">${shapes[i]}</span>
              <span class="text">${option}</span>
            </button>
          `).join('')}
        </div>
        <div class="feedback-area"></div>
      </div>
    `;

    // Start timer only if timed mode
    if (quizState.isTimed) {
      startQuestionTimer(quiz, question, storyId);
    }
    
    // Add click handlers
    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(btn, quiz, question, storyId));
    });
  }

  function startQuestionTimer(quiz, question, storyId) {
    quizState.timeLeft = 15;
    quizState.isAnswered = false;
    
    quizState.timer = setInterval(() => {
      quizState.timeLeft--;
      const timerEl = document.querySelector('.timer-text');
      if (timerEl) timerEl.textContent = quizState.timeLeft;
      
      if (quizState.timeLeft <= 5) playSound('tick');
      
      if (quizState.timeLeft <= 0) {
        clearInterval(quizState.timer);
        if (!quizState.isAnswered) {
          showTimeUp(quiz, question, storyId);
        }
      }
    }, 1000);
  }

  function handleAnswer(btn, quiz, question, storyId) {
    if (quizState.isAnswered) return;
    
    quizState.isAnswered = true;
    if (quizState.isTimed) clearInterval(quizState.timer);
    
    const selectedAnswer = btn.dataset.answer;
    const isCorrect = selectedAnswer === question.answer;
    let points = 0;
    
    if (isCorrect) {
      if (quizState.isTimed) {
        points = quizState.timeLeft > 0 ? Math.max(100, quizState.timeLeft * 10) : 5;
      } else {
        points = 50;
      }
    }
    
    quizState.score += points;
    quizState.answers.push({ question: question.question, selected: selectedAnswer, correct: isCorrect, points });
    
    // Visual feedback
    document.querySelectorAll('.answer-btn').forEach(button => {
      button.style.opacity = '0.5';
      if (button.dataset.answer === question.answer) {
        button.style.background = '#26890c';
        button.style.opacity = '1';
      }
    });
    
    btn.style.opacity = '1';
    
    // Sound and feedback
    playSound(isCorrect ? 'correct' : 'wrong');
    
    const feedbackEl = document.querySelector('.feedback-area');
    feedbackEl.innerHTML = `
      <div class="feedback ${isCorrect ? 'correct' : 'wrong'}">
        ${isCorrect ? '🎉 Correct!' : '❌ Wrong!'} 
        ${isCorrect ? `+${points} points` : `Correct answer: ${question.answer}`}
      </div>
    `;
    
    // Show next button after delay
    setTimeout(() => {
      const feedbackEl = document.querySelector('.feedback-area');
      const nextBtn = document.createElement('button');
      nextBtn.className = 'next-btn';
      nextBtn.style.marginTop = '-10px';
      nextBtn.textContent = quizState.currentQuestion + 1 < quiz.questions.length ? 'Next Question ➡️' : 'See Results 🏆';
      nextBtn.onclick = () => {
        quizState.currentQuestion++;
        if (quizState.currentQuestion < quiz.questions.length) {
          loadKahootQuestion(quiz, storyId);
        } else {
          showQuizResults(quiz, storyId);
        }
      };
      feedbackEl.appendChild(nextBtn);
    }, 1500);
  }

  function showTimeUp(quiz, question, storyId) {
    const feedbackEl = document.querySelector('.feedback-area');
    feedbackEl.innerHTML = `
      <div class="feedback warning">
        ⏰ Time's up! You can still answer for 5 points.
      </div>
    `;
    
    // Keep buttons active for user to still answer
    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.style.opacity = '0.8';
    });
  }

  function showQuizResults(quiz, storyId) {
    const correctAnswers = quizState.answers.filter(a => a.correct).length;
    const percentage = Math.round((correctAnswers / quiz.questions.length) * 100);
    
    // Update player stats
    playerScore.totalPoints += quizState.score;
    playerScore.quizzesCompleted++;
    playerScore.averageScore = Math.round(playerScore.totalPoints / playerScore.quizzesCompleted);
    localStorage.setItem(`playerScore_${userId}`, JSON.stringify(playerScore));
    
    storyPanel.innerHTML = `
      <div class="quiz-results">
        <h2>🏆 Quiz Complete!</h2>
        <div class="final-score">${quizState.score}</div>
        <div class="score-label">Total Points</div>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${correctAnswers}/${quiz.questions.length}</div>
            <div class="stat-label">Correct</div>
          </div>
          <div class="stat">
            <div class="stat-value">${percentage}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
        </div>
        <button class="home-btn" onclick="finishQuiz(${storyId})">Continue to Homepage</button>
      </div>
    `;
  }

  window.finishQuiz = function(storyId) {
    loadHomepage();
  };

  window.quitQuiz = function() {
    if (confirm("Are you sure you want to quit the quiz? Your progress will be lost.")) {
      if (quizState.timer) clearInterval(quizState.timer);
      loadHomepage();
    }
  };

  window.backToStory = function(storyId) {
    loadStory(storyId);
  };

  window.backToHome = function() {
    loadHomepage();
  };

  window.playQuestionAudio = function(questionIndex) {
    const quiz = quizzes.find(q => q.storyId === currentStoryIndex);
    if (quiz && quiz.questions[questionIndex]) {
      const question = quiz.questions[questionIndex];
      // Get the options in the order they appear visually on screen
      const answerButtons = document.querySelectorAll('.answer-btn');
      const optionsText = Array.from(answerButtons).map((btn, i) => {
        const optionText = btn.dataset.answer;
        return `${String.fromCharCode(65 + i)}. ${optionText}`;
      }).join('. ');
      const textContent = `Question. ${question.question}. ${optionsText}`;
      const utterance = new SpeechSynthesisUtterance(textContent);
      const selectedVoice = getMultilingualVoice();
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1.2;
      speechSynthesis.speak(utterance);
    }
  };

  
  // ------------------ "READ" STAMP ------------------
  function animateReadStamp(storyId) {
    const tile = document.querySelector('.story-tile[data-index="' + storyId + '"]');
    if (tile) {
      let stampImprint = tile.querySelector(".read-imprint");
      if (!stampImprint) {
        const tempStamp = document.createElement("div");
        tempStamp.classList.add("stamp-temp");
        tempStamp.textContent = "READ";
        tile.appendChild(tempStamp);

        setTimeout(() => {
          tempStamp.remove();
          stampImprint = document.createElement("div");
          stampImprint.classList.add("read-imprint");
          stampImprint.textContent = "READ";
          tile.appendChild(stampImprint);
        }, 700);
      }
    }
  }
}
``