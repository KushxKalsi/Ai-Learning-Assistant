from crewai import Agent, Task, Crew

class AiTutor:
    """Class to manage AI development Crew Agents and Tasks."""

    def __init__(self):
        # Roadmap Generator Agent
        self.roadmap_agent = Agent(
            name="Roadmap Generator",
            role="Creates a structured roadmap for the given topic.",
            goal="Generate an organized roadmap with topics and subtopics.",
            backstory="Expert AI teacher skilled in curriculum planning.",
            allow_delegation=True
        )

        # Content Explainer Agent
        self.explainer_agent = Agent(
            name="Content Explainer",
            role="Explains topics when selected by the user.",
            goal="Provide clear explanations with examples.",
            backstory="A subject matter expert who explains concepts in an easy-to-understand way.",
            allow_delegation=True
        )

        # Quiz Generator Agent
        self.quiz_agent = Agent(
            name="Quiz Generator",
            role="Creates quizzes based on the explanation provided.",
            goal="Generate multiple-choice questions, true/false, and short answer quizzes.",
            backstory="An AI specializing in educational assessments.",
            allow_delegation=True
        )

        # Evaluator Agent
        self.evaluator_agent = Agent(
            name="Evaluator",
            role="Evaluates user quiz responses based on the generated content and provides feedback.",
            goal="Analyze user responses, score the quiz, and give feedback.",
            backstory="A digital tutor who tracks student progress.",
            allow_delegation=False
        )

        # Tasks for Each Agent
        self.roadmap_task = Task(
            description="Generate a roadmap with topics and subtopics for {topic}.",
            expected_output="Generate a deep detailed roadmap for the topic in JSON format with each and every subtopic and even suptopics of subtopics an be given if there . The JSON should have the main topic as the root and subtopics as key-value pairs. Each subtopic can further have nested subtopics. and each topic and subtopic should be a meaningful word in itself as they will be used further as a heading so each topic and subtopic must be according to being a good heading",
            agent=self.roadmap_agent
        )

        self.explanation_task = Task(
            description=(
                "Provide an explanation for the topic: {selected_topic}. "
                "This topic is part of the following learning path: {context}. "
                "Your explanation MUST be specific to this context and hierarchy. "
                "For example, if explaining 'Variables' in 'Python → Fundamentals', "
                "focus specifically on Python variables, not variables in general."
            ),
            expected_output="A detailed explanation with examples that are specific to the topic's context in the learning path.",
            agent=self.explainer_agent
        )

        self.quiz_task = Task(
            description=(
                "Create a quiz based on the explanation of {selected_topic}. "
                "Use the following explanation content to generate relevant questions: {explanation_content}"
            ),
            expected_output="A quiz with different question types but not with the answers",
            agent=self.quiz_agent
        )

        self.evaluation_task = Task(
            description=(
                "Evaluate the user's quiz responses based on the provided explanation `{generated_content}` "
                "and the generated quiz `{generated_quiz}`. Score the quiz and provide feedback based on `{user_answers}`."
            ),
            expected_output="A report with scores, correct answers, and areas for improvement.",
            agent=self.evaluator_agent
        )

        # Individual Crews for Each Function
        self.roadmap_crew = Crew(agents=[self.roadmap_agent], tasks=[self.roadmap_task])
        self.explanation_crew = Crew(agents=[self.explainer_agent], tasks=[self.explanation_task])
        self.quiz_crew = Crew(agents=[self.quiz_agent], tasks=[self.quiz_task])
        self.evaluation_crew = Crew(agents=[self.evaluator_agent], tasks=[self.evaluation_task])

    def generate_roadmap(self, topic):
        """Generate a roadmap for the given topic."""
        results = self.roadmap_crew.kickoff(inputs={"topic": topic})
        return results if results else "No roadmap generated."

    def explain_topic(self, topic_info):
        """Provide an explanation for a selected topic with its context."""
        if isinstance(topic_info, dict):
            results = self.explanation_crew.kickoff(inputs=topic_info)
        else:
            # Fallback for string input
            results = self.explanation_crew.kickoff(inputs={
                "selected_topic": str(topic_info),
                "context": str(topic_info)
            })
        return results if results else "No explanation generated."

    def generate_quiz(self, selected_topic):
        """Create a quiz based on the selected topic explanation."""
        results = self.quiz_crew.kickoff(inputs={"selected_topic": selected_topic})
        return results if results else "No quiz generated."

    def generate_quiz_from_explanation(self, selected_topic, explanation_content):
        """Create a quiz based on the selected topic and its explanation."""
        results = self.quiz_crew.kickoff(inputs={
            "selected_topic": selected_topic,
            "explanation_content": explanation_content
        })
        return results if results else "No quiz generated."

    def evaluate_quiz_responses(self, explanation_result, quiz_result, user_answers, format_instructions=None):
        """Evaluate the quiz responses using the generated content, quiz, and user answers."""
        explanation_result = str(explanation_result) if explanation_result else "No explanation provided."
        quiz_result = str(quiz_result) if quiz_result else "No quiz available."
        
        evaluation_inputs = {
            "generated_content": explanation_result,
            "generated_quiz": quiz_result,
            "user_answers": user_answers
        }
        
        if format_instructions:
            evaluation_inputs["format_instructions"] = format_instructions
            
            # Update the task description to include format instructions
            self.evaluation_task.description = (
                "Evaluate the user's quiz responses based on the provided explanation `{generated_content}` "
                "and the generated quiz `{generated_quiz}`. Score the quiz and provide feedback based on `{user_answers}`.\n"
                "Follow these formatting instructions: {format_instructions}"
            )
        
        results = self.evaluation_crew.kickoff(inputs=evaluation_inputs)

        return results if results else "No evaluation generated."

