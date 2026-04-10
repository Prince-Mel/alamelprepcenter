# 🎓 AI Integration Guide - Student App

## Overview

The Student App now includes a fully integrated AI Learning Assistant that provides intelligent tutoring, content analysis, and study support across all courses.

## What Was Added

### Backend (Python AI Service)

1. **`backend/ai_server.py`** - FastAPI-based AI server
   - Chat endpoint with context-aware responses
   - Conversation management system
   - Educational intelligence engine
   - Health monitoring and suggestions API

2. **`backend/ai_requirements.txt`** - Python dependencies
   - FastAPI 0.115.6
   - Uvicorn 0.34.0
   - Pydantic 2.10.4

3. **`backend/start-ai.bat`** - One-click startup script (Windows)

### Frontend (React Components)

1. **`src/sections/AIMode.tsx`** - Complete rewrite
   - Real-time chat interface
   - Connection status indicator
   - Smart suggestions system
   - Context-aware messaging
   - Auto-scroll and loading states

2. **`src/sections/CourseMaterials.tsx`** - Updated
   - Passes course info to AI mode
   - Enhanced context awareness

## How to Use

### First-Time Setup

1. **Ensure Python 3.8+ is installed**
   ```bash
   python --version
   ```

2. **Install AI dependencies**
   ```bash
   cd backend
   pip install -r ai_requirements.txt
   ```

3. **Start the AI server**
   ```bash
   cd backend
   start-ai.bat
   ```
   
   Or manually:
   ```bash
   cd backend
   python ai_server.py
   ```

4. **Verify the server is running**
   - Open browser: http://localhost:8000/api/health
   - You should see: `{"status":"healthy",...}`

### Using AI Mode in the Student App

1. **Start both servers**:
   - Main backend: `cd backend && node server.js`
   - AI service: `cd backend && python ai_server.py`

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Log in as a student**

4. **Navigate to a course**:
   - Click "My Courses"
   - Select any course

5. **Choose a material type**:
   - Textbooks
   - Videos
   - Past Questions

6. **Click the "AI Mode" button** (sparkle icon in the top right)

7. **Start chatting with the AI!**
   - Type your question
   - Or click a suggestion button
   - The AI responds based on your context

## AI Capabilities

### Textbook Mode 📖
- Summarize chapters and concepts
- Explain difficult topics
- Create study notes
- Generate practice questions
- Extract key points

### Video Mode 🎥
- Extract key points from lectures
- Create video summaries
- Answer questions about content
- Suggest related topics
- Organize notes

### Exam Prep Mode 📝
- Analyze past exam questions
- Generate practice exams
- Explain solutions step-by-step
- Identify weak areas
- Create study plans

### General Features
- Context-aware responses (knows your course)
- Smart suggestions based on activity
- Conversation history (last 10 messages)
- Real-time interaction
- Educational best practices

## API Endpoints

The AI server provides these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check service health |
| POST | `/api/chat` | Send message and get AI response |
| GET | `/api/conversation/{id}` | Get conversation history |
| DELETE | `/api/conversation/{id}` | Delete conversation |
| GET | `/api/suggestions` | Get contextual suggestions |

### Example Chat Request

```javascript
fetch('http://localhost:8000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Summarize the main concepts",
    conversation_id: "conv_1234567890_1234",
    context: "textbooks",
    course_info: "Introduction to Physics"
  })
})
```

### Example Chat Response

```json
{
  "response": "Here are the key concepts...\n\n📖 **Main Points:**\n• Point 1\n• Point 2",
  "conversation_id": "conv_1234567890_1234",
  "timestamp": "2026-04-09T16:48:52.441711",
  "suggestions": ["Learn more", "Practice quiz", "Study guide"]
}
```

## Configuration

### Change AI Server Port

Create `backend/.env`:
```env
AI_SERVICE_PORT=8001
```

### Custom AI Service URL

If hosting elsewhere, set in frontend `.env`:
```env
VITE_AI_SERVICE_URL=http://your-ai-server:port
```

## Architecture

```
┌─────────────────────────────────────────┐
│   Student App (React Frontend)          │
│                                         │
│   ┌──────────────────────────────┐     │
│   │   CourseMaterials.tsx        │     │
│   │   - Selects material type    │     │
│   │   - Opens AI Mode            │     │
│   └──────────┬───────────────────┘     │
│              │                          │
│              ▼                          │
│   ┌──────────────────────────────┐     │
│   │   AIMode.tsx                 │     │
│   │   - Chat UI                  │     │
│   │   - Connection status        │     │
│   │   - Smart suggestions        │     │
│   └──────────┬───────────────────┘     │
└──────────────┼─────────────────────────┘
               │
               │ HTTP (Fetch API)
               │
               ▼
┌──────────────────────────────────────────┐
│   AI Server (FastAPI - Port 8000)       │
│                                          │
│   ┌────────────────────────────────┐   │
│   │  /api/chat                     │   │
│   │  /api/health                   │   │
│   │  /api/suggestions              │   │
│   │  /api/conversation/{id}        │   │
│   └──────────┬─────────────────────┘   │
│              │                          │
│              ▼                          │
│   ┌────────────────────────────────┐   │
│   │  AI Engine                     │   │
│   │  - Context analysis            │   │
│   │  - Intent detection            │   │
│   │  - Response generation         │   │
│   │  - Educational strategies      │   │
│   └────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

## Troubleshooting

### AI Shows as "Offline"

**Problem**: AI Mode shows offline status

**Solution**:
1. Check if AI server is running: http://localhost:8000/api/health
2. If not running, start it: `cd backend && python ai_server.py`
3. Check terminal for errors
4. Ensure port 8000 is not in use

### No Response from AI

**Problem**: Messages don't get responses

**Solution**:
1. Open browser console (F12) for errors
2. Verify AI server is running
3. Check CORS settings in ai_server.py
4. Restart AI server

### Python Not Found

**Problem**: `python: command not found`

**Solution**:
1. Install Python from https://www.python.org/downloads/
2. During installation, check "Add Python to PATH"
3. Restart terminal
4. Verify: `python --version`

### Dependency Installation Fails

**Problem**: `pip install` errors

**Solution**:
```bash
# Upgrade pip first
python -m pip install --upgrade pip

# Then install
pip install -r ai_requirements.txt
```

### Port Already in Use

**Problem**: Port 8000 is occupied

**Solution**:
1. Kill process on port 8000:
   - Windows: `netstat -ano | findstr :8000` then `taskkill /PID <PID> /F`
2. Or change port in `ai_server.py`:
   ```python
   port = 8001  # Change to different port
   ```
3. Update frontend `.env` with new URL

## Testing the Integration

### Quick Test

1. **Start AI server**:
   ```bash
   cd backend
   python ai_server.py
   ```

2. **Test health** (in another terminal):
   ```bash
   curl http://localhost:8000/api/health
   ```

3. **Test chat**:
   ```bash
   curl -X POST http://localhost:8000/api/chat \
     -H "Content-Type: application/json" \
     -d "{\"message\": \"Help me study\", \"context\": \"textbooks\"}"
   ```

### Full Integration Test

1. Start all services:
   - Main backend (Node.js)
   - AI server (Python)
   - Frontend (React/Vite)

2. Log in as student

3. Navigate to any course

4. Open AI Mode for textbooks

5. Send message: "Explain the main concepts"

6. Verify AI responds with educational content

7. Check suggestions appear

8. Click a suggestion and verify it works

## Future Enhancements

Potential improvements:

- [ ] Connect to OpenAI/Anthropic API for advanced AI
- [ ] Upload and analyze textbook files (PDF, DOCX)
- [ ] Extract and analyze video transcripts
- [ ] Persistent conversation history in database
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Personalized learning analytics
- [ ] Integration with course content API
- [ ] Automated quiz generation from materials
- [ ] Study progress tracking

## Support

For help:
1. Check this guide's troubleshooting section
2. View API docs: http://localhost:8000/docs
3. Check server logs in terminal
4. Review browser console for frontend errors

---

**AI-powered learning for student success! 🎓✨**
