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
    alert("✅ Login successful");
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
  await signOut(auth);
  // Clear last state memory
  localStorage.removeItem("lastPage");
  localStorage.removeItem("lastStoryId");
});

// Monitor Login State
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("👤 Logged in user:", user.email);
    authContainer.style.display = "none";
    appContainer.style.display = "flex";
    logoutContainer.style.display = "block";
    initializeAppContent(user.uid);
  } else {
    // Logged out
    document.body.classList.remove("homepage-active");
    authContainer.style.display = "block";
    appContainer.style.display = "none";
    logoutContainer.style.display = "none";
  }
});

// ==================== MAIN APP SECTION ====================
function initializeAppContent(userId) {
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

  // --- SCROLL HINT LOGIC ---
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
    if (isScrollable && !isScrolledToBottom) scrollFadeHint.style.display = "block";
    else scrollFadeHint.style.display = "none";
  }

  function startArrowHint() {
    stopArrowHint();
    const isScrollable = tileScrollWrapper.scrollHeight > tileScrollWrapper.clientHeight;
    if (isScrollable) {
      if (tileScrollWrapper.scrollTop <= 5) setScrollHints(true);
      arrowInterval = setInterval(() => {
        const isScrolledToBottom = (tileScrollWrapper.scrollTop + tileScrollWrapper.clientHeight) >= (tileScrollWrapper.scrollHeight - 5);
        if (!isScrolledToBottom) setScrollHints(true);
        else setScrollHints(false);
      }, 5000);
    }
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

  // ------------------ FETCH DATA ------------------
  Promise.all([
    fetch("stories.json").then(res => res.json()),
    fetch("quiz.json").then(res => res.json())
  ]).then(([storyData, quizData]) => {
    stories = storyData.stories;
    hadiths = storyData.hadith;
    quizzes = quizData;

    // ALWAYS GO TO HOMEPAGE after login or refresh
    loadHomepage();
  });

  // ------------------ HOMEPAGE ------------------
  function loadHomepage() {
    console.log("🏠 Loading homepage");
    document.body.classList.add("homepage-active");
    hadithPanel.style.display = "none";
    storyPanel.style.display = "flex";

    storyPanel.innerHTML = "";
    tileScrollWrapper.innerHTML = "";
    tileScrollWrapper.style.display = "block";

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

      tile.addEventListener("click", () => {
        localStorage.setItem("lastPage", "cover");
        localStorage.setItem("lastStoryId", idx);
        showCoverPage(idx);
      });

      grid.appendChild(tile);
    });

    tileScrollWrapper.appendChild(grid);
    storyPanel.appendChild(tileScrollWrapper);

    setTimeout(() => {
      checkScrollPosition();
      startArrowHint();
    }, 50);

    // Save homepage as last page
    localStorage.setItem("lastPage", "homepage");
  }

  // ------------------ COVER PAGE ------------------
  function showCoverPage(idx) {
    const story = stories[idx];
    const coverPage = document.getElementById("cover-page");
    const coverImage = document.getElementById("cover-image");
    coverImage.src = `images/${story.title}.jpeg`;
    coverPage.style.display = "flex";

    const readBtn = document.getElementById("cover-read-btn");
    readBtn.replaceWith(readBtn.cloneNode(true));
    const newReadBtn = document.getElementById("cover-read-btn");

    newReadBtn.addEventListener("click", () => {
      coverPage.style.display = "none";
      loadStory(idx);
    });
  }

  // ------------------ STORY PAGE ------------------
  function loadStory(index) {
    localStorage.setItem("lastPage", "story");
    localStorage.setItem("lastStoryId", index);

    document.body.classList.remove("homepage-active");
    tileScrollWrapper.style.display = "none";
    storyPanel.innerHTML = "";
    hadithPanel.style.display = "block";
    storyPanel.style.display = "block";

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
      loadQuiz(index);
    });
    document.getElementById("homeBtn").addEventListener("click", () => {
      loadHomepage();
    });
  }

  // ------------------ QUIZ PAGE ------------------
  function loadQuiz(storyId) {
    localStorage.setItem("lastPage", "quiz");
    localStorage.setItem("lastStoryId", storyId);

    storyPanel.innerHTML = "";
    tileScrollWrapper.style.display = "none";

    const quiz = quizzes.find(q => q.storyId === storyId);
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
      const block = document.createElement("div");
      block.classList.add("question-block");
      let opts = "";
      q.options.forEach(opt => {
        opts += `
          <label><input type="radio" name="q${idx}" value="${opt}">${opt}</label>
        `;
      });
      block.innerHTML = `
        <p class="quiz-question">${idx + 1}. ${q.question}</p>
        <div class="quiz-options">${opts}</div>
        <p class="feedback" style="font-weight:bold;"></p>
      `;
      quizDiv.appendChild(block);
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
            feedback.textContent = `Incorrect! Correct: ${q.answer}`;
            feedback.style.color = "red";
          }
        } else {
          feedback.textContent = `No answer! Correct: ${q.answer}`;
          feedback.style.color = "red";
        }
      });
      scoreDisplay.textContent = `You scored ${score} / ${quiz.questions.length}`;
    });

    homeBtn.addEventListener("click", () => {
      completedStories.add(storyId);
      localStorage.setItem(`completedStories_${userId}`, JSON.stringify([...completedStories]));
      loadHomepage();
    });

    btnRow.appendChild(submitBtn);
    btnRow.appendChild(homeBtn);
    quizDiv.appendChild(btnRow);
    quizDiv.appendChild(scoreDisplay);
    storyPanel.appendChild(quizDiv);
  }
}
