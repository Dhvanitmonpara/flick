import { QuestionAnswerType, RoundType } from "@/types/InterviewData";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable
const apiKey = import.meta.env.VITE_GEMINI_KEY;
if (!apiKey) {
  throw new Error(
    "API key is missing. Please set VITE_GEMINI_KEY in your environment."
  );
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export type candidateDetailsType = {
  yearsOfExperience: number;
  candidateName: string | null;
  jobRole: string;
  skills: string[];
};

export type candidateAnswerDetailType = {
  round: RoundType;
  timeLimit: number;
  previousAnswer: string;
  college: string;
  achievements: string;
  currentJobRole: string | null;
  higherEducation: string;
} & candidateDetailsType;

const getBasePromptForNextQuestion = ({
  yearsOfExperience,
  candidateName,
  jobRole,
  skills,
  round,
  timeLimit,
  previousAnswer,
  college,
  currentJobRole,
  achievements,
  higherEducation,
}: candidateAnswerDetailType) => {
  return `
You are an AI-powered interviewer conducting a professional coding and technical interview. Use the details and instructions below to generate a tailored interview question that strictly adheres to the specified time limit and difficulty.

**Candidate Details:
- **Name**: ${candidateName}
- **Years of Experience**: ${yearsOfExperience}
- **Job Role**: ${jobRole}
- **Skills**: ${skills.toString()}
- **Current Round**: ${round} (e.g., Screening, Technical, System Design, Behavioral)
- **Time Limit**: ${timeLimit} seconds
- **Previous Answer**: ${previousAnswer} (if any)
- **College**: ${college}
${currentJobRole && `- **Current Job Role**: ${currentJobRole}`}
- **Achievements**: ${achievements}
- **Higher Education**: ${higherEducation}

**Instructions:**
1. **Time Limit Enforcement:**  
   - Ensure the generated question is designed to be solved within the provided **time limit**. Avoid questions that could lead to solutions exceeding this duration.

2. **Experience Level:**
   - If \`${yearsOfExperience} < 2\`: Ask a **beginner-friendly** question.
   - If \`${yearsOfExperience}\` is between 2 and 5: Ask an **intermediate-level** question.
   - If \`${yearsOfExperience} > 5\`: Ask an **advanced** or **architectural** question.

3. **Interview Round Specifics:**
   - **Technical (Coding)**: Pose a pure coding problem in one of Java, JavaScript, C++ or Python on based on the candidate's skills. but note that currently only Java, JavaScript, React, C++ and Python are supported. *(Time Limit: 3 minutes)*
   - **Aptitude**: Pose an aptitude question. *(Time Limit: 1 minute)*
   - **System Design**: Pose a question focusing on architecture, scalability, and best practices. *(Time Limit: 3 minutes)*
   - **Behavioral**: Pose a situational or STAR-based question. *(Time Limit: 1 minute)*

4. **Question Generation Logic:**
   - If this is the candidate's **first question**, generate a new question based solely on the candidate's details.
   - If a **previous answer** exists, analyze it and generate a relevant follow-up question.

5. **Clarity, Structure, and Relevance:**
   - Ensure the question is clear, concise, and structured.
   - Do not include any extraneous text or instructions beyond the question itself.

**Example Questions:**
- "Can you explain the difference between React state and props with an example?"
- "How would you design a REST API for a social media platform? What database structure would you use?"
- "What are the trade-offs between using LSTMs vs. Transformers for NLP tasks?"
- "Design a scalable URL shortener like Bitly. What technologies and database choices would you use?"

Generate the appropriate interview question based on these instructions. And don't generate extra text except the question.
  `;
};

const getBasePromptForQuestionFeedback = (
  candidateDetails: candidateDetailsType,
  questionAnswerSets: QuestionAnswerType[]
) => {
  return `
You are an expert interview feedback generator. You are provided with a candidate's detailed profile and a series of interview question sets along with the candidate's answers. Your task is to analyze the candidate's responses and generate actionable, constructive feedback.

Input Data Structure:
- Candidate Details: ${JSON.stringify(candidateDetails)}
- Question Sets: ${JSON.stringify(questionAnswerSets)}

Output Requirements:
- Return a JSON array of objects.
- Each object must have exactly three keys:
  - "feedback": A concise, constructive analysis of the candidate’s answer.
  - "score": A number between 0 and 10 evaluating the answer based on performance, experience, job role, and skills.
  - "correctAnswer": A brief, plain text version of the correct answer or code snippet if applicable.
- Do NOT include any markdown formatting (such as triple backticks) or additional symbols in any field. The "correctAnswer" field must be plain text (or plain code as a string) so that the entire output is valid JSON.
- Do not include any extra text or formatting outside of the JSON output.

Example Output (valid JSON):

[
  {
    "feedback": "The candidate did not provide an answer for the question about using setInterval to increment a counter in a React component. This indicates a lack of understanding of basic React concepts and timers. The candidate should practice implementing state updates using setInterval within a React component.",
    "score": 2,
    "correctAnswer": "import React, { useState, useEffect } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  useEffect(() => {\n    const intervalId = setInterval(() => {\n      setCount(prevCount => prevCount + 1);\n    }, 1000);\n\n    return () => clearInterval(intervalId);\n  }, []);\n\n  return <h1>{count}</h1>;\n}\n\nexport default Counter;"
  },
  {
    "feedback": "The candidate did not provide an answer regarding learning a new technology. This reveals a gap in showcasing adaptability and problem-solving skills. The candidate should prepare examples of past experiences demonstrating their ability to quickly learn and apply new technologies.",
    "score": 1,
    "correctAnswer": "A good approach involves identifying core concepts, using online resources such as documentation and tutorials, building small projects to practice, and seeking help from communities or colleagues. It is important to focus on understanding underlying principles rather than just memorizing syntax."
  },
  {
    "feedback": "The candidate provided no answer on how to initialize the counter to 10. This indicates a fundamental gap in understanding React state initialization. The candidate should review how to set initial state values using useState.",
    "score": 2,
    "correctAnswer": "import React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(10);\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}\n\nexport default Counter;"
  },
  {
    "feedback": "The candidate did not provide an answer regarding file organization in a MERN stack application. This suggests a lack of experience in structuring projects for maintainability and scalability. The candidate needs to learn common folder structures and their respective roles in a MERN application.",
    "score": 1,
    "correctAnswer": "A typical MERN stack structure includes a 'client' folder for the React frontend (with components, pages, services, and utils), a 'server' folder for the Node.js/Express backend (with models, controllers, routes, and middleware), a 'config' folder for configuration files, a 'utils' folder for utility functions, and a 'public' folder for static assets."
  }
]

Ensure that your output is exactly in this JSON format, with no extra text, spaces, or markdown formatting, so that it can be parsed correctly with JSON.parse.
  `;
};

export async function generateNextQuestion(
  candidateDetails: candidateAnswerDetailType
): Promise<string | null> {
  try {
    const basePrompt = getBasePromptForNextQuestion(candidateDetails);
    const result = await model.generateContent(basePrompt);
    const text = result.response.text();
    return text;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("429") || error.message.includes("403"))
    ) {
      console.error("API Quota Exceeded or API Key Expired:", error.message);
    } else {
      console.error("Error generating content:", error);
    }
    return null;
  }
}

export async function generateFeedback(
  candidateDetails: candidateDetailsType,
  questionAnswerSets: QuestionAnswerType[]
): Promise<string | null> {
  try {
    const basePrompt = getBasePromptForQuestionFeedback(
      candidateDetails,
      questionAnswerSets
    );
    const result = await model.generateContent(basePrompt);
    const text = result.response.text();
    console.log("feedback:", text);
    return text;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("429") || error.message.includes("403"))
    ) {
      console.error("API Quota Exceeded or API Key Expired:", error.message);
    } else {
      console.error("Error generating content:", error);
    }
    return null;
  }
}
