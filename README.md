# AI Learning Assistant

An interactive AI-powered learning platform that helps users explore topics, generate learning roadmaps, get detailed explanations, and test their knowledge through quizzes.

## Features

- **Learning Roadmap Generation**: Input any topic to get a structured learning path with organized subtopics
  - Dynamic tree visualization of learning paths
  - Hierarchical topic organization
  - Context-aware subtopic generation
  
- **Topic Explanations**: Get detailed explanations with examples for specific topics in their proper context
  - Structured content with sections
  - Code examples and practical demonstrations
  - Context-aware explanations based on learning path
  
- **Interactive Quizzes**: Test your understanding with automatically generated quizzes based on the topic explanations
  - Multiple question formats (MCQ, True/False, Short Answer)
  - Instant feedback and scoring
  - Detailed explanations for correct answers
  
- **Progress Tracking**: Monitor your learning progress with statistics on topics explored and quiz performance
  - Real-time statistics dashboard
  - Historical performance tracking
  - Activity logging and review

## Technical Stack

### Backend
- Flask web framework for robust server-side operations
- CrewAI for sophisticated AI agent orchestration
- Custom AI agents for:
  - Roadmap generation and structuring
  - Content explanation and example creation
  - Quiz generation and assessment
  - Performance evaluation and feedback

### Frontend
- HTML/CSS/JavaScript for responsive user interface
- Font Awesome for enhanced UI elements and icons
- Prism.js for beautiful code syntax highlighting
- Interactive tree visualization for roadmaps
- Real-time progress tracking widgets

## Installation

1. Clone the repository
2. Install dependencies:
```bash
pip install -r requirements.txt
