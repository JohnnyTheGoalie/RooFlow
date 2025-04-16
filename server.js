const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");

const app = express();
const port = 3000;

// Set up SQLite database with timeout
const db = new sqlite3.Database("./database.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});
db.configure("busyTimeout", 5000);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Static files
app.use(express.static("public"));

// Create DB tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    passwordHash TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    color TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER,
    name TEXT NOT NULL,
    created_at INTEGER,
    FOREIGN KEY(folder_id) REFERENCES folders(id)
  )`);
});

// Routes
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const passwordHash = bcrypt.hashSync(password, 10);

  db.run("INSERT INTO users (username, passwordHash) VALUES (?, ?)", [username, passwordHash], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    req.session.userId = this.lastID;
    res.status(200).json({ message: "User created and logged in successfully" });
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err || !row) return res.status(401).json({ message: "Invalid username or password" });
    const match = bcrypt.compareSync(password, row.passwordHash);
    if (match) {
      req.session.userId = row.id;
      res.status(200).json({ message: "Login successful" });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  });
});

app.post("/folders", (req, res) => {
  const { folderName, color } = req.body;
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "You must be logged in" });
  if (!folderName || !color) return res.status(400).json({ message: "Missing folder name or color" });

  db.run("INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)", [userId, folderName, color], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: "Folder created", folderId: this.lastID });
  });
});

app.get("/folders", (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Not logged in" });
  db.all("SELECT * FROM folders WHERE user_id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/tasks", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "You must be logged in" });
  }

  const { folderId, taskName, createdAt } = req.body;
console.log("POST /tasks", { folderId, taskName, createdAt });

  db.run(
    "INSERT INTO tasks (folder_id, name, created_at) VALUES (?, ?, ?)",
    [folderId, taskName, createdAt],
    function (err) {
      if (err) {
        console.error("Insert task failed:", err);
        return res.status(500).json({ error: err.message });
      }

      console.log("Inserted task with ID:", this.lastID);
      res.status(200).json({ message: "Task added successfully", taskId: this.lastID });
    }
  );
});


app.get("/tasks/:folderId", (req, res) => {
  db.all("SELECT * FROM tasks WHERE folder_id = ?", [req.params.folderId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.patch('/folders/:id', (req, res) => {
  const folderId = req.params.id;
  const userId = req.session.userId;
  const { folderName, color } = req.body;

  console.log("Incoming PATCH /folders/:id", {
    folderId,
    userId,
    folderName,
    color
  });

  if (!userId) return res.status(401).json({ message: "Not logged in" });
  if (!folderName && !color) return res.status(400).json({ message: "Nothing to update" });

  const updates = [];
  const params = [];

  if (folderName !== undefined && folderName !== "") {
    updates.push("name = ?");
    params.push(folderName);
  }

  if (color !== undefined && color !== "") {
    updates.push("color = ?");
    params.push(color);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No valid data provided" });
  }

  params.push(folderId, userId);

  const sql = `UPDATE folders SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`;
  console.log("Executing SQL:", sql, params);

  db.run(sql, params, function (err) {
    if (err) {
      console.error("SQLITE ERROR:", err);
      return res.status(500).json({ error: "DB update failed", detail: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Folder not found or not owned by user" });
    }

    res.status(200).json({ message: "Folder updated successfully" });
  });
});


app.delete("/folders/:id", (req, res) => {
  const folderId = req.params.id;
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Not logged in" });

  db.run("DELETE FROM tasks WHERE folder_id = ?", [folderId], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete folder's tasks" });

    db.run("DELETE FROM folders WHERE id = ? AND user_id = ?", [folderId, userId], function(err) {
      if (err) return res.status(500).json({ error: "Failed to delete folder" });
      if (this.changes === 0) return res.status(404).json({ error: "Folder not found or not yours" });
      res.status(204).send();
    });
  });
});

app.delete("/tasks/:id", (req, res) => {
  db.run("DELETE FROM tasks WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to delete task" });
    if (this.changes === 0) return res.status(404).json({ error: "Task not found" });
    res.status(204).send();
  });
});

app.patch("/tasks/:id", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Missing task name" });
  db.run("UPDATE tasks SET name = ? WHERE id = ?", [name, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to update task" });
    if (this.changes === 0) return res.status(404).json({ error: "Task not found" });
    res.status(200).json({ message: "Task updated" });
  });
});

app.get("/folders/:id/task-count", (req, res) => {
  db.get("SELECT COUNT(*) as count FROM tasks WHERE folder_id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ taskCount: row.count });
  });
});

// Auth/redirect pages
app.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "private", "dashboard.html"));
});

app.get("/taskPage", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "taskPage.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "taskPage.html"));
});

app.get("/signup", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "private", "signup.html"));
});

app.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "private", "login.html"));
});

app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Failed to log out" });
    res.redirect("/login");
  });
});

app.get("/me", (req, res) => {
  if (req.session.userId) {
    res.json({ userId: req.session.userId });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});

app.get("/folders/:id", (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Not logged in" });
  db.get("SELECT * FROM folders WHERE id = ? AND user_id = ?", [req.params.id, userId], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(403).json({ error: "You do not have access to this folder" });
    res.status(200).json({ message: "Access granted", folder: row });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


app.get("/folders/:id/task-count", (req, res) => {
  db.get("SELECT COUNT(*) as count FROM tasks WHERE folder_id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ taskCount: row.count });
  });
});
