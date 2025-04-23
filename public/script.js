let currentTask = "";
let timer = 25 * 60;
let timerInterval;
let taskGraduated = false;
let hasGraduated = false;
let taskWasKept = false;
let taskWasDeleted = false;
let graduationButtonClicked = false;


const taskBox = document.getElementById("task-box");
const taskBoxInner = document.querySelector(".task-box-inner");
const taskName = document.getElementById("task-name");
const timerDisplay = document.getElementById("timer");
const keepTaskBtn = document.getElementById("keep-task"); // !!!!!!!!!!!!!
const deleteTaskBtn = document.getElementById("delete-task"); // !!!!!!!!!!!!!
const addTimeBtn = document.getElementById("add-time-btn");
const pastTasksContainer = document.getElementById("past-tasks");
const taskList = document.getElementById("task-list");
const taskBack = document.getElementById("task-back");

let defaultTime = parseInt(localStorage.getItem("defaultTime")) || 25;
timer = defaultTime * 60;

var firstItemDeleted = false;

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const defaultTimeInput = document.getElementById("default-time-input");
const saveSettingsBtn = document.getElementById("save-settings");
const cancelSettingsBtn = document.getElementById("cancel-settings");

let sessionStartTime = null;
let lastSessionDuration = ""; // Holds the formatted time

// === Auth UI ===
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

loginBtn.addEventListener("click", () => window.location.href = "login");
signupBtn.addEventListener("click", () => window.location.href = "signup");
logoutBtn.addEventListener("click", async () => {
  const res = await fetch("/logout", {
    method: "POST",
    credentials: "include", // 👈 important for cookies!
  });

  if (res.redirected) {
    window.location.href = res.url;
  } else {
    window.location.reload();
  }
});


async function checkLoginStatus() {
  const res = await fetch("/me"); // Or whatever route gives you current user
  if (res.ok) {
    // Logged in
    loginBtn.hidden = true;
  signupBtn.hidden = true;
  logoutBtn.hidden = false;
    return true;
  } else {
    // Not logged in
    loginBtn.hidden = false;
  signupBtn.hidden = true;
  logoutBtn.hidden = true;
    return false;
  }
}
  
window.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = await checkLoginStatus();

  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get("folderId");

  if (!isLoggedIn && folderId) {
    alert("Please log in to access this folder.");
    localStorage.removeItem("importedTasks");
    return;
  }

  if (isLoggedIn && folderId) {
    try {
      const res = await fetch(`/folders/${folderId}`);
      if (!res.ok) throw new Error("Unauthorized");
    } catch (err) {
      alert("You don't have access to this folder.");
      localStorage.removeItem("importedTasks");
      window.location.href = "taskPage";
      return;
    }
  }

  // 🔁 This section already exists lower in your file — move it here:
  const importedTasks = JSON.parse(localStorage.getItem("importedTasks") || "[]");

  importedTasks.forEach(task => {
    const newTaskElement = document.createElement("div");
    newTaskElement.classList.add("task");
    newTaskElement.textContent = task.name;
    newTaskElement.dataset.task = task.name;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.classList.add("delete-btn");

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      newTaskElement.remove();
    });

    newTaskElement.appendChild(deleteBtn);
    taskList.appendChild(newTaskElement);
  });

  localStorage.removeItem("importedTasks");
});


settingsBtn.addEventListener("click", () => {
  defaultTimeInput.value = defaultTime;
  settingsModal.classList.remove("hidden");
});

cancelSettingsBtn.addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

saveSettingsBtn.addEventListener("click", () => {
  const newTime = parseInt(defaultTimeInput.value);
  if (!isNaN(newTime) && newTime > 0) {
    defaultTime = newTime;
    localStorage.setItem("defaultTime", defaultTime);
    timer = defaultTime * 60;
    updateTimerDisplay();
  }
  settingsModal.classList.add("hidden");
});


function updateTimerDisplay() {
        //JOVAN RUCNO MENJAO DISPLEJ
  const minutes = Math.floor(((defaultTime*60) - timer) / 60);
  const seconds = (defaultTime*60 - timer) % 60;
  timerDisplay.textContent = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}

function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval); // 🧼 Clean up existing
    timerInterval = null;
  }

  let lastTime = Date.now();

  timerInterval = setInterval(() => {
    const now = Date.now();
    const delta = Math.floor((now - lastTime) / 1000);

    if (delta >= 1) {
      lastTime = now;
      timer -= delta;

      if (timer <= 0) {
        timer = 0;
        clearInterval(timerInterval);
        timerInterval = null;
        flipCard();
      }

      updateTimerDisplay();
    }
  }, 100);
}



function flipCard(force = false) {
  if (force || !taskBox.classList.contains("flipped")) {
    taskBox.classList.add("flipped");
  }
}//!!!!!!!!!

function unflipCard() {
  taskBox.classList.remove("flipped");
}

taskBox.addEventListener("click", (e) => {
  if (hasGraduated) return;

  const isInteractive =
    e.target.closest("button") ||
    e.target.closest("input") ||
    e.target.isContentEditable;

  if (!isInteractive) {
    taskBox.classList.toggle("flipped");
  }
});

addTimeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  timer += 10 * 60;
  updateTimerDisplay();
    
  unflipCard(); // 👈 Flip when time is added
    startTimer();
});


/*keepTaskBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  archiveTask(true);
    graduationButtonClicked = true;
});*/

deleteTaskBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  archiveTask(false);
    launchConfetti();
    graduationButtonClicked = true;
});

/*function showGraduationOptions() {
  taskBack.innerHTML = `
    <button id="keep-task">Keep Task</button>
    <button id="delete-task">Delete Task</button>
    <button id="add-time-btn">+10 Minutes</button>
  `;

  document.getElementById("keep-task").addEventListener("click", () => {
    archiveTask(true);
  });

  document.getElementById("delete-task").addEventListener("click", () => {
    archiveTask(false);
  });

  document.getElementById("cancel-complete").addEventListener("click", () => {
    resetBackUI();
  });
}*/

function launchConfetti() {
  for (let i = 0; i < 30; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti-piece";
    confetti.style.setProperty("--x", Math.random());
    confetti.style.setProperty("--hue", Math.random());
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.animationDelay = `${Math.random() * 0.3}s`;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 1000);
  }
}


function archiveTask(keep) {
    
    const sessionEndTime = Date.now();
    const durationSeconds = Math.floor((sessionEndTime - sessionStartTime) / 1000);
    const minutes = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
    const seconds = String(durationSeconds % 60).padStart(2, "0");
    const durationFormatted = `${minutes}:${seconds}`;
    lastSessionDuration = durationFormatted;
    sessionStartTime = null;

    
    clearInterval(timerInterval); // ⛔ Stop the timer
    taskBox.classList.add("task-completed"); // 🌫️ Gray out

    

    
  if (hasGraduated) return;

  taskWasKept = keep;
  taskWasDeleted = !keep;
  taskGraduated = true;
  hasGraduated = true;

  // Remove task from the potential new tasks list if it's being deleted
  if (taskWasDeleted) {
    const taskElements = taskList.querySelectorAll(".task");
    taskElements.forEach((taskElement) => {
      if (taskElement.dataset.task === currentTask) {
        taskElement.remove(); // Remove the task from the potential tasks list
      }
    });
  }

  unflipCard();
  //resetBackUI();
}


function DropFirstCard(){
    archiveTask(false);
}
DropFirstCard();



/*function resetBackUI() {
  taskBack.innerHTML = `
    <button id="complete-btn">Complete Task</button>
    <button id="add-time-btn">+10 Minutes</button>
  `;

  document.getElementById("complete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    showGraduationOptions();
  });

  document.getElementById("add-time-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    timer += 10 * 60;
    updateTimerDisplay();
  });
}*/

taskList.addEventListener("click", (e) => {
  const target = e.target;
  if (target.classList.contains("task")) {
      if(graduationButtonClicked == false){
        archiveTask(true);
      }
      graduationButtonClicked = false;
      taskBox.classList.add("celebrate");

    setTimeout(() => {
      taskBox.classList.remove("celebrate");
    }, 1000);
    // ✅ Handle timeline display *now* (after choosing new task)
      if(firstItemDeleted){
        const oldTask = document.createElement("div");
        oldTask.className = "task";
          oldTask.innerHTML = `<span class="task-name">${currentTask}</span> <span class="task-duration">(${lastSessionDuration})</span>`;

          
        if (taskWasDeleted) {
          oldTask.classList.add("deleted");
        }

        pastTasksContainer.insertBefore(oldTask, document.getElementById("task-summary"));
          updateTotalTime();
      }
    firstItemDeleted = true;
    // ✅ Set up next task
    currentTask = target.dataset.task;
    sessionStartTime = Date.now();

    taskName.textContent = currentTask;

    // Reset state
    hasGraduated = false;
    taskGraduated = false;
    taskWasKept = false;
    taskWasDeleted = false;
    timer = defaultTime * 60;
    updateTimerDisplay();

    unflipCard();
    //resetBackUI();
    taskBox.classList.remove("task-completed"); // 🎨 Restore normal style
    startTimer();
      timerDisplay.removeAttribute('hidden');
  }
});

const toggle = document.getElementById("darkmode-toggle");
localStorage.setItem("darkmode", toggle.checked);
// Save mode across reloads
if (localStorage.getItem("darkmode") === "true") {
  document.body.classList.add("dark");
  toggle.checked = true;
}

toggle.addEventListener("change", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkmode", toggle.checked);
});



updateTimerDisplay();
startTimer();

const newTaskInput = document.getElementById("new-task-input");
const addTaskBtn = document.getElementById("add-task-btn");

// Add new task
addTaskBtn.addEventListener("click", () => {
  const taskText = newTaskInput.value.trim();
  
  if (taskText !== "") {
    const newTaskElement = document.createElement("div");
    newTaskElement.classList.add("task");
    newTaskElement.textContent = taskText;
    newTaskElement.dataset.task = taskText;

    // Create delete button for each task
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.classList.add("delete-btn");

    // Delete task functionality
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      newTaskElement.remove();
    });

    newTaskElement.appendChild(deleteBtn);
    taskList.appendChild(newTaskElement);

    // Clear input field after adding the task
    newTaskInput.value = "";
  } else {
    alert("Please enter a task.");
  }
});

// Allow pressing Enter to add the task
newTaskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addTaskBtn.click();
  }
});

const breakBtn = document.getElementById("break-btn");
const breakOverlay = document.getElementById("break-overlay");
const returnBtn = document.getElementById("return-btn");
const breakTimer = document.getElementById("break-timer");

let breakInterval;
let breakStartTime;

breakBtn.addEventListener("click", () => {
    if(!graduationButtonClicked){
        archiveTask(true); // Mark task as done and kept
        graduationButtonClicked = true;
    }
  breakOverlay.classList.remove("hidden");

  // Start the stopwatch
  breakStartTime = Date.now();
breakTimer.textContent = "00:00";

function updateBreakTimer() {
  const elapsed = Math.floor((Date.now() - breakStartTime) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  breakTimer.textContent = `${minutes}:${seconds}`;
  breakInterval = requestAnimationFrame(updateBreakTimer);
}

cancelAnimationFrame(breakInterval); // In case it's still running
breakInterval = requestAnimationFrame(updateBreakTimer);

});

returnBtn.addEventListener("click", () => {
    taskGraduated = true;
  breakOverlay.classList.add("hidden");
  clearInterval(breakInterval);

  const breakEndTime = Date.now();
  const breakDurationSec = Math.floor((breakEndTime - breakStartTime) / 1000);
  const breakMin = String(Math.floor(breakDurationSec / 60)).padStart(2, '0');
  const breakSec = String(breakDurationSec % 60).padStart(2, '0');
  const breakFormatted = `${breakMin}:${breakSec}`;

  const breakTask = document.createElement("div");
  breakTask.className = "task break-task"; // Optional: separate class for breaks
  breakTask.innerHTML = `<span class="task-name">☕️ Break</span> <span class="task-duration">(${breakFormatted})</span>`;

  pastTasksContainer.insertBefore(breakTask, document.getElementById("task-summary"));
  updateTotalTime();
});



// === Load imported tasks if any ===
const importedTasks = JSON.parse(localStorage.getItem("importedTasks") || "[]");

importedTasks.forEach(task => {
  const newTaskElement = document.createElement("div");
  newTaskElement.classList.add("task");
  newTaskElement.textContent = task.name;
  newTaskElement.dataset.task = task.name;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✕";
  deleteBtn.classList.add("delete-btn");

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    newTaskElement.remove();
  });

  newTaskElement.appendChild(deleteBtn);
  taskList.appendChild(newTaskElement);
});

// Optional: clear it so it doesn't persist
localStorage.removeItem("importedTasks");


//overlay
// Task Setup Overlay Logic
const setupOverlay = document.getElementById("task-setup-overlay");
const setupTimerDisplay = document.getElementById("setup-timer");
const setupTaskInput = document.getElementById("setup-task-input");
const setupAddBtn = document.getElementById("setup-add-btn");
const setupStartBtn = document.getElementById("setup-start-btn");
const setupTaskList = document.getElementById("setup-task-list");

let setupTimer = 5 * 60;
let setupInterval;

function updateSetupTimer() {
  const minutes = String(Math.floor(setupTimer / 60)).padStart(2, '0');
  const seconds = String(setupTimer % 60).padStart(2, '0');
  setupTimerDisplay.textContent = `${minutes}:${seconds}`;
}

function startSetupCountdown() {
  const setupEndTime = Date.now() + setupTimer * 1000;

  function tickSetup() {
    const remaining = Math.max(0, Math.floor((setupEndTime - Date.now()) / 1000));
    if (remaining !== setupTimer) {
      setupTimer = remaining;
      updateSetupTimer();
    }

    if (setupTimer <= 0) {
      finishSetup();
    } else {
      setupInterval = requestAnimationFrame(tickSetup);
    }
  }

  cancelAnimationFrame(setupInterval);
  tickSetup();
}


function finishSetup() {
  cancelAnimationFrame(setupInterval);
  setupOverlay.style.display = "none";
  startTimer(); // Start Pomodoro after planning
}


// Add task to visible list (and actual task list)
setupAddBtn.addEventListener("click", () => {
  const taskText = setupTaskInput.value.trim();
  if (taskText !== "") {
    const displayTask = document.createElement("div");
    displayTask.className = "task";

    const taskLabel = document.createElement("span");
    taskLabel.textContent = taskText;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";

    delBtn.addEventListener("click", () => {
      displayTask.remove();
      taskElement.remove();
    });

    displayTask.appendChild(taskLabel);
    displayTask.appendChild(delBtn);
    setupTaskList.appendChild(displayTask);


    const taskElement = document.createElement("div");
    taskElement.className = "task";
    taskElement.textContent = taskText;
    taskElement.dataset.task = taskText;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      taskElement.remove();
    });

    taskElement.appendChild(deleteBtn);
    taskList.appendChild(taskElement);

    setupTaskInput.value = "";
  }
});

// Enter key support
setupTaskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    setupAddBtn.click();
  }
});

// Manual start
setupStartBtn.addEventListener("click", finishSetup);

// Auto-start countdown
const urlParams = new URLSearchParams(window.location.search);
const folderId = urlParams.get("folderId");

// Only show overlay if no folderId (i.e. manual task planning mode)
if (!folderId) {
  startSetupCountdown();
} else {
  document.getElementById("task-setup-overlay").style.display = "none";
}



function updateTotalTime() {
  let totalSeconds = 0;

  const durations = pastTasksContainer.querySelectorAll(".task-duration");

  durations.forEach((span) => {
    const match = span.textContent.match(/\((\d+):(\d+)\)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      totalSeconds += (minutes * 60) + seconds;
    }
  });

  const totalMins = Math.floor(totalSeconds / 60);
  const totalHrs = Math.floor(totalMins / 60);
  const minsRemaining = totalMins % 60;

  const summaryText = totalHrs > 0
    ? `Total time: ${totalHrs}h ${minsRemaining}m`
    : `Total time: ${minsRemaining}m`;

  document.getElementById("task-summary").textContent = summaryText;
}
