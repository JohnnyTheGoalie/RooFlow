// Top-level shared DOM references
const folderTitle = document.getElementById('folder-title');
const folderDetails = document.getElementById('folder-details');
const noFolder = document.getElementById('no-folder-selected');
const taskList = document.getElementById('task-list');
const colorOptionsContainer = document.querySelector('.color-options');
const folderList = document.getElementById('folder-list');
const createFolderModal = document.getElementById('create-folder-modal');

document.getElementById("close-folder").addEventListener("click", () => {
  folderDetails.classList.add("folder-close-out");

  setTimeout(() => {
    folderDetails.classList.remove("folder-close-out");
    folderDetails.classList.add("hidden");

    noFolder.classList.remove("hidden");
    noFolder.classList.add("no-folder-fade-in");

    folderDetails.dataset.folderId = "";
    taskList.innerHTML = "";

    setTimeout(() => {
      noFolder.classList.remove("no-folder-fade-in");
    }, 300);
  }, 250); // match animation duration
});

function animateTaskIn(el) {
  // Wait for the DOM to paint the initial state
  requestAnimationFrame(() => {
    // THEN wait a bit before transitioning to visible
    setTimeout(() => {
      el.classList.add("visible");
    }, 100); // super short delay so CSS transition can fire
  });
}






const presetColors = [
  "#a29bfe", "#81ecec", "#fab1a0",
  "#ffeaa7", "#74b9ff", "#ff7675", "#55efc4"
];

function getRandomColor() {
  const index = Math.floor(Math.random() * presetColors.length);
  return presetColors[index];
}

function openFolderAndGoToPomodoro(folderId) {
  fetch(`/tasks/${folderId}`)
    .then(res => res.json())
    .then(tasks => {
      localStorage.setItem("importedTasks", JSON.stringify(tasks));
      window.location.href = `taskPage.html?folderId=${folderId}`;
    });
}




let selectedColor = "#f08080";

folderTitle.addEventListener("blur", () => {
    
    folderTitle.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent newlines
        folderTitle.blur(); // Triggers the blur event and saves
      }
    });

    
    
  const folderId = folderDetails.dataset.folderId;
  const newName = folderTitle.value.trim();

  if (!newName || !folderId) return;

  fetch(`/folders/${folderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderName: newName })
  }).then(() => {
  const card = document.querySelector(`.folder-card[data-id="${folderId}"]`);
  if (card) {
    const title = card.querySelector(".folder-title");
    if (title) title.textContent = newName;
    // 💥 Also update the dataset so it survives future clicks
    card.dataset.name = newName;
  }
});
});

function updateFolderTaskCount(folderId) {
  const card = document.querySelector(`.folder-card[data-id="${folderId}"]`);
  if (!card) return;

  const taskCountEl = card.querySelector(".task-count");
  if (!taskCountEl) return;

  fetch(`/folders/${folderId}/task-count`)
    .then(res => res.json())
    .then(data => {
      const count = data.taskCount || 0;
      taskCountEl.textContent = `${count} Task${count !== 1 ? 's' : ''}`;
    })
    .catch(err => {
      console.error("Failed to update task count:", err);
    });
}



// 1. Load folders on startup
window.addEventListener("DOMContentLoaded", () => {
  loadFolders();

  document.getElementById("create-folder").addEventListener("click", async () => {
    const placeholderName = "Roo folder";
    const randomColor = getRandomColor();
  
    try {
      const res = await fetch("/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName: placeholderName, color: randomColor })
      });
  
      const data = await res.json();
      if (data.folderId) {
        const card = addFolderCard(placeholderName, randomColor, data.folderId, true, true);
  
        // Animate click after render
        setTimeout(() => {
          card.click();
        }, 200); // Let fade-in complete
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  });
  
  

  document.getElementById("cancel-create").addEventListener("click", () => {
    createFolderModal.classList.add("hidden");
  });

  document.getElementById("confirm-create").addEventListener("click", handleFolderCreation);

  // Setup color swatches in the modal
  document.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
      swatch.classList.add("selected");
      selectedColor = swatch.dataset.color;
    });
  });
});

// 2. Fetch folders and render them
function loadFolders() {
  fetch("/folders")
    .then(res => res.json())
    .then(folders => {
      folders.forEach(folder => {
        const card = addFolderCard(folder.name, folder.color, folder.id);
        // Fetch and update task count
        fetch(`/folders/${folder.id}/task-count`)
          .then(res => res.json())
          .then(data => {
            const taskCountEl = card.querySelector(".task-count");
            if (taskCountEl) {
              const count = data.taskCount || 0;
              taskCountEl.textContent = `${count} Task${count !== 1 ? 's' : ''}`;
            }
          })
          .catch(err => {
            console.error("Failed to fetch task count:", err);
          });
      });
    });
}


// 3. Create new folder and add card
function handleFolderCreation() {
  const folderName = document.getElementById("new-folder-name").value.trim();
  if (!folderName) return alert("Folder name is required.");

  fetch("/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderName, color: selectedColor })
  })
    .then(res => res.json())
    .then(data => {
      if (data.folderId) {
        addFolderCard(folderName, selectedColor, data.folderId, true, true);
        createFolderModal.classList.add("hidden");
        document.getElementById("new-folder-name").value = "";
      }
    });
}

// 4. Utility: Render a folder card
function addFolderCard(name, color, id, animate = false, shouldFocus = false) {
  const card = document.createElement("div");
  card.classList.add("folder-card");
  if (animate) card.classList.add("folder-card-new");

  card.dataset.id = id;
  card.dataset.color = color;
  card.dataset.name = name;

  card.style.background = `linear-gradient(135deg, ${color}, #ffffff10)`;

  card.innerHTML = `
    <div class="folder-title">${name}</div>
    <div class="task-count">0 Tasks</div>
  `;

  // Attach click behavior
  card.addEventListener("click", async () => {
  // Exit early if it's already selected
  if (folderDetails.dataset.folderId === id) return;

  // Animate out if already visible
  if (!folderDetails.classList.contains("hidden")) {
    folderDetails.classList.remove("fade-in");
    folderDetails.classList.add("folder-switch-out");

    await new Promise(resolve => setTimeout(resolve, 180));
    folderDetails.classList.remove("folder-switch-out");
  }

  // Load data
  folderTitle.value = card.dataset.name || name;
  folderDetails.dataset.folderId = id;
  folderDetails.style.backgroundColor = color;

  noFolder.classList.add("hidden");
  folderDetails.classList.remove("hidden");
  folderDetails.classList.add("folder-switch-in");

  await loadTasks(id);
  showColorPicker(color, card);

  // Remove focus from input
  folderTitle.blur();

  setTimeout(() => {
    folderDetails.classList.remove("folder-switch-in");
  }, 250);
});


  if (shouldFocus) {
    card.dataset.shouldFocus = "true";
  }

  folderList.appendChild(card);
  return card;
}



// 5. Load tasks for a folder
async function loadTasks(folderId) {
  taskList.innerHTML = '<p>Loading tasks...</p>';

  try {
    const res = await fetch(`/tasks/${folderId}`);
    const tasks = await res.json();

    if (!Array.isArray(tasks)) throw new Error("Invalid task format");

    taskList.innerHTML = '';

    tasks.forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.classList.add('task-item');

      taskEl.innerHTML = `
        <span class="task-name" contenteditable="true" data-task-id="${task.id}">${task.name}</span>
        <button class="delete-task" data-task-id="${task.id}">🗑</button>
      `;
            
      taskList.appendChild(taskEl);
        animateTaskIn(taskEl);
    });

    // 🗑 Handle task deletion
    taskList.querySelectorAll(".delete-task").forEach(button => {
      button.addEventListener("click", async () => {
        const taskId = button.dataset.taskId;

        const confirmed = confirm("Delete this task?");
        if (!confirmed) return;

        const res = await fetch(`/tasks/${taskId}`, {
          method: "DELETE"
        });

        if (res.ok) {
          // ✅ Use parentElement correctly here
          const taskEl = button.closest(".task-item");
          if (taskEl) {
              taskEl.remove();}
            updateFolderTaskCount(folderId);
        } 
 else {
          alert("Failed to delete task.");
        }
      });
    });

    // ✏️ Handle task renaming (on blur)
    taskList.querySelectorAll(".task-name").forEach(span => {
      span.addEventListener("blur", async () => {
        const taskId = span.dataset.taskId;
        const newName = span.textContent.trim();
        if (!newName) return;

        await fetch(`/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName })
        });
      });
    });

  } catch (err) {
    taskList.innerHTML = '<p>Error loading tasks.</p>';
    console.error(err);
  }
}



// 6. Show color picker and handle color updates
function showColorPicker(currentColor, folderCard) {
  colorOptionsContainer.innerHTML = '';

  presetColors.forEach(color => {
    const swatch = document.createElement('div');
    swatch.classList.add('color-swatch');
    swatch.style.backgroundColor = color;
    if (color === currentColor) swatch.classList.add('active');

      swatch.addEventListener('click', () => {
      folderDetails.style.backgroundColor = color;
      folderCard.setAttribute('data-color', color);
      // Update sidebar card color background
      folderCard.style.background = `linear-gradient(135deg, ${color}, #ffffff20)`;

    
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    
      // ✅ Persist new color to server
      const folderId = folderDetails.dataset.folderId;
      if (folderId) {
        fetch(`/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color })
        });
      }
    
    });

    colorOptionsContainer.appendChild(swatch);
  });
}

// 7. Handle task submission
const addTaskForm = document.getElementById("add-task-form");
const newTaskInput = document.getElementById("new-task-name");

addTaskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const taskName = newTaskInput.value.trim();
  const folderId = folderDetails.dataset.folderId;
  if (!taskName || !folderId) return;

  const createdAt = Date.now();

  const res = await fetch("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ folderId, taskName, createdAt }),
  });

  const data = await res.json();

  if (data.taskId) {
    const taskEl = document.createElement("div");
    taskEl.classList.add("task-item");
  
    taskEl.innerHTML = `
      <span class="task-name" contenteditable="true" data-task-id="${data.taskId}">${taskName}</span>
      <button class="delete-task" data-task-id="${data.taskId}">🗑</button>
    `;
    animateTaskIn(taskEl);
    // Add event listener for renaming
    const nameSpan = taskEl.querySelector(".task-name");
    nameSpan.addEventListener("blur", async () => {
      const newName = nameSpan.textContent.trim();
      if (!newName) return;
  
      await fetch(`/tasks/${data.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName })
      });
    });
  
    // Add event listener for deleting
    const deleteBtn = taskEl.querySelector(".delete-task");
    deleteBtn.addEventListener("click", async () => {
      const confirmed = confirm("Delete this task?");
      if (!confirmed) return;
  
      const res = await fetch(`/tasks/${data.taskId}`, {
        method: "DELETE"
      });
  
      if (res.ok) {
        taskEl.remove();
          updateFolderTaskCount(folderId);
      } else {
        alert("Failed to delete task.");
      }
    });
  
    taskList.appendChild(taskEl);
    newTaskInput.value = "";
      const currentFolderId = folderDetails.dataset.folderId;
    updateFolderTaskCount(currentFolderId);
  }
   else {
    alert("Failed to add task");
  }
});

document.getElementById("delete-folder").addEventListener("click", () => {
  const folderId = folderDetails.dataset.folderId;
  if (!folderId) return;

  if (!confirm("Are you sure you want to delete this folder?")) return;

  fetch(`/folders/${folderId}`, {
    method: "DELETE"
  }).then(() => {
    // Remove from sidebar
    const card = document.querySelector(`.folder-card[data-id="${folderId}"]`);
    if (card) card.remove();

    // Reset UI
    folderDetails.classList.add("hidden");
    noFolder.classList.remove("hidden");
    folderDetails.dataset.folderId = "";
    taskList.innerHTML = "";
  });
});

document.getElementById("start-guest-mode").addEventListener("click", () => {
  window.location.href = "taskPage.html";
});

document.getElementById("start-pomodoro").addEventListener("click", () => {
  const folderId = folderDetails.dataset.folderId;
  if (!folderId) return alert("No folder is selected.");

  openFolderAndGoToPomodoro(folderId);
});

