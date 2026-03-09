# 💬 NightChat — Real-Time Chat App

A full-featured real-time chat app built with **Node.js**, **Express**, and **Socket.io**.

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

### 3. Open in browser
```
http://localhost:3000
```

Open multiple browser tabs to simulate multiple users chatting!

---

## 📁 Project Structure

```
chat-app/
├── server.js          # Node.js + Socket.io backend
├── package.json       # Dependencies
├── public/
│   └── index.html     # Frontend (HTML + CSS + JS)
└── README.md
```

---

## ✨ Features

- ⚡ **Real-time messaging** with Socket.io WebSockets
- 👥 **Live user list** — see who's online
- ✍️ **Typing indicators** — know when others are typing
- 🎨 **Color-coded usernames** — each user gets a unique color
- 📜 **Message history** — last 50 messages shown on join
- 🔔 **Join/leave notifications**
- 📱 **Responsive** — works on mobile too

---

## 🛠 Tech Stack

| Layer      | Technology          |
|------------|---------------------|
| Server     | Node.js + Express   |
| Real-time  | Socket.io           |
| Frontend   | Vanilla HTML/CSS/JS |
| Fonts      | Google Fonts (Syne, Space Mono) |

---

## 🌐 Deploying to the Internet

### Option A: Railway (Recommended - Free)
1. Create account at https://railway.app
2. New Project → Deploy from GitHub
3. Push your code to GitHub first, then connect

### Option B: Render (Free)
1. Create account at https://render.com
2. New Web Service → Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`

### Option C: Heroku
```bash
heroku create your-app-name
git push heroku main
```

---

## 🔧 Next Steps / Enhancements

- [ ] Add MongoDB to persist messages permanently
- [ ] Add user authentication (register/login with password)
- [ ] Add multiple chat rooms
- [ ] Add emoji picker
- [ ] Add file/image sharing
- [ ] Add private direct messages
- [ ] Add message reactions
