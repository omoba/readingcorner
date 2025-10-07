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
});

// Monitor Login State
onAuthStateChanged(auth, (user) => {
  if (user) {
    authContainer.style.display = "none";
    appContainer.style.display = "flex";
    logoutContainer.style.display = "block";
    authStatus.textContent = `Logged in as: ${user.email}`;
    initializeAppContent(user.uid);
  } else {
    authContainer.style.display = "block";
    appContainer.style.display = "none";
    logoutContainer.style.display = "none";
    authStatus.textContent = "Logged out";
  }
});

// ==================== MAIN APP SECTION ====================
function initializeAppContent(userId) {
  let currentStoryIndex = null;
  let stories = [];
  let hadiths = [];
  let quizzes = [];
  let completedStories = new Set(JSON.parse(localStorage.getItem(`completedStories_${userId}`) || "[]"));

  const storyPanel = document.getElementById("story-panel");
  const hadithPanel = document.getElementById("hadith-panel");

  fetch("stories.json")
    .then(res => res.json())
    .then(data => {
      stories = data.stories;
      hadiths = data.hadith;
      loadHomepage();
    });

  fetch("quiz.json")
    .then(res => res.json())
    .then(data => {
      quizzes = data;
    });

  // ------------------ HOMEPAGE ------------------
  function loadHomepage() {
    document.body.classList.add("homepage-active");
    hadithPanel.style.display = "none";
    storyPanel.innerHTML = "";

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
        const coverPage = document.getElementById("cover-page");
        const coverImage = document.getElementById("cover-image");
        coverImage.src = `images/${story.title}.jpeg`;
        coverPage.style.display = "flex";

        document.body.classList.add("homepage-active");
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
      });

      grid.appendChild(tile);
    });

    storyPanel.appendChild(grid);
  }

  // ------------------ STORY PAGE ------------------
  function loadStory(index) {
    currentStoryIndex = index;
    document.body.classList.remove("homepage-active");
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
    storyPanel.innerHTML = "";
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
      const questionBlock = document.createElement("div");
      questionBlock.classList.add("question-block");

      let optionsHTML = "";
      q.options.forEach(opt => {
        optionsHTML += `
          <label>
            <input type="radio" name="q${idx}" value="${opt}">
            ${opt}
          </label><br>
        `;
      });

      questionBlock.innerHTML = `
        <p><strong>${idx + 1}. ${q.question}</strong></p>
        ${optionsHTML}
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
            feedback.textContent = "Correct!";
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
