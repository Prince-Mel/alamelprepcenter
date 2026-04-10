"""
AI Learning Assistant Backend Service
Provides intelligent tutoring and content analysis for students
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import time
from datetime import datetime
import json
import os
import shutil
import dotenv

# Load environment variables
dotenv.load_dotenv()

# Web search imports
try:
    from ddgs import DDGS
    SEARCH_AVAILABLE = True
except ImportError:
    SEARCH_AVAILABLE = False

# OpenRouter AI (Primary)
OPENROUTER_AVAILABLE = False
openrouter_client = None
try:
    from openai import OpenAI
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key:
        openrouter_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        OPENROUTER_AVAILABLE = True
        print("[OK] OpenRouter AI initialized (Primary)")
    else:
        print("[WARN] OPENROUTER_API_KEY not found in .env")
except ImportError:
    print("[WARN] openai package not installed")
except Exception as e:
    print(f"[WARN] OpenRouter AI error: {e}")

# Google Gemini AI (Secondary/Fallback)
GEMINI_AVAILABLE = False
gemini_client = None
try:
    from google import genai
    from google.genai import types
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        gemini_client = genai.Client(api_key=api_key)
        GEMINI_AVAILABLE = True
        print("[OK] Gemini AI initialized (Fallback)")
    else:
        print("[WARN] GEMINI_API_KEY not found in .env")
except ImportError:
    print("[WARN] google-genai not installed")
except Exception as e:
    print(f"[WARN] Gemini AI error: {e}")

app = FastAPI(title="Student AI Assistant", version="1.0.0")

# CORS Configuration - Allow frontend and existing backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "ai_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory conversation storage
conversations = {}

# File storage for uploaded documents
uploaded_files = {}

# Request/Response Models
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[str] = None  # e.g., 'textbooks', 'videos', 'pastQuestions'
    course_info: Optional[str] = None
    file_id: Optional[str] = None  # Uploaded file for analysis
    video_url: Optional[str] = None  # Video URL for analysis
    user_name: Optional[str] = None  # User's name for personalization
    user_role: Optional[str] = None  # User's role (student, etc.)

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    timestamp: str
    suggestions: list[str] = []

class ConversationHistory(BaseModel):
    conversation_id: str
    messages: list[ChatMessage]

# Knowledge Base for General Questions
GENERAL_KNOWLEDGE = {
    "greetings": {
        "patterns": ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings"],
        "responses": [
            "Hello! Welcome to the AlaMel Student Prep Center. How can I assist with your academic progress today?",
            "Greetings. I'm your AlaMel AI Tutor. What subject shall we focus on?",
        ]
    },
    "how_are_you": {
        "patterns": ["how are you", "how's it going", "how do you do", "what's up"],
        "responses": [
            "I'm functioning well and ready to assist with your studies. What material shall we review?",
            "All systems operational. Let's focus on your academic progress. What would you like to work on?",
        ]
    },
    "name_questions": {
        "patterns": ["what is my name", "who am i", "do you know my name", "what do they call me"],
        "responses": [
            "Your records show your name as {user_name}. How can I assist with your studies today?",
            "I have you registered as {user_name}. Let's return to your academic work. What needs attention?",
        ]
    },
    "identity_questions": {
        "patterns": ["who are you", "what are you", "what can you do", "tell me about yourself"],
        "responses": [
            "I am the AlaMel AI Tutor, your academic support system within the Student Prep Center. I analyze submitted content, provide structured feedback, and guide your understanding across subjects. Upload your work or ask about a concept, and we'll proceed systematically.",
            "I'm your dedicated AI Tutor for AlaMel. My role is to review your submissions, provide academic feedback, and help you reason through challenges. What shall we examine?"
        ]
    },
    "thanks": {
        "patterns": ["thank you", "thanks", "appreciate it", "that's helpful", "much appreciated"],
        "responses": [
            "You're welcome. Let's continue with your progress. What shall we address next?",
            "Glad the feedback was useful. Ready for the next item when you are.",
        ]
    },
    "general_help": {
        "patterns": ["help", "what can you do", "how do i use this", "show me around"],
        "responses": [
            "Here's how I can support your academic progress:\n\n• **Content Analysis** - Upload documents and I'll automatically analyze them\n• **Subject Guidance** - Physics, Biology, Web Development, and general academics\n• **Reasoning Support** - I'll help you work through problems without giving direct answers\n• **Study Strategy** - Structured approaches to reviewing and improving your work\n\nSimply upload a file or share what you're working on, and I'll provide feedback.",
        ]
    }
}

# Profanity Filter List
PROFANITY_LIST = [
    "fuck", "shit", "bitch", "ass", "damn", "bastard", "cunt", "dick", "pussy",
    "nigger", "nigga", "faggot", "retard", "whore", "slut", "piss",
    "wtf", "stfu", "bullshit", "horseshit"
]

def check_profanity(text: str) -> bool:
    """Check if text contains profanity or inappropriate language"""
    text_lower = text.lower()
    return any(word in text_lower for word in PROFANITY_LIST)

# AI Response Generation Engine
class AIEngine:
    """Conversational AI engine that understands context and files"""

    @staticmethod
    def generate_response(message: str, context: str = None, course_info: str = None, history: list = None, file_content: str = None, user_name: str = None) -> dict:
        """Generate responses following AlaMel AI Tutor protocol"""

        message_lower = message.lower()
        
        # GUARDRAIL 1: Profanity check - ZERO TOLERANCE
        if check_profanity(message) or (file_content and check_profanity(file_content)):
            return {
                "response": "I am here to assist with your academic progress. Please resubmit your work using professional and respectful language.",
                "suggestions": ["Resubmit with professional language", "Review academic standards", "Continue with another topic"]
            }
        
        # PROTOCOL: Automatic Content Analysis when content provided without specific question
        if file_content:
            return AIEngine._automatic_content_analysis(message_lower, file_content, context, course_info)
        
        # Handle conversation based on subject context
        return AIEngine._handle_conversation(message_lower, context, course_info, history, user_name)

    @staticmethod
    def _check_general_knowledge(message: str, user_name: str = None) -> str:
        """Check if the message matches any general knowledge patterns"""
        
        import random
        
        for category, data in GENERAL_KNOWLEDGE.items():
            if any(pattern in message for pattern in data["patterns"]):
                response = random.choice(data["responses"])
                # Personalize with user name if available
                if user_name and "{user_name}" in response:
                    response = response.format(user_name=user_name)
                return response
        
        return None

    @staticmethod
    def _automatic_content_analysis(message: str, file_content: str, context: str = None, course_info: str = None) -> dict:
        """PROTOCOL: Automatically analyze submitted content"""
        
        # Check if file extraction actually succeeded
        # If the content is just an error message, skip analysis
        extraction_failed = (
            file_content.startswith('[PDF file uploaded') or
            file_content.startswith('[Word document uploaded') or
            file_content.startswith('[Error reading file') or
            file_content.startswith('[TXT') or
            file_content.startswith('[MD')
        )
        
        if extraction_failed:
            # File extraction failed - inform user and fall back to normal conversation
            return AIEngine._handle_conversation(message, context, course_info, None, None)
        
        # Extract meaningful content
        content_lines = [line.strip() for line in file_content.split('\n') if line.strip()]
        content_text = ' '.join(content_lines)
        word_count = len(file_content.split())
        
        # Determine if there's a specific question
        has_question = any(punct in message for punct in ['?', 'explain', 'what', 'how', 'why'])
        
        # Identify subject context
        subject = AIEngine._detect_subject(content_text, context, course_info)
        
        # Build analysis based on subject
        if subject == 'physics':
            return AIEngine._analyze_physics_content(content_text, message, has_question, word_count)
        elif subject == 'biology':
            return AIEngine._analyze_biology_content(content_text, message, has_question, word_count)
        elif subject == 'webdev':
            return AIEngine._analyze_webdev_content(content_text, message, has_question, word_count)
        else:
            return AIEngine._analyze_general_content(content_text, message, has_question, word_count, subject)

    @staticmethod
    def _detect_subject(content: str, context: str = None, course_info: str = None) -> str:
        """Detect the subject matter from content"""
        content_lower = content.lower()
        
        # Check course info first
        if course_info:
            course_lower = course_info.lower()
            if 'physics' in course_lower or 'force' in content_lower or 'equation' in content_lower:
                return 'physics'
            if 'biology' in course_lower or 'cell' in content_lower or 'organism' in content_lower:
                return 'biology'
            if 'web' in course_lower or 'react' in content_lower or 'javascript' in content_lower:
                return 'webdev'
        
        # Check content indicators
        if any(term in content_lower for term in ['velocity', 'acceleration', 'force', 'energy', 'equation', 'calculate', 'physics']):
            return 'physics'
        if any(term in content_lower for term in ['cell', 'organism', 'biology', 'system', 'species', 'male', 'female']):
            return 'biology'
        if any(term in content_lower for term in ['react', 'component', 'javascript', 'node', 'database', 'api', 'function']):
            return 'webdev'
        
        return 'general'

    @staticmethod
    def _analyze_physics_content(content: str, message: str, has_question: bool, word_count: int) -> dict:
        """Analyze physics content with LaTeX formatting"""
        
        # Extract key physics concepts
        meaningful_sentences = [s.strip() for s in content.replace('\n', ' ').split('. ') if len(s.strip()) > 20]
        
        status = f"**Status:** You've submitted a physics document of approximately {word_count} words. "
        if len(meaningful_sentences) > 0:
            first_concept = meaningful_sentences[0][:100]
            status += f"The material addresses {first_concept.lower()}."
        
        feedback = (
            f"\n\n**Feedback:** "
            f"Review your methodology and ensure all calculations follow proper dimensional analysis. "
            f"When working with equations such as $Q = mc\\Delta T$ for method of mixtures or $F = -kx$ for Hooke's Law, "
            f"verify that males and females conducting experiments maintain consistent measurement protocols. "
            f"Check that your variables are defined and units are consistent throughout."
        )
        
        guidance = (
            f"\n\n**Guidance:** "
            f"Work through each step systematically. "
            f"Identify what quantities are given, what you're solving for, and which principles apply. "
            f"Draw free-body diagrams where applicable, and verify your final answer has correct units."
        )
        
        followup = (
            f"\n\n**Follow-up Question:** "
            f"If you changed one variable in this system by a factor of two, how would the other quantities respond? "
            f"Walk through the relationship logically."
        )
        
        response = status + feedback + guidance + followup
        return {"response": response, "suggestions": ["Review calculations", "Check units", "Work through step-by-step"]}

    @staticmethod
    def _analyze_biology_content(content: str, message: str, has_question: bool, word_count: int) -> dict:
        """Analyze biology content with precision about systems"""
        
        meaningful_sentences = [s.strip() for s in content.replace('\n', ' ').split('. ') if len(s.strip()) > 20]
        
        status = f"**Status:** Submitted biology material contains approximately {word_count} words. "
        if len(meaningful_sentences) > 0:
            first_concept = meaningful_sentences[0][:100]
            status += f"Content begins with {first_concept.lower()}."
        
        feedback = (
            f"\n\n**Feedback:** "
            f"Ensure precision when describing biological systems. "
            f"When referencing organisms such as Tilapia or Lamprey, specify the skeletal and internal systems accurately. "
            f"Note that both males and females exhibit the anatomical structures described, and terminology should reflect biological accuracy. "
            f"Verify that cellular and systemic processes are explained in their correct sequence."
        )
        
        guidance = (
            f"\n\n**Guidance:** "
            f"Organize your content by system level—skeletal, circulatory, respiratory, etc. "
            f"For each system, identify structure, function, and interconnections. "
            f"Use precise anatomical terms and avoid oversimplification of complex biological processes."
        )
        
        followup = (
            f"\n\n**Follow-up Question:** "
            f"How does this biological system interact with at least two other systems in the organism? "
            f"Trace the connections and explain the dependencies."
        )
        
        response = status + feedback + guidance + followup
        return {"response": response, "suggestions": ["Map system interactions", "Verify terminology", "Review structure-function relationships"]}

    @staticmethod
    def _analyze_webdev_content(content: str, message: str, has_question: bool, word_count: int) -> dict:
        """Analyze web development content with full-stack focus"""
        
        meaningful_sentences = [s.strip() for s in content.replace('\n', ' ').split('. ') if len(s.strip()) > 20]
        
        status = f"**Status:** Web development submission of approximately {word_count} words received. "
        if len(meaningful_sentences) > 0:
            first_concept = meaningful_sentences[0][:100]
            status += f"Focus area: {first_concept.lower()}."
        
        feedback = (
            f"\n\n**Feedback:** "
            f"Review your architecture across the full stack—React frontend, Node.js backend, and MySQL database. "
            f"Ensure that both male and female developers on your team follow consistent coding standards. "
            f"Check security practices: input validation, parameterized queries, and proper authentication handling."
        )
        
        guidance = (
            f"\n\n**Guidance:** "
            f"Examine data flow from client to server to database. "
            f"Verify that API endpoints are properly structured, error handling is comprehensive, "
            f"and state management in React components follows best practices. "
            f"Consider edge cases and implement defensive programming."
        )
        
        followup = (
            f"\n\n**Follow-up Question:** "
            f"If a malicious user attempts SQL injection through your API endpoint, "
            f"what layers of your architecture prevent this? Walk through your security model."
        )
        
        response = status + feedback + guidance + followup
        return {"response": response, "suggestions": ["Review security practices", "Check data flow", "Test edge cases"]}

    @staticmethod
    def _analyze_general_content(content: str, message: str, has_question: bool, word_count: int, subject: str) -> dict:
        """Analyze general academic content"""
        
        meaningful_sentences = [s.strip() for s in content.replace('\n', ' ').split('. ') if len(s.strip()) > 20]
        
        status = f"**Status:** Academic submission of {word_count} words in {subject} received. "
        if len(meaningful_sentences) > 0:
            first_concept = meaningful_sentences[0][:100]
            status += f"Primary focus: {first_concept.lower()}."
        
        feedback = (
            f"\n\n**Feedback:** "
            f"Review the logical structure of your argument or analysis. "
            f"Ensure that claims are supported by evidence and that both males and females "
            f"referenced in research are represented accurately. "
            f"Check that your reasoning flows from premise to conclusion without gaps."
        )
        
        guidance = (
            f"\n\n**Guidance:** "
            f"Strengthen your work by identifying the core principle or concept your content rests upon. "
            f"Build outward from that foundation, ensuring each claim connects logically. "
            f"Remove any statements that don't directly support your central argument."
        )
        
        followup = (
            f"\n\n**Follow-up Question:** "
            f"What is the weakest point in your argument, and what evidence or reasoning would strengthen it? "
            f"Identify it and work through a revision."
        )
        
        response = status + feedback + guidance + followup
        return {"response": response, "suggestions": ["Strengthen argument", "Check evidence", "Revise weak points"]}

    @staticmethod
    def _handle_file_conversation(message: str, file_content: str, history: list, context: str = None) -> dict:
        """Handle conversations about uploaded files - read and discuss naturally"""
        
        # Store file content in a way the AI can reference
        # For now, we'll work with the content directly
        content_lines = file_content.split('\n')
        content_text = file_content.strip()
        
        # Try to understand what the file is about
        first_few_lines = content_lines[:10]
        
        # What does the user want to know about the file?
        if any(word in message for word in ['summarize', 'summary', 'what', 'about', 'overview']):
            # Create a natural summary
            summary = AIEngine._create_natural_summary(content_text, first_few_lines)
            return {"response": summary, "suggestions": ["Can you explain that more?", "What are the key points?", "Give me an example"]}
        
        elif any(word in message for word in ['explain', 'explain this', 'what does', 'mean', 'means']):
            explanation = AIEngine._explain_content(content_text)
            return {"response": explanation, "suggestions": ["Can you simplify?", "Give me an example", "Why is this important?"]}
        
        elif any(word in message for word in ['key point', 'main idea', 'important', 'main']):
            key_points = AIEngine._extract_key_points(content_text)
            return {"response": key_points, "suggestions": ["Elaborate on that", "How does this connect?", "Test me on this"]}
        
        elif any(word in message for word in ['question', 'quiz', 'test']):
            quiz = AIEngine._generate_natural_quiz(content_text)
            return {"response": quiz, "suggestions": ["Another question", "Show me the answer", "Make it harder"]}
        
        else:
            # Natural conversational response about the file
            response = AIEngine._chat_about_file(message, content_text, history)
            return {"response": response, "suggestions": ["Tell me more", "What else?", "Can you elaborate?"]}

    @staticmethod
    def _create_natural_summary(content: str, preview_lines: list) -> str:
        """Create a natural, human-like summary of the content"""
        
        # Get a sense of the content
        word_count = len(content.split())
        
        # Try to find meaningful content (skip empty lines)
        meaningful_lines = [line.strip() for line in content.split('\n') if line.strip() and len(line.strip()) > 20]
        
        # Look for what seems like main topics or headings
        potential_topics = []
        for line in meaningful_lines[:20]:
            if len(line) < 100 and (line.isupper() or ':' in line or line.endswith(':')):
                potential_topics.append(line.rstrip(':'))
        
        if potential_topics:
            topics_str = ", ".join(potential_topics[:3]).lower()
            return (
                f"Alright, so this document covers {topics_str}. "
                f"It looks like it's discussing these concepts in some detail. "
                f"The text goes into the specifics of each topic, explaining the key ideas and how they relate to each other.\n\n"
                f"Is there a particular part you'd like me to break down for you? I can explain any concept in simpler terms or give you examples to make it clearer."
            )
        else:
            # Just describe what we see
            first_meaningful = meaningful_lines[0] if meaningful_lines else "various topics"
            return (
                f"So this document starts by talking about {first_meaningful.lower()}. "
                f"It goes on to discuss related concepts and their applications.\n\n"
                f"The main idea seems to be building understanding around these topics - starting with the basics and then going deeper. "
                f"Would you like me to explain any specific part in more detail?"
            )

    @staticmethod
    def _explain_content(content: str) -> str:
        """Explain the content in simple, natural terms"""
        
        meaningful_lines = [line.strip() for line in content.split('\n') if line.strip() and len(line.strip()) > 30]
        
        if len(meaningful_lines) > 0:
            main_topic = meaningful_lines[0][:100]
            return (
                f"Okay, let me break this down. The document is essentially discussing {main_topic.lower()}.\n\n"
                f"Here's the simple version: it's explaining how these concepts work and why they matter. "
                f"The text walks through the ideas step by step, showing how they connect to each other.\n\n"
                f"Think of it this way - imagine you're trying to understand how something works. "
                f"The document starts with the basics, then builds up to more complex ideas. "
                f"Each concept connects to the next, creating a bigger picture.\n\n"
                f"Does that help make it clearer? I can go deeper into any part you'd like."
            )
        else:
            return (
                "Let me put it simply - the document is exploring some key concepts and how they work together. "
                "It's building from foundational ideas toward more complex applications.\n\n"
                "The way I see it, the author is trying to help readers understand the connections between these ideas. "
                "What part would you like me to focus on?"
            )

    @staticmethod
    def _extract_key_points(content: str) -> str:
        """Extract key points in a conversational way"""
        
        # Find sentences that seem important
        sentences = content.replace('\n', ' ').split('. ')
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 30 and len(s.strip()) < 200]
        
        key_ideas = meaningful_sentences[:3] if len(meaningful_sentences) >= 3 else meaningful_sentences
        
        if key_ideas:
            points = "Here are the main ideas I'm picking up on:\n\n"
            for i, idea in enumerate(key_ideas, 1):
                points += f"{i}. {idea}.\n"
            points += "\nThese seem like the core concepts. Everything else in the document builds on or relates to these ideas.\n\n"
            points += "Want me to explain any of these in more detail? Or would you like me to show how they connect to each other?"
            return points
        else:
            return (
                "The key takeaway here is understanding the main concepts and how they relate to each other. "
                "The document is essentially building a framework of ideas that you can apply in different contexts.\n\n"
                "The most important thing is to grasp the underlying principles - once you get those, "
                "everything else tends to fall into place. Shall I walk you through the main concepts?"
            )

    @staticmethod
    def _generate_natural_quiz(content: str) -> str:
        """Generate a conversational quiz"""
        
        meaningful_lines = [line.strip() for line in content.split('\n') if line.strip() and len(line.strip()) > 30]
        
        if len(meaningful_lines) >= 2:
            topic = meaningful_lines[0][:80]
            return (
                f"Alright, let me test your understanding! Here's a question for you:\n\n"
                f"**Question:** Based on what we've been discussing about {topic.lower()}, "
                f"can you explain in your own words what the main idea is and why it's important?\n\n"
                f"Take your time thinking it through - there's no rush. "
                f"When you're ready, share your answer and I'll let you know how you did!"
            )
        else:
            return (
                "Here's a question to check your understanding:\n\n"
                "**Question:** What do you think is the most important concept from what we've discussed, "
                "and how would you explain it to someone who's never heard of it before?\n\n"
                "Go ahead and give it a shot! I'll help you refine your understanding."
            )

    @staticmethod
    def _chat_about_file(message: str, content: str, history: list) -> str:
        """Have a natural conversation about uploaded file content"""
        
        # Try to understand what the user is asking
        if '?' in message:
            # They asked a question about the content
            return (
                f"That's a good question! Based on what I've read in the document, "
                f"the text addresses this by discussing the key concepts and their applications.\n\n"
                f"The document walks through these ideas, showing how they work in practice. "
                f"The author seems to want readers to understand not just what these concepts are, "
                f"but also why they matter and how they connect to the bigger picture.\n\n"
                f"Would you like me to go into more detail on any particular aspect?"
            )
        else:
            # They made a statement - respond conversationally
            return (
                f"I see what you're saying! The document definitely touches on related ideas. "
                f"What I'm finding interesting is how the content builds from basic concepts "
                f"toward more complex applications.\n\n"
                f"It's like the author is laying a foundation and then constructing understanding "
                f"on top of it. Each concept leads naturally to the next.\n\n"
                f"Is there anything specific you'd like to explore further?"
            )
    
    @staticmethod
    def _handle_conversation(message: str, context: str = None, course_info: str = None, history: list = None, user_name: str = None) -> dict:
        """Handle general conversation - fallback when Gemini unavailable"""

        message_lower = message.lower().strip()
        name_str = user_name or "there"

        # Greetings - respond naturally and briefly
        greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'greetings', 'sup', 'yo']
        if any(message_lower == g or message_lower.startswith(g + ',') or message_lower.startswith(g + '!') or message_lower.startswith(g + ' ') for g in greetings):
            greeting_responses = [
                f"Hey {name_str}! 👋 Ready to dive into some learning? What are we working on today?",
                f"Hello {name_str}! Great to see you. What subject shall we tackle?",
                f"Hi {name_str}! I'm here and ready to help. What's on your mind?",
            ]
            import random
            return {"response": random.choice(greeting_responses), "suggestions": ["Explain a concept", "Review material", "Ask a question"]}

        # How are you
        if 'how are you' in message_lower or "how's it going" in message_lower or "how do you do" in message_lower:
            return {"response": f"Running smoothly, thanks for asking! 😊 How about you, {name_str}? Ready to study?", "suggestions": ["Let's study", "I have a question", "Explain something"]}

        # Thanks
        if any(w in message_lower for w in ['thank', 'thanks', 'appreciate', 'helpful']):
            return {"response": f"You're welcome, {name_str}! Always happy to help. What's next?", "suggestions": ["Next topic", "More details", "Practice questions"]}

        # NOTE: Web search disabled here - handled at endpoint level by Gemini

        # Check if user mentioned a file upload
        if 'pdf' in message_lower or 'file' in message_lower or 'upload' in message_lower:
            response = (
                f"I see you've uploaded a file, but I wasn't able to extract the text content from it. "
                f"This usually happens with PDF files that contain scanned images or complex formatting.\n\n"
                f"Here's what you can do:\n"
                f"• **Copy and paste** the text content directly into the chat\n"
                f"• **Install PyPDF2** for better PDF extraction: `pip install PyPDF2`\n"
                f"• **Use a .txt or .md file** instead, which I can read perfectly\n\n"
                f"In the meantime, what specific question did you have? I'll do my best to help based on what you tell me about the material."
            )
            suggestions = ["Paste the text here", "Ask your question", "Try a different file format"]
            return {"response": response, "suggestions": suggestions}
        
        # Study help
        if any(word in message for word in ['study', 'learn', 'understand', 'memorize', 'help me']):
            response = (
                f"Of course! I'm here to help. "
                f"What specifically would you like to work on? "
                f"You can ask me to explain concepts, summarize content, or we can work through something together step by step."
            )
            suggestions = ["Explain a concept", "Summarize content", "Work through together"]

        # Explanation requests
        elif any(word in message for word in ['explain', 'what is', 'how does', 'why', 'define', 'what does']):
            topic = message_lower.split('what is', 1)[-1] if 'what is' in message_lower else message_lower.split('explain', 1)[-1] if 'explain' in message_lower else 'this concept'
            response = (
                f"Good question! {topic.capitalize()} is something that comes up often, and it's totally normal to want it clarified.\n\n"
                f"Here's how I like to think about it: start with the basic idea, then build up from there. "
                f"The key is understanding not just what it is, but why it matters and how it connects to other concepts.\n\n"
                f"Would you like me to go into more detail or give you a specific example?"
            )
            suggestions = ["Give me an example", "Why does it matter?", "Can you simplify?"]

        # General study chat
        else:
            if course_info:
                response = (
                    f"That's interesting! Since you're studying {course_info}, "
                    f"I can definitely help you get a better handle on the material. "
                    f"Feel free to ask me anything specific, or we can just chat through the concepts.\n\n"
                    f"What's been giving you the most trouble so far?"
                )
            else:
                response = (
                    f"I hear you! Studying can definitely be challenging sometimes, "
                    f"but that's what I'm here for. "
                    f"We can work through anything together - just let me know what's on your mind.\n\n"
                    f"What would you like to focus on?"
                )
            suggestions = ["Ask a question", "Review material", "Study strategies"]

        return {"response": response, "suggestions": suggestions}
    
    @staticmethod
    def _handle_textbook_query(message: str, history: list = None) -> tuple:
        """Handle textbook-related queries"""
        
        # Summarization requests
        if any(word in message for word in ['summarize', 'summary', 'brief', 'overview']):
            response = (
                "I can help you summarize textbook content! Here's how to get the best summaries:\n\n"
                "📖 **Key Points Extraction:**\n"
                "• Identify main concepts and definitions\n"
                "• Highlight important examples and case studies\n"
                "• Note relationships between ideas\n\n"
                "💡 **Study Tip:** Try the Feynman Technique - explain concepts in simple terms as if teaching someone else.\n\n"
                "What specific chapter or topic would you like me to help summarize?"
            )
            suggestions = ["Main concepts", "Key definitions", "Important examples"]
        
        # Explanation requests
        elif any(word in message for word in ['explain', 'what is', 'how does', 'why', 'define']):
            topic = message.replace('explain', '').replace('what is', '').replace('how does', '').replace('why', '').replace('define', '').strip()
            response = (
                f"Great question about **'{topic or 'this concept'}'**! Here's how to approach understanding it:\n\n"
                f"🎯 **Breakdown Strategy:**\n"
                f"1. Start with the basic definition\n"
                f"2. Identify real-world applications\n"
                f"3. Connect to related concepts you already know\n"
                f"4. Practice with examples\n\n"
                f"Would you like me to create practice questions or flashcards for this topic?"
            )
            suggestions = ["Practice questions", "Flashcards", "Real-world examples"]
        
        # Study help
        elif any(word in message for word in ['study', 'learn', 'understand', 'memorize']):
            response = (
                "Here are proven study techniques for textbook learning:\n\n"
                "📚 **Active Reading Method:**\n"
                "• **Preview**: Scan headings, diagrams, and summaries first\n"
                "• **Question**: Turn headings into questions before reading\n"
                "• **Read**: Actively search for answers\n"
                "• **Recite**: Summarize in your own words\n"
                "• **Review**: Test yourself after each section\n\n"
                "⏰ **Spaced Repetition**: Review material at increasing intervals (1 day, 3 days, 1 week)\n\n"
                "Which technique would you like to try?"
            )
            suggestions = ["Create study schedule", "Generate quiz", "Make flashcards"]
        
        else:
            response = (
                "I'm your AI study assistant! I can help you with:\n\n"
                "📖 **Textbook Analysis:**\n"
                "• Summarize chapters and key concepts\n"
                "• Explain complex topics in simple terms\n"
                "• Create study guides and notes\n"
                "• Generate practice questions\n\n"
                "💬 Just ask me anything about your reading material!"
            )
            suggestions = ["Summarize content", "Explain concepts", "Study tips"]
        
        return response, suggestions
    
    @staticmethod
    def _handle_video_query(message: str, history: list = None) -> tuple:
        """Handle video-related queries"""
        
        if any(word in message for word in ['summarize', 'summary', 'key points']):
            response = (
                "I can help extract key points from video lectures! Here's what I recommend:\n\n"
                "🎥 **Video Learning Strategy:**\n"
                "• Take timestamped notes for important sections\n"
                "• Pause and summarize every 10-15 minutes\n"
                "• Note down questions for later review\n\n"
                "What specific part of the video would you like help with?"
            )
            suggestions = ["Main takeaways", "Action items", "Review questions"]
        
        elif any(word in message for word in ['note', 'notes', 'takeaway']):
            response = (
                "Here's an effective note-taking framework for video lectures:\n\n"
                "📝 **Cornell Notes Method:**\n"
                "• **Main Ideas** (right column): Key concepts and details\n"
                "• **Cues** (left column): Questions and keywords\n"
                "• **Summary** (bottom): 2-3 sentence recap\n\n"
                "Would you like me to help organize your notes?"
            )
            suggestions = ["Organize notes", "Create summary", "Generate quiz"]
        
        else:
            response = (
                "I'm here to enhance your video learning experience!\n\n"
                "🎬 **How I can help:**\n"
                "• Extract and organize key points\n"
                "• Answer questions about lecture content\n"
                "• Create study materials from videos\n"
                "• Suggest related topics to explore\n\n"
                "What would you like to focus on?"
            )
            suggestions = ["Key points", "Q&A about video", "Related resources"]
        
        return response, suggestions
    
    @staticmethod
    def _handle_past_questions(message: str, history: list = None) -> tuple:
        """Handle past questions/exam prep"""
        
        if any(word in message for word in ['exam', 'test', 'practice', 'question']):
            response = (
                "Let's prepare you for success! Here's my approach:\n\n"
                "✅ **Exam Prep Strategy:**\n"
                "• Review past questions to identify patterns\n"
                "• Practice under timed conditions\n"
                "• Focus on weak areas first\n"
                "• Create summary sheets for quick review\n\n"
                "Would you like me to:\n"
                "1. Generate practice questions?\n"
                "2. Explain specific concepts?\n"
                "3. Create a study plan?"
            )
            suggestions = ["Practice questions", "Explain concepts", "Study plan"]
        
        elif any(word in message for word in ['answer', 'solution', 'solve']):
            response = (
                "I'll help you work through solutions step-by-step!\n\n"
                "🧠 **Problem-Solving Framework:**\n"
                "1. **Understand**: What is the question asking?\n"
                "2. **Plan**: What concepts/methods apply?\n"
                "3. **Execute**: Work through systematically\n"
                "4. **Verify**: Does the answer make sense?\n\n"
                "Share the specific question you'd like help with!"
            )
            suggestions = ["Step-by-step help", "Similar examples", "Practice more"]
        
        else:
            response = (
                "I'm your exam prep assistant! I can help you:\n\n"
                "📋 **Preparation Services:**\n"
                "• Analyze past exam patterns\n"
                "• Generate practice questions\n"
                "• Explain solutions in detail\n"
                "• Create focused study plans\n\n"
                "What's your biggest challenge right now?"
            )
            suggestions = ["Practice exam", "Review weak areas", "Study strategy"]
        
        return response, suggestions
    
    @staticmethod
    def _handle_general_query(message: str, history: list = None) -> tuple:
        """Handle general educational queries"""
        
        # Greeting detection
        if any(word in message for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
            response = (
                "Hello! 👋 I'm your AI Learning Assistant. I'm here to help you succeed!\n\n"
                "I can assist with:\n"
                "📖 Summarizing textbooks and lectures\n"
                "❓ Answering questions about course material\n"
                "📝 Creating study guides and practice questions\n"
                "💡 Explaining complex topics in simple terms\n\n"
                "What would you like to work on today?"
            )
            suggestions = ["Study help", "Summarize content", "Practice questions"]
        
        # Thanks detection
        elif any(word in message for word in ['thank', 'thanks', 'appreciate', 'helpful']):
            response = (
                "You're welcome! 😊 I'm glad I could help. Remember:\n\n"
                "💪 **Consistent practice** is the key to mastery\n"
                "🎯 **Focus on understanding**, not just memorizing\n"
                "⏰ **Take breaks** to avoid burnout\n\n"
                "Is there anything else you'd like help with?"
            )
            suggestions = ["More help", "Study tips", "Practice quiz"]
        
        # Help request
        elif any(word in message for word in ['help', 'what can you do', 'how to use', 'features']):
            response = (
                "Here's everything I can help you with:\n\n"
                "🎓 **Learning Support:**\n"
                "• Explain any topic in your course\n"
                "• Create custom study guides\n"
                "• Generate practice quizzes\n"
                "• Summarize textbooks and lectures\n\n"
                "📊 **Study Optimization:**\n"
                "• Identify key concepts to focus on\n"
                "• Create memorization techniques\n"
                "• Build exam preparation plans\n"
                "• Track your understanding\n\n"
                "💬 **Just ask me anything!** I'm here 24/7 to support your learning journey."
            )
            suggestions = ["Explain a topic", "Create study guide", "Take a quiz"]
        
        else:
            # Default intelligent response
            response = (
                f"I understand you're asking about: **'{message[:50]}{'...' if len(message) > 50 else ''}**\n\n"
                "While I'm analyzing your question, here's how I can best help:\n\n"
                "🎯 **Be specific**: Mention the exact topic or concept\n"
                "📚 **Provide context**: Which course or subject?\n"
                "❓ **Ask direct questions**: I give better answers to clear questions\n\n"
                "Try rephrasing your question with more details, or choose from the suggestions below!"
            )
            suggestions = ["Be more specific", "Choose a topic", "Get study tips"]
        
        return response, suggestions


# Web Search Function
def search_web(query: str, max_results: int = 5) -> dict:
    """Search the web for real-time information"""
    
    if not SEARCH_AVAILABLE:
        return {
            'success': False,
            'error': 'Search not available',
            'results': []
        }
    
    try:
        results = []
        with DDGS() as ddgs:
            search_results = ddgs.text(query, max_results=max_results)
            for result in search_results:
                results.append({
                    'title': result.get('title', ''),
                    'snippet': result.get('body', ''),
                    'url': result.get('href', '')
                })
        
        return {
            'success': True,
            'query': query,
            'results': results,
            'count': len(results)
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'results': []
        }


def generate_search_response(query: str, search_results: dict) -> str:
    """Generate a helpful response based on search results"""
    
    if not search_results.get('success') or not search_results.get('results'):
        return (
            f"I tried searching for information about **{query}**, but couldn't find specific results right now.\n\n"
            f"However, I can still help you understand the concept! What specific aspect would you like me to explain?"
        )
    
    # Build response from search results
    response_parts = []
    
    # Opening
    response_parts.append(f"Based on my search about **{query}**, here's what I found:\n")
    
    # Add top results
    for i, result in enumerate(search_results['results'][:3], 1):
        title = result.get('title', 'Unknown')
        snippet = result.get('snippet', '')[:200]  # Limit snippet length
        
        if snippet:
            response_parts.append(f"**{i}. {title}**")
            response_parts.append(f"{snippet}\n")
    
    # Summary
    response_parts.append("\n**Key Takeaways:**")
    response_parts.append("I found several sources discussing this topic. The main points above summarize the current understanding.")
    response_parts.append("\nWould you like me to:")
    response_parts.append("• Explain any specific point in more detail?")
    response_parts.append("• Search for more specific information?")
    response_parts.append("• Help you understand how this relates to your studies?")
    
    return "\n".join(response_parts)


# AI Query Functions - Priority Chain: OpenRouter -> Gemini -> Web Search -> Rule-based
def query_openrouter(prompt: str, system_context: str = None, conversation_history: list = None, file_content: str = None, video_content: str = None) -> str:
    """Query OpenRouter AI (Primary) with the AlaMel AI Tutor persona"""
    
    if not OPENROUTER_AVAILABLE or not openrouter_client:
        return None
    
    try:
        # Build the system prompt with AlaMel AI Tutor persona
        system_prompt = """You are the "AlaMel AI Tutor," a specialized educational intelligence for the AlaMel Student Prep Center. You serve as a supportive Teacher-Counselor. Your tone is academic, grounded, and encouraging.

## RESPONSE CLASSIFICATION
First, classify the student's input into one of these categories:
1. **Casual/Greeting** - "Hi", "Hello", "How are you?", "Thanks", etc.
   - Respond naturally and conversationally. No analysis needed.
   - Keep it brief and welcoming.
2. **Academic Content Submission** - Textbook excerpts, notes, essays, code, questions about subject matter.
   - Perform a "Comprehensive Content Analysis" (see below).
3. **Direct Question** - "Can you explain...?", "What is...?", "Help me understand..."
   - Provide a clear, structured explanation.

## OPERATIONAL PROTOCOL (FOR ACADEMIC SUBMISSIONS ONLY)
**Trigger:** When a student provides academic content (text, code, or file) without a specific question.
**Process:** Silently evaluate the content against academic standards.
**Output Format:**
   - **Status:** A brief summary of what was submitted.
   - **Feedback:** Assessment of logic, accuracy, and depth.
   - **Guidance:** One specific suggestion for improvement.
   - **Follow-up:** A Socratic question to deepen their thinking.

## CONDUCT & PROFANITY FILTER (STRICT)
- **ZERO TOLERANCE:** If the student's input contains profanity, slurs, or highly inappropriate language, you must NOT analyze the content.
- **RESPONSE:** Stop the analysis immediately. Respond with: "I am here to assist with your academic progress. Please resubmit your work using professional and respectful language."
- **TONE:** Remain calm and neutral; do not lecture the student, but do not engage with the inappropriate content.

## SUBJECT-SPECIFIC RULES
- **PHYSICS:** Use LaTeX for all formal math (e.g., $Q = mc\\Delta T$). Focus on the method of mixtures and Hooke's Law.
- **BIOLOGY:** Maintain precision regarding skeletal and internal systems (e.g., Tilapia, Lamprey).
- **WEB DEV:** Focus on full-stack architecture (React/Node.js/MySQL) and security.
- **TERMINOLOGY:** You are STRICTLY REQUIRED to use "males and females" instead of "men and women" in all academic and research contexts.

## GUARDRAILS
- Do not provide direct answers to homework; provide the *logic* so the student can find the answer.
- Match your response depth to the input—keep greetings short, go deep for academic content.

## RESPONSE STYLE
- Be conversational but academic
- Provide real, accurate information
- Be encouraging but maintain professional standards
- Use formatting (bullet points, numbered lists, bold) for clarity when explaining concepts
"""

        if system_context:
            system_prompt += f"\n\n## CURRENT CONTEXT\n{system_context}"

        # Build messages
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-7:]:  # Last 7 messages for context
                messages.append({
                    "role": "assistant" if msg.get('role') == 'assistant' else "user",
                    "content": msg.get('content')
                })

        # Add current user message with file/video content if present
        user_content = prompt
        if file_content:
            user_content = f"[Uploaded file content]\n{file_content[:4000]}\n\n[My question]\n{prompt}"
        if video_content:
            user_content = f"[Video Transcript]\n{video_content[:5000]}\n\n[My question]\n{prompt}"

        messages.append({"role": "user", "content": user_content})

        # Query OpenRouter - try multiple free models for reliability
        # Note: Free models change frequently, updated with currently available models
        models_to_try = [
            "minimax/minimax-m2.5:free",               # Primary - fast and reliable
            "google/gemma-4-26b-a4b-it:free",          # Gemma 4 - strong reasoning
            "google/gemma-4-31b-it:free",              # Gemma 4 31B - larger context
            "nvidia/nemotron-3-super-120b-a12b:free",  # Nemotron - powerful
            "nvidia/nemotron-3-nano-30b-a3b:free",     # Nemotron Nano - faster
            "arcee-ai/trinity-large-preview:free",     # Trinity - good fallback
            "liquid/lfm-2.5-1.2b-instruct:free",       # LFM instruct - reliable
            "liquid/lfm-2.5-1.2b-thinking:free",       # LFM thinking - reasoning
        ]
        
        last_error = None
        for model_name in models_to_try:
            try:
                # Build request body - reasoning only for models that support it
                request_kwargs = {
                    "model": model_name,
                    "messages": messages,
                    "timeout": 15.0,
                }
                # Only add reasoning for models that support it
                if "minimax" in model_name or "qwen" in model_name or "deepseek" in model_name:
                    request_kwargs["extra_body"] = {"reasoning": {"enabled": True}}

                response = openrouter_client.chat.completions.create(**request_kwargs)
                
                if response.choices and response.choices[0].message:
                    content = response.choices[0].message.content
                    if content and len(content) > 10:
                        print(f"[OK] OpenRouter response from model: {model_name}")
                        return content
                    else:
                        print(f"[WARN] Model {model_name} returned empty/short response ({len(content) if content else 0} chars)")
            except Exception as e:
                print(f"[WARN] Model {model_name} failed: {type(e).__name__}")
                last_error = e
                continue

        print(f"All OpenRouter models failed. Last error: {last_error}")
        return None
    
    except Exception as e:
        print(f"OpenRouter error: {e}")
        return None


def query_gemini(prompt: str, system_context: str = None, conversation_history: list = None) -> str:
    """Query Gemini AI with the AlaMel AI Tutor persona"""

    if not GEMINI_AVAILABLE or not gemini_client:
        return None

    try:
        # Build the system prompt with AlaMel AI Tutor persona
        system_prompt = """You are the "AlaMel AI Tutor," a specialized educational intelligence for the AlaMel Student Prep Center. You serve as a supportive Teacher-Counselor. Your tone is academic, grounded, and encouraging.

## RESPONSE CLASSIFICATION
First, classify the student's input into one of these categories:
1. **Casual/Greeting** - "Hi", "Hello", "How are you?", "Thanks", etc.
   - Respond naturally and conversationally. No analysis needed.
   - Keep it brief and welcoming.
2. **Academic Content Submission** - Textbook excerpts, notes, essays, code, questions about subject matter.
   - Perform a "Comprehensive Content Analysis" (see below).
3. **Direct Question** - "Can you explain...?", "What is...?", "Help me understand..."
   - Provide a clear, structured explanation.

## OPERATIONAL PROTOCOL (FOR ACADEMIC SUBMISSIONS ONLY)
**Trigger:** When a student provides academic content (text, code, or file) without a specific question.
**Process:** Silently evaluate the content against academic standards.
**Output Format:**
   - **Status:** A brief summary of what was submitted.
   - **Feedback:** Assessment of logic, accuracy, and depth.
   - **Guidance:** One specific suggestion for improvement.
   - **Follow-up:** A Socratic question to deepen their thinking.

## CONDUCT & PROFANITY FILTER (STRICT)
- **ZERO TOLERANCE:** If the student's input contains profanity, slurs, or highly inappropriate language, you must NOT analyze the content.
- **RESPONSE:** Stop the analysis immediately. Respond with: "I am here to assist with your academic progress. Please resubmit your work using professional and respectful language."
- **TONE:** Remain calm and neutral; do not lecture the student, but do not engage with the inappropriate content.

## SUBJECT-SPECIFIC RULES
- **PHYSICS:** Use LaTeX for all formal math (e.g., $Q = mc\\Delta T$). Focus on the method of mixtures and Hooke's Law.
- **BIOLOGY:** Maintain precision regarding skeletal and internal systems (e.g., Tilapia, Lamprey).
- **WEB DEV:** Focus on full-stack architecture (React/Node.js/MySQL) and security.
- **TERMINOLOGY:** You are STRICTLY REQUIRED to use "males and females" instead of "men and women" in all academic and research contexts.

## GUARDRAILS
- Do not provide direct answers to homework; provide the *logic* so the student can find the answer.
- Match your response depth to the input—keep greetings short, go deep for academic content.

## RESPONSE STYLE
- Be conversational but academic
- Provide real, accurate information
- Be encouraging but maintain professional standards
- Use formatting (bullet points, numbered lists, bold) for clarity when explaining concepts
"""

        if system_context:
            system_prompt += f"\n\n## CURRENT CONTEXT\n{system_context}"

        # Build the full prompt
        user_prompt = prompt
        if conversation_history:
            history_text = "\n## RECENT CONVERSATION\n"
            for msg in conversation_history[-5:]:
                role = "Student" if msg.get('role') == 'user' else "Tutor"
                history_text += f"{role}: {msg.get('content')}\n"
            user_prompt = history_text + f"\n## CURRENT MESSAGE\n{prompt}"

        # Query Gemini
        response = gemini_client.models.generate_content(
            model='gemini-2.0-flash',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt
            )
        )
        return response.text
    
    except Exception as e:
        print(f"Gemini error: {e}")
        import traceback
        traceback.print_exc()
        return None


# Video Processing Functions
def extract_video_info(video_url: str) -> dict:
    """Extract transcript and metadata from video URLs (YouTube, etc.)"""
    
    result = {
        'success': False,
        'title': '',
        'transcript': '',
        'duration': '',
        'error': ''
    }
    
    try:
        # Check if it's a YouTube/YouTube URL
        if 'youtube.com' in video_url or 'youtu.be' in video_url:
            return extract_youtube_transcript(video_url)
        
        # For other video URLs, try yt-dlp
        else:
            return extract_generic_video_transcript(video_url)
    
    except Exception as e:
        result['error'] = str(e)
        return result


def extract_youtube_transcript(video_url: str) -> dict:
    """Extract transcript from YouTube videos"""
    
    from youtube_transcript_api import YouTubeTranscriptApi
    
    result = {
        'success': False,
        'title': '',
        'transcript': '',
        'duration': '',
        'error': ''
    }
    
    try:
        # Extract video ID from URL
        video_id = None
        if 'youtube.com' in video_url:
            # Handle various YouTube URL formats
            if 'v=' in video_url:
                video_id = video_url.split('v=')[1].split('&')[0]
            elif '/embed/' in video_url:
                video_id = video_url.split('/embed/')[1].split('?')[0]
        elif 'youtu.be' in video_url:
            video_id = video_url.split('/')[-1].split('?')[0]
        
        if not video_id:
            result['error'] = "Could not extract video ID from URL"
            return result
        
        # Try to get transcript
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
            full_transcript = ' '.join([entry['text'] for entry in transcript_list])
            
            # Get video metadata using yt-dlp
            import yt_dlp
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                result['title'] = info.get('title', 'YouTube Video')
                result['duration'] = info.get('duration_string', '')
            
            result['success'] = True
            result['transcript'] = full_transcript
            return result
        
        except Exception as e:
            # If transcript extraction fails, try yt-dlp for subtitles
            import yt_dlp
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en'],
                'skip_download': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                result['title'] = info.get('title', 'YouTube Video')
                result['duration'] = info.get('duration_string', '')
                
                # Try to get subtitles
                subtitles = info.get('subtitles', {}) or info.get('automatic_captions', {})
                if subtitles and 'en' in subtitles:
                    # Get subtitle URL
                    sub_url = subtitles['en'][0]['url']
                    import requests
                    sub_response = requests.get(sub_url)
                    # Parse XML subtitle format
                    import re
                    sub_text = re.sub(r'<[^>]+>', ' ', sub_response.text)
                    sub_text = re.sub(r'\s+', ' ', sub_text).strip()
                    result['transcript'] = sub_text
                    result['success'] = True
                else:
                    result['error'] = "No transcript/subtitles available for this video"
            
            return result
    
    except Exception as e:
        result['error'] = f"Failed to extract transcript: {str(e)}"
        return result


def extract_generic_video_transcript(video_url: str) -> dict:
    """Extract info from non-YouTube video URLs"""
    
    result = {
        'success': False,
        'title': '',
        'transcript': '',
        'duration': '',
        'error': ''
    }
    
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            result['title'] = info.get('title', 'Video')
            result['duration'] = info.get('duration_string', '')
            result['error'] = "Transcript extraction not available for this video source"
    
    except Exception as e:
        result['error'] = f"Failed to process video: {str(e)}"
    
    return result


# File Processing Utilities
def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text content from uploaded files"""
    
    try:
        if file_type == 'txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        elif file_type == 'pdf':
            # Try to use PyPDF2 if available, fallback to basic extraction
            try:
                import PyPDF2
                text = ""
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                return text if text else "[PDF content could not be extracted]"
            except ImportError:
                # Fallback without PyPDF2
                return f"[PDF file uploaded: {os.path.basename(file_path)}] - Install PyPDF2 for full extraction"
        
        elif file_type == 'docx':
            try:
                from docx import Document
                doc = Document(file_path)
                return "\n".join([para.text for para in doc.paragraphs])
            except ImportError:
                return f"[Word document uploaded: {os.path.basename(file_path)}] - Install python-docx for full extraction"
        
        else:
            return f"[{file_type.upper()} file uploaded: {os.path.basename(file_path)}]"
    
    except Exception as e:
        return f"[Error reading file: {str(e)}]"


# API Endpoints
@app.post("/api/upload", response_model=dict)
async def upload_file(file: UploadFile = File(...)):
    """Upload a file for AI analysis"""
    
    try:
        # Validate file type
        allowed_extensions = ['.txt', '.pdf', '.docx', '.md']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (max 10MB)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size: 10MB"
            )
        
        # Save file
        file_id = f"file_{int(time.time())}_{hash(file.filename) % 10000}"
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Extract text
        extracted_text = extract_text_from_file(file_path, file_ext[1:])
        
        # Store file info
        uploaded_files[file_id] = {
            'id': file_id,
            'filename': file.filename,
            'file_path': file_path,
            'file_type': file_ext[1:],
            'file_size': len(content),
            'extracted_text': extracted_text,
            'upload_time': datetime.now().isoformat()
        }
        
        return {
            'status': 'success',
            'file_id': file_id,
            'filename': file.filename,
            'file_type': file_ext[1:],
            'file_size': len(content),
            'extracted_text_preview': extracted_text[:500] if extracted_text else '',
            'message': f'File "{file.filename}" uploaded successfully'
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/api/file/{file_id}")
async def get_file_info(file_id: str):
    """Get information about an uploaded file"""
    
    if file_id not in uploaded_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_info = uploaded_files[file_id]
    return {
        'id': file_info['id'],
        'filename': file_info['filename'],
        'file_type': file_info['file_type'],
        'file_size': file_info['file_size'],
        'upload_time': file_info['upload_time'],
        'text_length': len(file_info['extracted_text'])
    }


@app.delete("/api/file/{file_id}")
async def delete_file(file_id: str):
    """Delete an uploaded file"""
    
    if file_id not in uploaded_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Delete physical file
        file_path = uploaded_files[file_id]['file_path']
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from storage
        del uploaded_files[file_id]
        
        return {'status': 'success', 'message': 'File deleted'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint - processes user messages and returns AI responses"""

    try:
        # Generate or retrieve conversation ID
        conversation_id = request.conversation_id or f"conv_{int(time.time())}_{hash(request.message) % 10000}"

        # Initialize conversation if new
        if conversation_id not in conversations:
            conversations[conversation_id] = []

        # Check if there's an uploaded file
        file_content = None
        if request.file_id and request.file_id in uploaded_files:
            file_content = uploaded_files[request.file_id]['extracted_text']

        # Check if there's a video URL to analyze
        video_content = None
        video_info = {}
        if request.video_url:
            print(f"🎥 Processing video: {request.video_url}")
            video_result = extract_video_info(request.video_url)
            if video_result['success']:
                video_content = video_result['transcript']
                video_info = {
                    'title': video_result['title'],
                    'duration': video_result['duration']
                }
                print(f"[OK] Video transcript extracted: {len(video_content)} chars")
            else:
                print(f"[WARN] Video extraction failed: {video_result['error']}")

        # Create user message
        user_message_content = request.message
        if file_content:
            file_info = uploaded_files[request.file_id]
            user_message_content = f"[Uploaded file: {file_info['filename']}]\n{request.message}"
        if video_content:
            user_message_content = f"[Video: {video_info.get('title', 'Video')}]\n[Video Duration: {video_info.get('duration', '')}]\n[Video Transcript]\n{video_content[:5000]}\n\n[My Question]\n{request.message}"

        user_message = ChatMessage(
            role="user",
            content=user_message_content,
            timestamp=datetime.now().isoformat()
        )
        conversations[conversation_id].append(user_message)

        # Get conversation history for context
        history = conversations[conversation_id][-10:]  # Last 10 messages

        # AI PRIORITY CHAIN: OpenRouter -> Gemini -> Rule-based fallback
        ai_response = None

        # 1. Try OpenRouter (Primary AI) - MiniMax M2.5 free model
        if OPENROUTER_AVAILABLE:
            system_context = f"Student: {request.user_name or 'Unknown'}\nCourse: {request.course_info or 'General'}\nMaterial Type: {request.context or 'General Study'}"
            if video_content:
                system_context += f"\nVideo: {video_info.get('title', '')} ({video_info.get('duration', '')})"
            try:
                ai_response = query_openrouter(
                    prompt=request.message,
                    system_context=system_context,
                    conversation_history=[{"role": m.role, "content": m.content} for m in history],
                    file_content=file_content,
                    video_content=video_content[:5000] if video_content else None
                )
            except Exception as e:
                print(f"❌ OpenRouter exception: {e}")

        # 2. Fallback to Gemini if OpenRouter failed
        if not ai_response and GEMINI_AVAILABLE:
            try:
                prompt_with_video = request.message
                if video_content:
                    prompt_with_video = f"[Video Transcript]\n{video_content[:3000]}\n\n[Question]\n{request.message}"
                ai_response = query_gemini(
                    prompt=prompt_with_video,
                    system_context=f"Student: {request.user_name or 'Unknown'}\nCourse: {request.course_info or 'General'}",
                    conversation_history=[{"role": m.role, "content": m.content} for m in history]
                )
            except Exception as e:
                print(f"❌ Gemini exception: {e}")

        # 3. Final fallback: Rule-based AI engine
        if not ai_response:
            ai_result = AIEngine.generate_response(
                message=request.message,
                context=request.context,
                course_info=request.course_info,
                history=history,
                file_content=file_content,
                user_name=request.user_name
            )
        else:
            ai_result = {
                "response": ai_response,
                "suggestions": ["Explain further", "Give me an example", "Test my understanding"]
            }

        # Create assistant message
        assistant_message = ChatMessage(
            role="assistant",
            content=ai_result['response'],
            timestamp=datetime.now().isoformat()
        )
        conversations[conversation_id].append(assistant_message)

        # Return response
        return ChatResponse(
            response=ai_result['response'],
            conversation_id=conversation_id,
            timestamp=datetime.now().isoformat(),
            suggestions=ai_result['suggestions']
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@app.get("/api/conversation/{conversation_id}", response_model=ConversationHistory)
async def get_conversation(conversation_id: str):
    """Retrieve conversation history"""
    
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return ConversationHistory(
        conversation_id=conversation_id,
        messages=conversations[conversation_id]
    )


@app.delete("/api/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation"""
    
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"status": "success", "message": "Conversation deleted"}
    
    raise HTTPException(status_code=404, detail="Conversation not found")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Student AI Assistant",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "active_conversations": len(conversations)
    }


@app.get("/api/suggestions")
async def get_suggestions(context: str = None):
    """Get contextual suggestions for students"""
    
    suggestions = {
        "textbooks": [
            "Summarize the main concepts",
            "Create study notes",
            "Explain difficult terms",
            "Generate practice questions"
        ],
        "videos": [
            "Extract key points",
            "Create video summary",
            "Generate quiz from content",
            "Suggest related topics"
        ],
        "pastQuestions": [
            "Analyze question patterns",
            "Create practice exam",
            "Explain solutions",
            "Identify weak areas"
        ],
        "general": [
            "Help me study",
            "Explain a concept",
            "Create a quiz",
            "Study tips"
        ]
    }
    
    return {
        "context": context or "general",
        "suggestions": suggestions.get(context, suggestions["general"])
    }


if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 8000))
    print(f"\n{'='*60}")
    print(f"[AI] Student AI Assistant Starting...")
    print(f"{'='*60}")
    print(f"[AI] Server: http://localhost:{port}")
    print(f"[AI] API Docs: http://localhost:{port}/docs")
    print(f"[AI] Health: http://localhost:{port}/api/health")
    print(f"{'='*60}\n")
    
    uvicorn.run(
        "ai_server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
