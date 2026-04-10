# 🤖 Student AI Assistant

An intelligent learning assistant integrated with the Student App, providing real-time tutoring, content analysis, and study support.

## Features

- **Smart Textbook Reader**: Summarize, explain, and extract key concepts from textbooks
- **Video Analysis**: Extract key points, create summaries, and answer questions about video lectures
- **Exam Prep**: Analyze past questions, generate practice exams, and explain solutions
- **Context-Aware**: Understands which course and material you're studying
- **Real-time Chat**: Interactive conversation with intelligent responses
- **Smart Suggestions**: Contextual recommendations for what to ask next

## Quick Start

### 1. Install Python Dependencies

Make sure you have Python 3.8+ installed, then run:

```bash
cd backend
pip install -r ai_requirements.txt
```

### 2. Start the AI Server

**Option A: Using the batch file (Windows)**
```bash
cd backend
start-ai.bat
```

**Option B: Manual start**
```bash
cd backend
python ai_server.py
```

The server will start on `http://localhost:8000`

### 3. Access AI Features in the Student App

1. Log in as a student
2. Navigate to **My Courses**
3. Select a course
4. Choose **Textbooks**, **Videos**, or **Past Questions**
5. Click the **AI Mode** button (with the sparkle icon)
6. Start chatting with the AI assistant!

## API Documentation

Once the server is running, you can view the full API documentation at:
- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

### Available Endpoints

- `POST /api/chat` - Send a message and get AI response
- `GET /api/conversation/{id}` - Retrieve conversation history
- `DELETE /api/conversation/{id}` - Delete a conversation
- `GET /api/health` - Check service health
- `GET /api/suggestions` - Get contextual suggestions

## Configuration

### Environment Variables

Create a `.env` file in the `backend` folder (optional):

```env
AI_SERVICE_PORT=8000
```

### Frontend Configuration

If you need to change the AI service URL, set this environment variable in your frontend:

```env
VITE_AI_SERVICE_URL=http://localhost:8000
```

Default: `http://localhost:8000`

## How It Works

### AI Engine

The AI assistant uses a rule-based educational intelligence engine that:

1. **Understands Context**: Knows if you're studying textbooks, videos, or preparing for exams
2. **Analyzes Intent**: Identifies what you're trying to accomplish (summarize, explain, practice, etc.)
3. **Provides Structured Responses**: Uses educational best practices like:
   - Feynman Technique for explanations
   - Cornell Notes for video lectures
   - Spaced Repetition for study planning
   - Active Reading for textbook analysis

### Conversation Management

- Each chat session gets a unique conversation ID
- Last 10 messages are kept for context
- Conversations are stored in memory (cleared when server restarts)

## Usage Examples

### Textbook Mode
```
Student: "Summarize the main concepts"
AI: Provides structured summary with key points extraction method

Student: "Explain quantum physics"
AI: Breaks down concept using definition, applications, and connections
```

### Video Mode
```
Student: "What are the key points?"
AI: Provides video learning strategy and note-taking framework

Student: "Create a summary"
AI: Generates structured summary template
```

### Exam Prep Mode
```
Student: "Generate practice questions"
AI: Creates practice questions based on course context

Student: "Explain the solution"
AI: Step-by-step problem-solving framework
```

## Troubleshooting

### AI Service Shows as "Offline"

1. Make sure the Python server is running (`backend/start-ai.bat`)
2. Check if port 8000 is available
3. Verify Python dependencies are installed
4. Check the console for error messages

### No Responses from AI

1. Check browser console for errors
2. Verify CORS is enabled (should allow localhost:5173)
3. Ensure the AI server hasn't crashed
4. Try restarting the AI server

### Installation Issues

**Python not found:**
- Download Python from https://www.python.org/downloads/
- Make sure to check "Add Python to PATH" during installation

**Dependencies fail to install:**
- Try: `pip install --upgrade pip`
- Then: `pip install -r ai_requirements.txt`

## Architecture

```
Student App (React Frontend)
    ↓
AIMode Component (Chat UI)
    ↓
HTTP Requests (Fetch API)
    ↓
AI Server (FastAPI on port 8000)
    ↓
AI Engine (Rule-based Educational Intelligence)
```

## Future Enhancements

Potential improvements:

- [ ] Integration with OpenAI/Anthropic APIs for advanced AI
- [ ] File upload support for textbook analysis
- [ ] Video transcript extraction
- [ ] Persistent conversation history (database storage)
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Integration with course materials API
- [ ] Personalized learning paths
- [ ] Progress tracking and analytics

## Technical Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **Communication**: REST API with JSON

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API docs at http://localhost:8000/docs
3. Check server logs in the terminal where AI server is running

---

**Made for student success! 🎓**
