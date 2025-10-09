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

console.log("✅ Firebase initialized");

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
  if (!email || !password) return alert("Please enter email and password.");
  try {
    await signInWithEmailAndPassword(auth, email, password);
 //   alert("✅ Login successful");
  } catch (err) {
    alert("❌ " + err.message);
  }
});

// Register
document.getElementById("registerBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Please enter email and password.");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("✅ Registered successfully");
  } catch (err) {
    alert("❌ " + err.message);
  }
});


// Logout
logoutBtn.addEventListener("click", async () => {
  try {
    // Clear saved states
    localStorage.removeItem("currentPage");
    localStorage.removeItem("currentStoryId");
    sessionStorage.clear();

    // Sign out from Firebase
    await signOut(auth);

    console.log("✅ User logged out and session cleared");
    

    // Force full page reload to reset in-memory state
    window.location.reload();  // <--- this is the key line
  } catch (error) {
    console.error("Logout error:", error);
  }
});



// Monitor Login State
onAuthStateChanged(auth, (user) => {
      // ✅ Show body only after auth check
  document.body.style.visibility = "visible";
  if (user) {
    authContainer.style.display = "none";
    appContainer.style.display = "flex"; 
    logoutContainer.style.display = "block";
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

// ==================== MAIN APP SECTION ====================
function initializeAppContent(userId) {
  let currentStoryIndex = null;
  let stories = [];
  let hadiths = [];
  let quizzes = [];
  let completedStories = new Set(JSON.parse(localStorage.getItem(`completedStories_${userId}`) || "[]"));

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

 
    const savedState = (sessionStorage.getItem("activeUserId") === userId)
    ? loadAppState()
    : null;
    sessionStorage.setItem("activeUserId", userId);


Promise.all([
  fetch("stories.json").then(res => res.json()),
  fetch("quiz.json").then(res => res.json())
]).then(([storiesData, quizzesData]) => {
  stories = storiesData.stories;
  hadiths = storiesData.hadith;
  quizzes = quizzesData;

  // Restore saved state after both JSONs are loaded
  if (savedState && savedState.page) {
    switch (savedState.page) {
      case "story":
        loadStory(savedState.index);
        break;
      case "quiz":
        loadQuiz(savedState.index);
        break;
      case "cover":
        showCover(savedState.index);
        break;
      case "homepage":
      default:
        loadHomepage();
        break;
    }
  } else {
    loadHomepage();
  }
}).catch(err => console.error("Error loading data:", err));


  // ------------------ HOMEPAGE ------------------
  function loadHomepage() {
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

    const grid = document.createElement("div");
    grid.classList.add("story-grid");

    stories.forEach((story, idx) => {
      const tile = document.createElement("div");
      tile.classList.add("story-tile");
      tile.dataset.index = idx;

      const imageSrc = `images/${story.title}.jpeg`;
      tile.innerHTML = `
          <img src="${imageSrc}" alt="${story.title}" class="tile-image" onerror="this.style.display='none'">
          <h3>${story.title}</h3>
      `;

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
    saveAppState({ page: "cover", index: idx });

    const coverPage = document.getElementById("cover-page");
    const coverImage = document.getElementById("cover-image");
    coverImage.src = `images/${stories[idx].title}.jpeg`;
    coverPage.style.display = "flex";
    setScrollHints(false);
    storyPanel.style.display = "none";
    hadithPanel.style.display = "none";

    const readBtn = document.getElementById("cover-read-btn");
    readBtn.replaceWith(readBtn.cloneNode(true));
    const newReadBtn = document.getElementById("cover-read-btn");

    newReadBtn.addEventListener("click", () => {
      coverPage.style.display = "none";
      storyPanel.style.display = "block"; 
      hadithPanel.style.display = "block";
      loadStory(idx);
    });
  }

  // ------------------ STORY PAGE ------------------
  function loadStory(index) {
    currentStoryIndex = index;
    saveAppState({ page: "story", index });

    setScrollHints(false);
    document.body.classList.remove("homepage-active"); 
    tileScrollWrapper.style.display = "none"; 
    storyPanel.style.display = "block"; 
    hadithPanel.style.display = "block";
    storyPanel.innerHTML = ""; 

    const story = stories[index];
    const hadith = hadiths[story.hadithIndex];

    hadithPanel.innerHTML = `<h2>Hadith</h2><p>${hadith.text}</p>`;

    const storyDiv = document.createElement("div");
    storyDiv.classList.add("story");
    storyDiv.innerHTML = `
      <h2>${story.title}</h2>
      ${story.text}
      <div class="btn-row">
        <button id="doneBtn">DONE READING</button>
        <button id="homeBtn">BACK TO HOMEPAGE</button>
      </div>
    `;
    storyPanel.appendChild(storyDiv);

    document.getElementById("doneBtn").addEventListener("click", () => {
      displayStoryLeftPanel(story);
      loadQuiz(index);
    });

    document.getElementById("homeBtn").addEventListener("click", () => {
      loadHomepage();
    });
  }

  // ------------------ DISPLAY STORY IN LEFT PANEL ------------------
  function displayStoryLeftPanel(story) {
    hadithPanel.innerHTML = `
      <h2>${story.title}</h2>
      ${story.text}
    `;
  }

  // ------------------ QUIZ PAGE ------------------
  function loadQuiz(storyId) {
    saveAppState({ page: "quiz", index: storyId });

    storyPanel.innerHTML = "";
    tileScrollWrapper.style.display = "none"; 

    const quiz = quizzes.find(q => q.storyId === storyId);
    // Restore left panel story if available
    const story = stories[storyId];
    if (story) displayStoryLeftPanel(story);

    if (!quiz) {
      storyPanel.innerHTML = "<p>No quiz available for this story.</p>";
      return;
    }

    const header = document.createElement("h2");
    header.textContent = "READING COMPREHENSION";
    header.classList.add("quiz-header");
    storyPanel.appendChild(header);

    const quizDiv = document.createElement("div");
    quizDiv.classList.add("quiz");

    quiz.questions.forEach((q, idx) => {
      const questionBlock = document.createElement("div");
      questionBlock.classList.add("question-block");

      let optionsHTML = "";
      q.options.forEach(opt => {
        optionsHTML += `
          <label>
            <input type="radio" name="q${idx}" value="${opt}">
            ${opt}
          </label>
        `;
      });

      questionBlock.innerHTML = `
        <p class="quiz-question">${idx + 1}. ${q.question}</p>
        <div class="quiz-options">
          ${optionsHTML}
        </div>
        <p class="feedback" style="font-weight:bold;"></p>
      `;
      quizDiv.appendChild(questionBlock);
    });

    const btnRow = document.createElement("div");
    btnRow.classList.add("btn-row");

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Submit Answers";

    const homeBtn = document.createElement("button");
    homeBtn.textContent = "Return to Homepage";

    const scoreDisplay = document.createElement("p");
    scoreDisplay.style.fontWeight = "bold";

    submitBtn.addEventListener("click", () => {
      let score = 0;
      quiz.questions.forEach((q, idx) => {
        const selected = quizDiv.querySelector(`input[name="q${idx}"]:checked`);
        const feedback = quizDiv.querySelectorAll(".feedback")[idx];

        if (selected) {
          if (selected.value === q.answer) {
            score++;
            feedback.textContent = "Correct! 🎉";
            feedback.style.color = "green";
          } else {
            feedback.textContent = `Incorrect! Correct: ${q.answer} ❌`;
            feedback.style.color = "red";
          }
        } else {
          feedback.textContent = `No answer! Correct: ${q.answer} ⚠️`;
          feedback.style.color = "red";
        }
      });
      scoreDisplay.textContent = `You scored ${score} out of ${quiz.questions.length}`;
    });

    homeBtn.addEventListener("click", () => {
      completedStories.add(storyId);
      localStorage.setItem(`completedStories_${userId}`, JSON.stringify([...completedStories]));
      loadHomepage();
      animateReadStamp(storyId);
    });

    btnRow.appendChild(submitBtn);
    btnRow.appendChild(homeBtn);
    quizDiv.appendChild(btnRow);
    quizDiv.appendChild(scoreDisplay);
    storyPanel.appendChild(quizDiv);
  }

  // Disable right-click on story and hadith panels
const panels = [document.getElementById("story-panel"), document.getElementById("hadith-panel")];

panels.forEach(panel => {
  // Disable context menu
  panel.addEventListener("contextmenu", e => e.preventDefault());

  // Disable copy / cut / paste
  panel.addEventListener("copy", e => e.preventDefault());
  panel.addEventListener("cut", e => e.preventDefault());
  panel.addEventListener("paste", e => e.preventDefault());

  // Disable Ctrl+C / Ctrl+X / Ctrl+V and Command+C on Mac
  panel.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "v", "a"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
});


  // ------------------ "READ" STAMP ------------------
  function animateReadStamp(storyId) {
    const tile = document.querySelector(`.story-tile[data-index='${storyId}']`);
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
