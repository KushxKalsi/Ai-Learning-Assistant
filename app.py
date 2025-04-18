from flask import Flask, request, jsonify, render_template, session
from crew import AiTutor
import json 

app = Flask(__name__)
app.secret_key = 'secret_key'
ai_dev = AiTutor()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_roadmap', methods=['POST'])
def generate_roadmap():
    try:
        data = request.json
        topic = data.get('topic')
        if not topic:
            return jsonify({
                'roadmap': {
                    'topic': 'Error',
                    'subtopics': [{'topic': 'No topic provided', 'subtopics': []}]
                }
            })

        # Get roadmap from AI
        roadmap = ai_dev.generate_roadmap(topic)
        print(f"Raw AI response for topic '{topic}': {roadmap}")  # Debug log
        
        roadmap_str = str(roadmap)

        try:
            direct_json = json.loads(roadmap_str)
            structured_roadmap = {
                'topic': topic,
                'subtopics': convert_to_tree(direct_json)
            }
            return jsonify({'roadmap': structured_roadmap})
        except json.JSONDecodeError:
            print("Direct JSON parsing failed, trying to extract from code blocks...")

        # Extract JSON from code blocks
        if '```' in roadmap_str:
            parts = roadmap_str.split('```')
            for i in range(1, len(parts), 2):
                clean_str = parts[i].replace('json', '', 1).strip()
                try:
                    roadmap_data = json.loads(clean_str)

                    def convert_to_tree(data):
                        if isinstance(data, dict):
                            result = []
                            for key, value in data.items():
                                node = {'topic': key, 'subtopics': []}
                                if isinstance(value, (dict, list, str)):
                                    node['subtopics'] = convert_to_tree(value)
                                result.append(node)
                            return result
                        elif isinstance(data, list):
                            return [{'topic': item, 'subtopics': []} for item in data]
                        elif isinstance(data, str):
                            return [{'topic': data, 'subtopics': []}]
                        return []

                    first_key = list(roadmap_data.keys())[0] if isinstance(roadmap_data, dict) else topic
                    structured_roadmap = {
                        'topic': first_key,
                        'subtopics': convert_to_tree(roadmap_data.get(first_key, roadmap_data))
                    }
                    
                    return jsonify({'roadmap': structured_roadmap})
                except json.JSONDecodeError:
                    continue
        
        # Default structure if no JSON found
        lines = [line.strip() for line in roadmap_str.split('\n') if line.strip()]
        simple_structure = {
            'topic': topic,
            'subtopics': [{'topic': line, 'subtopics': []} for line in lines if not line.startswith('```')]
        }
        return jsonify({'roadmap': simple_structure})
            
    except Exception as e:
        print(f"Unexpected error in generate_roadmap: {str(e)}")  # Debug log
        return jsonify({
            'roadmap': {
                'topic': topic if topic else 'Error',
                'subtopics': [{'topic': f'An error occurred: {str(e)}', 'subtopics': []}]
            }
        })

@app.route('/get_explanation', methods=['POST'])
def get_explanation():
    try:
        data = request.json
        selected_topic = data.get('selected_topic')
        topic_path = data.get('topic_path', [])
        
        # Create a context-aware topic string
        context = " → ".join(topic_path) if topic_path else selected_topic
        
        print(f"Explaining topic: '{selected_topic}'")  # Debug log
        print(f"With context path: '{context}'")   # Debug log
        
        # Pass both selected_topic and context to the AI
        explanation = ai_dev.explain_topic({
            "selected_topic": selected_topic,
            "context": context
        })
        explanation_str = str(explanation)

        # Format the explanation with proper structure
        formatted_explanation = {
            'title': selected_topic,
            'sections': []
        }

        current_section = {'title': 'Overview', 'blocks': []}
        lines = explanation_str.split('\n')
        
        inside_code_block = False
        code_block_content = []
        code_block_language = ""

        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Handle headers
            if line.startswith('#'):
                if current_section['blocks']:
                    formatted_explanation['sections'].append(current_section.copy())
                current_section = {'title': line.lstrip('#').strip(), 'blocks': []}

            # Handle code blocks
            elif line.startswith('```'):
                if inside_code_block:
                    # End of code block
                    current_section['blocks'].append({
                        'type': 'code',
                        'language': code_block_language,
                        'content': code_block_content
                    })
                    inside_code_block = False
                    code_block_content = []
                else:
                    # Start of code block
                    inside_code_block = True
                    code_block_language = line.replace('```', '').strip() or "plaintext"
                    code_block_content = []
            
            elif inside_code_block:
                code_block_content.append(line)

            # Handle examples (Example: keyword appears)
            elif line.lower().startswith('example:'):
                current_section['blocks'].append({
                    'type': 'example',
                    'content': line[8:].strip()
                })

            # Regular content
            else:
                current_section['blocks'].append({
                    'type': 'text',
                    'content': line
                })

        # Add last section if it has content
        if current_section['blocks']:
            formatted_explanation['sections'].append(current_section.copy())

        # If no sections were created, add all content to the Overview section
        if not formatted_explanation['sections']:
            formatted_explanation['sections'].append({
                'title': 'Overview',
                'blocks': [{'type': 'text', 'content': line.strip()} 
                          for line in explanation_str.split('\n') 
                          if line.strip()]
            })

        return jsonify(formatted_explanation)

    except Exception as e:
        print(f"Error processing explanation: {str(e)}")
        return jsonify({'error': str(e)})

@app.route('/generate_quiz', methods=['POST'])
def generate_quiz():
    try:
        data = request.json
        topic = data.get('selected_topic')
        explanation_content = data.get('explanation_content', '')
        
        # Store the explanation in the session for later use in evaluation
        session['current_explanation'] = explanation_content
        
        # Pass both topic and explanation_content to the AI
        quiz = ai_dev.generate_quiz_from_explanation(topic, explanation_content)
        
        # Store the quiz in the session for later use in evaluation
        session['current_quiz'] = str(quiz)
        
        return jsonify({'quiz': str(quiz)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/evaluate_quiz', methods=['POST'])
def evaluate_quiz():
    try:
        data = request.json
        answers = data.get('answers', [])
        
        # Get stored quiz and explanation
        current_quiz = session.get('current_quiz', '')
        current_explanation = session.get('current_explanation', '')
        
        # Format answers for evaluation
        formatted_answers = []
        for answer in answers:
            formatted_answers.append(f"Question: {answer['question']}\nAnswer: {answer['answer']}")
        user_answers_str = "\n\n".join(formatted_answers)
        
        # Format instructions for consistent evaluation output
        format_instructions = """
        Please format your evaluation as follows:
        
        For each question:
        1. Start with the question number (e.g., "1.")
        2. Include the original question text
        3. Include "Your Answer: [user's answer]"
        4. Include "Correct Answer: [correct answer]"
        5. Include "Feedback: [your feedback]"
        6. Indicate if the answer was correct with "(Correct)" or "(Incorrect)"
        7. Separate each question with a blank line
        
        At the end, include a summary with the total score (e.g., "3/5 (60%)") and any areas for improvement.
        """
        
        # Get evaluation from AI
        result = ai_dev.evaluate_quiz_responses(
            explanation_result=current_explanation,
            quiz_result=current_quiz,
            user_answers=user_answers_str,
            format_instructions=format_instructions
        )
        
        return jsonify({'evaluation': str(result)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
