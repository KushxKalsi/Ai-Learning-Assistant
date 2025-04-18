// Learning progress tracking
let learningStats = {
    topicsExplored: 0,
    quizzesCompleted: 0,
    quizScores: [],
    recentActivity: []
};

// Initialize stats from localStorage if available
document.addEventListener('DOMContentLoaded', function() {
    const savedStats = localStorage.getItem('learningStats');
    if (savedStats) {
        learningStats = JSON.parse(savedStats);
        updateStatsDisplay();
    }
    
    // Hide loading overlay initially
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
    
    // Setup sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const content = document.querySelector('.content');
    
    if (sidebarToggle && sidebar && content) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('expanded');
            content.classList.toggle('sidebar-expanded');
            
            // Change icon based on state
            const icon = this.querySelector('i');
            if (sidebar.classList.contains('expanded')) {
                icon.classList.remove('fa-expand');
                icon.classList.add('fa-compress');
            } else {
                icon.classList.remove('fa-compress');
                icon.classList.add('fa-expand');
            }
        });
    }
});

// Show/hide loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

// Custom Alert Functions
function showCustomAlert(message) {
    const alertOverlay = document.getElementById('customAlertOverlay');
    const alertMessage = document.getElementById('customAlertMessage');
    const alertButton = document.getElementById('customAlertButton');
    
    if (alertOverlay && alertMessage) {
        // Set the message
        alertMessage.textContent = message;
        
        // Show the alert
        alertOverlay.classList.add('active');
        
        // Set up the button to close the alert
        alertButton.onclick = function() {
            hideCustomAlert();
        };
        
        // Also close when clicking outside the alert
        alertOverlay.onclick = function(event) {
            if (event.target === alertOverlay) {
                hideCustomAlert();
            }
        };
        
        // Close on Escape key
        document.addEventListener('keydown', handleEscapeKey);
    }
}

function hideCustomAlert() {
    const alertOverlay = document.getElementById('customAlertOverlay');
    if (alertOverlay) {
        alertOverlay.classList.remove('active');
        
        // Remove event listener
        document.removeEventListener('keydown', handleEscapeKey);
    }
}

function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        hideCustomAlert();
    }
}

// Update stats display
function updateStatsDisplay() {
    // Save to localStorage first to ensure persistence
    localStorage.setItem('learningStats', JSON.stringify(learningStats));
    
    // Update DOM elements
    document.getElementById('topicsExplored').textContent = learningStats.topicsExplored;
    document.getElementById('quizzesCompleted').textContent = learningStats.quizzesCompleted;
    
    // Calculate average score
    const avgScore = learningStats.quizScores.length > 0 
        ? Math.round(learningStats.quizScores.reduce((a, b) => a + b, 0) / learningStats.quizScores.length) 
        : 0;
    document.getElementById('averageScore').textContent = `${avgScore}%`;
    
    // Update activity list
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';
    
    // Show most recent 5 activities
    const recentActivities = learningStats.recentActivity.slice(0, 5);
    recentActivities.forEach(activity => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `
            <span class="activity-time">${activity.time}</span>
            <span class="activity-text">${activity.text}</span>
        `;
        activityList.appendChild(li);
    });
    
    console.log('Stats updated:', learningStats);
}

// Add activity to tracking
function addActivity(text) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    learningStats.recentActivity.unshift({
        time: timeString,
        text: text
    });
    
    // Keep only the most recent 20 activities
    if (learningStats.recentActivity.length > 20) {
        learningStats.recentActivity.pop();
    }
    
    // Update display (which now also saves to localStorage)
    updateStatsDisplay();
}

async function generateRoadmap() {
    try {
        const topicInput = document.getElementById('topicInput');
        const topic = topicInput.value.trim();
        
        if (!topic) {
            showCustomAlert("Please enter a topic first!");
            return;
        }

        showLoading(); // Show loading overlay
        const roadmapElement = document.getElementById("roadmapResult");
        roadmapElement.innerHTML = ''; // Clear previous content

        let response = await fetch('/generate_roadmap', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: topic })
        });

        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

        let data = await response.json();
        
        // Debug: Log received data
        console.log("Received roadmap data:", data);

        if (!data || typeof data !== 'object' || !data.roadmap) {
            throw new Error("Invalid roadmap response structure.");
        }

        let roadmapData = data.roadmap;

        // Ensure the structure is valid
        if (typeof roadmapData === 'string') {
            roadmapData = {
                topic: topic,
                subtopics: [{ topic: "Getting Started", subtopics: [{ topic: roadmapData, subtopics: [] }] }]
            };
        }

        // Validate roadmapData
        if (!roadmapData.topic || !Array.isArray(roadmapData.subtopics)) {
            throw new Error("Malformed roadmap data structure.");
        }

        const treeContainer = document.createElement('div');
        treeContainer.className = 'tree';

        treeContainer.appendChild(createTreeNode(roadmapData));
        roadmapElement.appendChild(treeContainer);
        
        // Track activity
        learningStats.topicsExplored++;
        addActivity(`Generated learning roadmap for "${topic}"`);
        
    } catch (error) {
        console.error("Error generating roadmap:", error);
        document.getElementById("roadmapResult").innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    } finally {
        hideLoading(); // Hide loading overlay
    }
}

// Add animation to tree nodes when they appear
function createTreeNode(node, parentTopics = []) {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'tree-content-wrapper';
    
    const hasChildren = node.subtopics && node.subtopics.length > 0;
    
    // Create toggle button if there are children
    if (hasChildren) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'tree-toggle';
        toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        toggleButton.onclick = function(e) {
            e.stopPropagation(); // Prevent triggering content click
            const childrenContainer = nodeElement.querySelector('.tree-children');
            const isExpanded = childrenContainer.style.display !== 'none';
            
            childrenContainer.style.display = isExpanded ? 'none' : 'block';
            toggleButton.classList.toggle('expanded');
        };
        contentWrapper.appendChild(toggleButton);
    }
    
    // Create content element
    const contentElement = document.createElement('div');
    contentElement.className = 'tree-content';
    contentElement.textContent = node.topic;
    
    // Store the full topic path for backend requests
    const allTopics = [...parentTopics, node.topic];
    const fullTopicPath = allTopics.join(' > ');
    
    contentElement.onclick = function() {
        const topicInput = document.getElementById('selectedTopic');
        // Display only the current topic name in the UI
        topicInput.value = node.topic;
        // Store the full path as a data attribute for backend requests
        topicInput.setAttribute('data-topic-path', JSON.stringify(allTopics));
        
        // Add a subtle animation
        contentElement.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => {
            contentElement.style.animation = '';
        }, 500);
    };
    contentWrapper.appendChild(contentElement);
    
    nodeElement.appendChild(contentWrapper);
    
    // Create children container if there are children
    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        childrenContainer.style.display = 'none'; // Start collapsed
        
        // Create child nodes
        const newParentTopics = [...parentTopics, node.topic];
        node.subtopics.forEach(childNode => {
            childrenContainer.appendChild(createTreeNode(childNode, newParentTopics));
        });
        
        nodeElement.appendChild(childrenContainer);
    }
    
    return nodeElement;
}

async function getExplanation() {
    try {
        const topicInput = document.getElementById('selectedTopic');
        const topic = topicInput.value.trim();
        
        if (!topic) {
            showCustomAlert("Please enter a topic first!");
            return;
        }

        // Get the full topic path from the data attribute if available
        const topicPath = JSON.parse(topicInput.getAttribute('data-topic-path') || '[]');
        const fullTopic = topicPath.length > 0 ? topicPath.join(' > ') : topic;

        showLoading(); // Show loading overlay
        const explanationElement = document.getElementById("explanationResult");
        explanationElement.innerHTML = ''; // Clear previous content

        // Create shimmer loading effect
        const shimmerHTML = `
            <div class="shimmer-container">
                <div class="shimmer-line"></div>
                <div class="shimmer-line short"></div>
                <div class="shimmer-line"></div>
                <div class="shimmer-line short"></div>
                <div class="shimmer-line"></div>
            </div>
        `;
        explanationElement.innerHTML = shimmerHTML;

        let response = await fetch('/get_explanation', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                topic: fullTopic,
                selected_topic: topic,
                topic_path: topicPath
            })
        });

        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

        let data = await response.json();
        
        // Debug: Log received data
        console.log("Received explanation data:", data);

        // Handle different response formats
        let formattedExplanation = '';
        
        if (data.explanation) {
            // New format - direct explanation text
            formattedExplanation = formatText(data.explanation);
        } else if (data.title && data.sections) {
            // Original format - structured with title and sections
            formattedExplanation = formatStructuredExplanation(data);
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error("Invalid explanation response structure.");
        }
        
        explanationElement.innerHTML = formattedExplanation;
        
        // Apply syntax highlighting to code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            Prism.highlightElement(block);
        });
        
        // Add copy buttons to code blocks
        document.querySelectorAll('.code-block').forEach((block, index) => {
            const id = `code-block-${index}`;
            block.id = id;
            
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
            copyButton.onclick = () => copyCode(id);
            
            block.appendChild(copyButton);
        });
        
        // Track activity
        addActivity(`Explored explanation for "${topic}"`);
        
    } catch (error) {
        console.error("Error getting explanation:", error);
        document.getElementById("explanationResult").innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    } finally {
        hideLoading(); // Hide loading overlay
    }
}

// Format structured explanation (original format)
function formatStructuredExplanation(data) {
    let html = `<h2>${escapeHtml(data.title)}</h2>`;
    
    if (Array.isArray(data.sections)) {
        data.sections.forEach((section, sectionIndex) => {
            html += `<div class="explanation-section">`;
            
            if (section.title) {
                html += `<h3>${escapeHtml(section.title)}</h3>`;
            }
            
            // Process all blocks in sequence
            if (Array.isArray(section.blocks)) {
                section.blocks.forEach((block, blockIndex) => {
                    switch (block.type) {
                        case 'text':
                            html += `<p>${formatText(escapeHtml(block.content))}</p>`;
                            break;
                            
                        case 'example':
                            html += `
                                <div class="example-block">
                                    <strong>Example</strong>
                                    <p>${formatText(escapeHtml(block.content))}</p>
                                </div>`;
                            break;
                            
                        case 'code':
                            const codeId = `code-${sectionIndex}-${blockIndex}`;
                            html += `
                                <div class="code-block">
                                    <pre><code id="${codeId}" class="language-${block.language || 'text'}">${escapeHtml(Array.isArray(block.content) ? block.content.join('\n') : block.content)}</code></pre>
                                    <button class="copy-button" onclick="copyCode('${codeId}')">Copy</button>
                                </div>`;
                            break;
                    }
                });
            }
            
            html += `</div>`;
        });
    }
    
    return html;
}

function createQuizQuestion(questionText, type, questionNumber) {
    let html = `
        <div class="quiz-question" id="question-${questionNumber}">
            <p>${questionText}</p>`;
            
    if (type === 'mcq') {
        html += '<div class="mcq-options"></div>';
    } else if (type === 'true_false') {
        html += `
            <label class="true-false-option">
                <input type="radio" name="question-${questionNumber}" value="true"> True
            </label>
            <label class="true-false-option">
                <input type="radio" name="question-${questionNumber}" value="false"> False
            </label>`;
    } else if (type === 'short_answer') {
        html += `<textarea class="short-answer" name="question-${questionNumber}" placeholder="Type your answer here..."></textarea>`;
    }
    
    html += '</div>';
    return html;
}

function cleanText(text) {
    return text.replace(/\r/g, '').trim(); // Remove carriage returns and trim whitespace
}

function addMCQOption(questionNumber, optionText) {
    // Escape HTML to prevent rendering as tags
    const safeOptionText = escapeHtml(cleanText(optionText));
    const option = safeOptionText[0].toLowerCase();
    return `
        <label class="mcq-option">
            <input type="radio" name="question-${questionNumber}" value="${option}">
            ${escapeHtml(safeOptionText)}
        </label>`;
}

function generateQuizHTML(quiz, topic) {
    let html = `
    <form id="quizForm">
        <input type="hidden" id="quizTopic" value="${escapeHtml(topic)}">
        <h2>Quiz for ${escapeHtml(topic)}</h2>
    `;
    
    let questionCount = 0;
    let currentSection = '';
    
    // Process quiz data
    if (Array.isArray(quiz)) {
        // If quiz is already an array of question objects
        html += '<div class="quiz-questions">';
        quiz.forEach((question, index) => {
            questionCount++;
            const questionType = question.type || 'short_answer';
            
            html += `
            <div class="quiz-question" data-type="${questionType}" id="question-${questionCount}">
                <h3>${escapeHtml(question.question)}</h3>
            `;
            
            if (questionType === 'mcq' && Array.isArray(question.options)) {
                html += '<div class="mcq-options">';
                question.options.forEach(option => {
                    html += `<div class="mcq-option">${escapeHtml(option)}</div>`;
                });
                html += '</div>';
            } else if (questionType === 'true_false') {
                html += `
                <div class="true-false-options">
                    <div class="true-false-option">True</div>
                    <div class="true-false-option">False</div>
                </div>
                `;
            } else {
                html += `<textarea class="short-answer" placeholder="Type your answer here..."></textarea>`;
            }
            
            html += '</div>';
        });
        html += '</div>';
    } else if (typeof quiz === 'string') {
        // Legacy format - parse from string
        const lines = quiz.split('\n');
        let inMCQ = false;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            if (trimmedLine.startsWith('**')) {
                const section = trimmedLine.replace(/\*/g, '').trim().toLowerCase();
                
                if (section.includes('instructions')) {
                    html += `<div class="quiz-instructions">${escapeHtml(trimmedLine.replace(/\*/g, ''))}</div>`;
                } else if (section.includes('multiple choice')) {
                    currentSection = 'mcq';
                    html += '<div class="quiz-section"><h3>Multiple Choice Questions</h3>';
                } else if (section.includes('true/false')) {
                    currentSection = 'true_false';
                    html += '<div class="quiz-section"><h3>True/False Questions</h3>';
                } else if (section.includes('short answer')) {
                    currentSection = 'short_answer';
                    html += '<div class="quiz-section"><h3>Short Answer Questions</h3>';
                }
                continue;
            }
            
            if (trimmedLine.match(/^\d+\.\s+/)) {
                if (inMCQ) {
                    html += '</div></div>';
                    inMCQ = false;
                }
                
                questionCount++;
                html += `<div class="quiz-question" data-type="${currentSection}" id="question-${questionCount}">`;
                html += `<h3>${escapeHtml(trimmedLine)}</h3>`;
                
                if (currentSection === 'mcq') {
                    html += '<div class="mcq-options">';
                    inMCQ = true;
                } else if (currentSection === 'true_false') {
                    html += `
                    <div class="true-false-options">
                        <div class="true-false-option">True</div>
                        <div class="true-false-option">False</div>
                    </div>
                    </div>`;
                } else if (currentSection === 'short_answer') {
                    html += `<textarea class="short-answer" placeholder="Type your answer here..."></textarea></div>`;
                }
            } else if (currentSection === 'mcq' && trimmedLine.match(/^[a-d]\)/i)) {
                html += `<div class="mcq-option">${escapeHtml(trimmedLine)}</div>`;
            }
        }
        
        if (inMCQ) {
            html += '</div></div>';
        }
    } else {
        // Unknown format
        html += '<div class="error-message">Invalid quiz format received from server.</div>';
    }
    
    html += `
        <div class="quiz-submission">
            <button type="button" onclick="evaluateQuiz()" class="submit-btn">Submit Quiz</button>
        </div>
    </form>`;
    
    return html;
}

async function generateQuiz() {
    try {
        const topicInput = document.getElementById('selectedTopic');
        const topic = topicInput.value.trim();
        
        if (!topic) {
            showCustomAlert("Please select a topic first!");
            return;
        }

        // Get the full topic path from the data attribute if available
        const topicPath = JSON.parse(topicInput.getAttribute('data-topic-path') || '[]');
        const fullTopic = topicPath.length > 0 ? topicPath.join(' > ') : topic;

        showLoading(); // Show loading overlay
        const quizElement = document.getElementById("quizResult");
        quizElement.innerHTML = ''; // Clear previous content

        // Create shimmer loading effect
        const shimmerHTML = `
            <div class="shimmer-container">
                <div class="shimmer-line"></div>
                <div class="shimmer-line short"></div>
                <div class="shimmer-line"></div>
                <div class="shimmer-line short"></div>
            </div>
        `;
        quizElement.innerHTML = shimmerHTML;

        let response = await fetch('/generate_quiz', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                topic: fullTopic,
                selected_topic: topic,
                topic_path: topicPath
            })
        });

        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

        let data = await response.json();
        
        // Debug: Log received data
        console.log("Received quiz data:", data);

        // Handle different response formats
        if (data.quiz) {
            // Generate quiz HTML
            quizElement.innerHTML = generateQuizHTML(data.quiz, topic);
            
            // Add event listeners for quiz options
            document.querySelectorAll('.mcq-option, .true-false-option').forEach(option => {
                option.addEventListener('click', function() {
                    // Remove selected class from siblings
                    const parent = this.parentElement;
                    parent.querySelectorAll('.mcq-option, .true-false-option').forEach(sib => {
                        sib.classList.remove('selected');
                    });
                    
                    // Add selected class to clicked option
                    this.classList.add('selected');
                });
            });
            
            // Track activity
            addActivity(`Generated quiz for "${topic}"`);
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error("Invalid quiz response structure.");
        }
        
    } catch (error) {
        console.error("Error generating quiz:", error);
        document.getElementById("quizResult").innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    } finally {
        hideLoading(); // Hide loading overlay
    }
}

async function evaluateQuiz() {
    try {
        const quizForm = document.getElementById('quizForm');
        if (!quizForm) {
            showCustomAlert("No quiz to evaluate!");
            return;
        }

        // Get topic from the hidden input in the quiz form
        const quizTopicInput = document.getElementById('quizTopic');
        const displayTopic = quizTopicInput ? quizTopicInput.value.trim() : '';
        
        // Get the full topic path from the selectedTopic input
        const topicInput = document.getElementById('selectedTopic');
        const topicPath = JSON.parse(topicInput.getAttribute('data-topic-path') || '[]');
        const fullTopic = topicPath.length > 0 ? topicPath.join(' > ') : displayTopic;
        
        // Collect answers
        const answers = [];
        const questions = document.querySelectorAll('.quiz-question');
        
        questions.forEach((question, index) => {
            const questionNumber = index + 1;
            const questionType = question.dataset.type;
            const questionText = question.querySelector('h3') ? 
                question.querySelector('h3').textContent : 
                question.querySelector('p') ? 
                    question.querySelector('p').textContent : 
                    `Question ${questionNumber}`;
            
            let answer = '';
            
            if (questionType === 'mcq') {
                const selectedOption = question.querySelector('.mcq-option.selected');
                if (selectedOption) {
                    answer = selectedOption.textContent.trim();
                } else {
                    // Legacy format with radio buttons
                    const selected = question.querySelector('input[type="radio"]:checked');
                    answer = selected ? selected.value : '';
                }
            } else if (questionType === 'true_false') {
                const selectedOption = question.querySelector('.true-false-option.selected');
                if (selectedOption) {
                    answer = selectedOption.textContent.trim();
                } else {
                    // Legacy format with radio buttons
                    const selected = question.querySelector('input[type="radio"]:checked');
                    answer = selected ? selected.value : '';
                }
            } else if (questionType === 'short_answer') {
                answer = question.querySelector('textarea').value.trim();
            }
            
            answers.push({
                question: questionText,
                answer: answer,
                type: questionType || 'short_answer'
            });
        });
        
        // Check if any answers are empty
        if (answers.some(a => !a.answer)) {
            showCustomAlert('Please answer all questions before submitting!');
            return;
        }
        
        showLoading(); // Show loading overlay
        
        // Send to server for evaluation
        let response = await fetch('/evaluate_quiz', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                topic: fullTopic,
                selected_topic: displayTopic,
                topic_path: topicPath,
                answers: answers 
            })
        });

        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

        let data = await response.json();
        
        // Debug: Log received data
        console.log("Received evaluation data:", data);

        // Handle different response formats
        if (data.evaluation) {
            // Format and display evaluation
            const evaluationElement = document.getElementById("evaluationResult");
            const evaluationText = typeof data.evaluation === 'string' ? data.evaluation : JSON.stringify(data.evaluation);
            evaluationElement.innerHTML = formatEvaluationResults(evaluationText);
            
            // Update quiz stats with the evaluation text
            updateQuizStats(evaluationText, displayTopic);
            
            // Scroll to evaluation
            evaluationElement.scrollIntoView({ behavior: 'smooth' });
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error("Invalid evaluation response structure.");
        }
        
    } catch (error) {
        console.error("Error evaluating quiz:", error);
        document.getElementById("evaluationResult").innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        hideLoading();
    } finally {
        hideLoading(); // Hide loading overlay
    }
}

function formatEvaluationResults(evaluationText) {
    console.log("Raw evaluation text:", evaluationText);
    
    // First, try to extract the overall score if present
    let scoreHtml = '';
    const scoreMatch = evaluationText.match(/(\d+)\/(\d+)\s*\((\d+(?:\.\d+)?)%\)/);
    if (scoreMatch) {
        const [_, correct, total, percentage] = scoreMatch;
        const percentValue = parseFloat(percentage);
        scoreHtml = `
            <div class="quiz-score-summary">
                <div class="score-circle ${percentValue >= 70 ? 'passing' : 'failing'}">
                    <span class="score-percentage">${percentage}%</span>
                </div>
                <div class="score-details">
                    <span class="score-fraction">${correct}/${total}</span>
                    <span class="score-label">correct answers</span>
                </div>
            </div>
        `;
    }
    
    // Try to split by question numbers (1., 2., etc.)
    const questionRegex = /(\d+\.)\s+(.*?)(?=\d+\.|$)/gs;
    let questions = [];
    let match;
    
    while ((match = questionRegex.exec(evaluationText)) !== null) {
        questions.push({
            number: match[1].trim(),
            content: match[2].trim()
        });
    }
    
    // If we couldn't split by question numbers, try another approach
    if (questions.length === 0) {
        // Split by double newlines, which often separate questions
        const parts = evaluationText.split(/\n\s*\n/).filter(p => p.trim());
        questions = parts.map((part, index) => ({
            number: `${index + 1}.`,
            content: part.trim()
        }));
    }
    
    let html = `
        <div class="quiz-results">
            <h2>Quiz Results</h2>
            ${scoreHtml}
            <div class="evaluation-content">`;
    
    // Process each question
    questions.forEach((question, index) => {
        const questionNumber = question.number.replace('.', '');
        const questionData = parseQuestionData(question.content);
        
        html += `
            <div class="question-block">
                <div class="question-header">
                    <h3>Question ${questionNumber}</h3>
                </div>
                <div class="question-content">
                    <div class="question-text">
                        <strong>Question:</strong>
                        <p>${questionData.question || "No question text available"}</p>
                    </div>
                    <div class="user-answer">
                        <strong>Your Answer:</strong>
                        <p>${questionData.userAnswer || "No answer provided"}</p>
                    </div>
                    <div class="correct-answer">
                        <strong>Correct Answer:</strong>
                        <p>${questionData.correctAnswer || "No correct answer provided"}</p>
                    </div>
                    <div class="feedback">
                        <strong>Feedback:</strong>
                        <p>${questionData.feedback || "No feedback provided"}</p>
                    </div>
                    <div class="result-indicator ${questionData.isCorrect ? 'correct' : 'incorrect'}">
                        ${questionData.isCorrect ? '<i class="fas fa-check"></i> Correct' : '<i class="fas fa-times"></i> Incorrect'}
                    </div>
                </div>
            </div>`;
    });
    
    // If no questions were processed, show the raw evaluation
    if (questions.length === 0) {
        html += `
            <div class="question-block">
                <div class="question-content">
                    <p>${formatText(escapeHtml(evaluationText))}</p>
                </div>
            </div>`;
    }
    
    html += `
            </div>
            <div class="quiz-actions">
                <button type="button" class="retry-btn" onclick="retryQuiz()"><i class="fas fa-redo"></i> Take Another Quiz</button>
            </div>
        </div>`;
    
    return html;
}

// Function to retry quiz with the current topic
function retryQuiz() {
    // Clear previous evaluation results
    document.getElementById("evaluationResult").innerHTML = '';
    
    // Call generateQuiz to create a new quiz
    generateQuiz();
    
    // Scroll to quiz section
    document.getElementById("quizResult").scrollIntoView({ behavior: 'smooth' });
}

// Extract score from evaluation text and update stats
function updateQuizStats(evaluationText, displayTopic) {
    // Try to extract score using different patterns
    let scoreMatch = evaluationText.match(/(\d+)\/(\d+)\s*\((\d+(?:\.\d+)?)%\)/);
    
    if (!scoreMatch) {
        // Try alternative pattern (just percentage)
        scoreMatch = evaluationText.match(/score.*?(\d+)%/i);
        if (scoreMatch) {
            const score = parseInt(scoreMatch[1]);
            if (!isNaN(score)) {
                // Track quiz completion
                learningStats.quizzesCompleted++;
                learningStats.quizScores.push(score);
                addActivity(`Completed quiz on "${displayTopic}" with score ${score}%`);
                
                // Update stats display
                updateStatsDisplay();
                return;
            }
        }
    } else {
        const [_, correct, total, percentage] = scoreMatch;
        const percentValue = parseFloat(percentage);
        if (!isNaN(percentValue)) {
            // Track quiz completion
            learningStats.quizzesCompleted++;
            learningStats.quizScores.push(percentValue);
            addActivity(`Completed quiz on "${displayTopic}" with score ${percentValue}%`);
            
            // Update stats display
            updateStatsDisplay();
            return;
        }
    }
    
    // If we couldn't extract a score but still have evaluation results,
    // increment the quiz count but don't add a score
    learningStats.quizzesCompleted++;
    addActivity(`Completed quiz on "${displayTopic}"`);
    updateStatsDisplay();
}

function parseQuestionData(questionText) {
    const data = {
        question: '',
        userAnswer: '',
        correctAnswer: '',
        feedback: '',
        isCorrect: false
    };
    
    // Log the raw question text for debugging
    console.log("Raw question text:", questionText);
    
    // Check if the text contains the expected markers
    if (!questionText.includes("Your Answer:") || !questionText.includes("Correct Answer:")) {
        // If the format is unexpected, try to extract what we can
        data.question = formatText(escapeHtml(questionText.trim()));
        data.isCorrect = questionText.includes('(Correct)');
        return data;
    }
    
    // Extract question text (everything before "Your Answer:")
    const questionMatch = questionText.match(/(.*?)Your Answer:/s);
    if (questionMatch && questionMatch[1]) {
        data.question = formatText(escapeHtml(questionMatch[1].trim()));
    }
    
    // Extract user's answer
    const userAnswerMatch = questionText.match(/Your Answer:(.*?)Correct Answer:/s);
    if (userAnswerMatch && userAnswerMatch[1]) {
        data.userAnswer = formatText(escapeHtml(userAnswerMatch[1].trim()));
    }
    
    // Extract correct answer
    const correctAnswerMatch = questionText.match(/Correct Answer:(.*?)Feedback:/s);
    if (correctAnswerMatch && correctAnswerMatch[1]) {
        data.correctAnswer = formatText(escapeHtml(correctAnswerMatch[1].trim()));
    } else {
        // If there's no Feedback section, get everything after "Correct Answer:"
        const altCorrectAnswerMatch = questionText.match(/Correct Answer:(.*?)(?:\(Correct\)|\(Incorrect\)|$)/s);
        if (altCorrectAnswerMatch && altCorrectAnswerMatch[1]) {
            data.correctAnswer = formatText(escapeHtml(altCorrectAnswerMatch[1].trim()));
        }
    }
    
    // Extract feedback
    const feedbackMatch = questionText.match(/Feedback:(.*?)(?=\n\n|$)/s);
    if (feedbackMatch && feedbackMatch[1]) {
        data.feedback = formatText(escapeHtml(feedbackMatch[1].trim()));
    }
    
    // Determine if the answer was correct
    data.isCorrect = questionText.includes('(Correct)');
    
    return data;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatText(text) {
    if (!text) return '';
    
    // First, handle code blocks with language specification
    text = text.replace(/```(\w+)\n([\s\S]*?)```/g, function(match, language, code) {
        return `<div class="code-block"><pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre></div>`;
    });
    
    // Then handle code blocks without language specification
    text = text.replace(/```([\s\S]*?)```/g, function(match, code) {
        return `<div class="code-block"><pre><code class="language-text">${escapeHtml(code.trim())}</code></pre></div>`;
    });
    
    // Handle inline code
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Handle bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>');
    
    // Handle italic text
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle links
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Handle headers
    text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Handle lists
    text = text.replace(/^\s*- (.*?)$/gm, '<li>$1</li>');
    text = text.replace(/^\s*\d+\. (.*?)$/gm, '<li>$1</li>');
    
    // Wrap lists in ul/ol tags
    text = text.replace(/<li>(.*?)<\/li>(\s*<li>.*?<\/li>)*/g, '<ul>$&</ul>');
    
    // Handle paragraphs - split by double newlines and wrap in p tags
    // But skip if the content already has HTML tags
    const paragraphs = text.split(/\n\s*\n/);
    text = paragraphs.map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<') && !p.startsWith('<li>')) return p;
        return `<p>${p}</p>`;
    }).join('\n');
    
    // Handle examples (special formatting for text that looks like examples)
    text = text.replace(/<p>Example:?(.*?)<\/p>/gi, '<div class="example-block"><strong>Example</strong><p>$1</p></div>');
    
    return text;
}

async function copyCode(elementId) {
    const codeBlock = document.getElementById(elementId);
    if (!codeBlock) return;
    
    const codeElement = codeBlock.querySelector('code');
    if (!codeElement) return;
    
    try {
        await navigator.clipboard.writeText(codeElement.textContent);
        
        // Show copied animation
        const copyButton = codeBlock.querySelector('.copy-button');
        copyButton.classList.add('copied');
        copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        setTimeout(() => {
            copyButton.classList.remove('copied');
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy code: ', err);
    }
}
