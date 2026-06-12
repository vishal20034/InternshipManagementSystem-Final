import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TestResult from "@/models/new/TestResult";

const domainQuestions: Record<string, Array<{ question: string; options: string[]; answer: number }>> = {
  "MERN Stack Development": [
    { question: "Which of the following is correct about Node.js event loop?", options: ["It is multi-threaded and runs requests in parallel", "It is single-threaded and handles async I/O non-blockingly", "It runs on the client-side inside Web browsers", "It is used to design relational database schemas"], answer: 1 },
    { question: "In React, what hook is used to perform side effects?", options: ["useState", "useContext", "useEffect", "useMemo"], answer: 2 },
    { question: "Which index type is default in MongoDB for _id?", options: ["Hashed Index", "Compound Index", "Single Field Index", "Text Index"], answer: 2 },
    { question: "What is the purpose of Express middleware?", options: ["To render JSX on the client side", "To connect the application directly to hardware layers", "To execute code between receiving the request and sending the response", "To compile CSS styles into CSS-in-JS"], answer: 2 },
    { question: "What does MERN stand for?", options: ["MySQL, Express, React, Node", "MongoDB, Express, React, Node", "MongoDB, Ember, React, Nest", "MariaDB, Express, Redux, Next"], answer: 1 }
  ],
  "Web Development": [
    { question: "Which HTML5 tag is used to embed self-contained flow content like images, diagrams, or code?", options: ["<aside>", "<section>", "<figure>", "<details>"], answer: 2 },
    { question: "What does CSS 'flex-direction: column-reverse' do?", options: ["Aligns items horizontally from right to left", "Stacks items vertically from bottom to top", "Aligns items horizontally from left to right", "Stacks items vertically from top to bottom"], answer: 1 },
    { question: "Which JavaScript function schedules a function to run once after a set number of milliseconds?", options: ["setInterval", "setTimeout", "requestAnimationFrame", "setImmediate"], answer: 1 },
    { question: "What is the difference between '==' and '===' in JavaScript?", options: ["No difference, they are identical", "'==' compares both value and type, while '===' compares only value", "'==' compares only value (with type coercion), while '===' compares both value and type", "'===' is used only for object comparisons"], answer: 2 },
    { question: "What is the purpose of the Document Object Model (DOM) in web browsers?", options: ["To define the network protocols for web pages", "To represent the structure of a document as a tree of objects", "To store browser session data locally", "To encrypt HTTP request payloads"], answer: 1 }
  ],
  "DevOps with AWS": [
    { question: "Which AWS service provides resizable compute capacity in the cloud?", options: ["Amazon S3", "Amazon RDS", "Amazon EC2", "AWS Lambda"], answer: 2 },
    { question: "What does CI/CD stand for in DevOps practices?", options: ["Continuous Integration & Continuous Delivery/Deployment", "Code Integration & Component Delivery", "Cloud Infrastructure & Cyber Defense", "Continuous Improvement & Code Distribution"], answer: 0 },
    { question: "In Docker, what is a Container?", options: ["A virtual machine running a full hypervisor", "An isolated, lightweight execution environment running an image", "A physical rack server in an AWS data center", "A directory containing code and configuration files"], answer: 1 },
    { question: "What AWS service is used to manage user access and permissions securely?", options: ["Amazon IAM", "AWS Shield", "Amazon VPC", "AWS CloudTrail"], answer: 0 },
    { question: "Which tool is commonly used for Infrastructure as Code (IaC)?", options: ["Kubernetes", "Docker", "Terraform", "Jenkins"], answer: 2 }
  ],
  "Python Development": [
    { question: "What is the key difference between a Python list and a tuple?", options: ["Lists are immutable, tuples are mutable", "Lists are mutable, tuples are immutable", "Lists can hold mixed data types, tuples cannot", "Lists are faster to iterate over than tuples"], answer: 1 },
    { question: "How do you define a single-line anonymous function in Python?", options: ["def anonymous():", "lambda x: ...", "inline function:", "anonymous x -> ..."], answer: 1 },
    { question: "What does the '__init__' method do in Python classes?", options: ["It destroys the object instance", "It acts as a constructor, initializing the object state", "It imports standard modules into the class scope", "It converts the class instance to a string"], answer: 1 },
    { question: "Which Python block handles exception catching?", options: ["catch / throw", "try / except", "try / catch", "except / throw"], answer: 1 },
    { question: "What is the standard style guide for Python code formatting?", options: ["PEP 8", "PEP 20", "PEP 257", "PEP 484"], answer: 0 }
  ],
  "Java Development": [
    { question: "Which area of JVM memory holds class definitions and static variables?", options: ["Heap Memory", "Stack Memory", "Metaspace / Method Area", "PC Register"], answer: 2 },
    { question: "What is the default value of a boolean variable in a Java class?", options: ["true", "false", "null", "undefined"], answer: 1 },
    { question: "In Java, how do you prevent a class from being inherited?", options: ["Use final modifier on the class definition", "Make the constructor private", "Use abstract modifier on the class", "Implement the Serializable interface"], answer: 0 },
    { question: "Which of these interfaces is part of the Java Collections Framework?", options: ["List", "Map", "Set", "All of the above"], answer: 3 },
    { question: "What is Garbage Collection in Java?", options: ["A process that deletes unused source code files", "An automatic memory management process that frees dereferenced objects", "A syntax validator tool built into Java compiler", "A method to terminate running threads"], answer: 1 }
  ]
};

const defaultQuestions = [
  { question: "What is the primary key concept of object-oriented programming?", options: ["Encapsulation, Inheritance, Polymorphism, Abstraction", "Compilation, Interpretation, Transpilation", "Iteration, Recursion, Backtracking", "Synchronous execution, blocking loops"], answer: 0 },
  { question: "What is the time complexity of searching in a balanced binary search tree?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1 },
  { question: "What is version control useful for?", options: ["Compiling backend builds", "Tracking edits and collaboration on code history", "Creating visual vector icons", "Deploying DNS server configurations"], answer: 1 },
  { question: "Which HTTP status code represents 'Internal Server Error'?", options: ["200", "400", "404", "500"], answer: 3 },
  { question: "Which data structure operates on a Last-In, First-Out (LIFO) model?", options: ["Queue", "Stack", "Linked List", "Tree"], answer: 1 }
];

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { employeeId, studentName, domain, answers } = body;

    if (!employeeId || !domain || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    let questions = domainQuestions[domain];
    if (!questions) {
      const matchingKey = Object.keys(domainQuestions).find(key => 
        key.toLowerCase().includes(domain.toLowerCase()) || 
        domain.toLowerCase().includes(key.toLowerCase())
      );
      questions = matchingKey ? domainQuestions[matchingKey] : defaultQuestions;
    }

    let score = 0;
    const totalQuestions = questions.length;

    questions.forEach((q, idx) => {
      if (answers[idx] !== undefined && answers[idx] === q.answer) {
        score++;
      }
    });

    const percentage = Math.round((score / totalQuestions) * 100);

    // Persist result in Database
    await TestResult.findOneAndUpdate(
      { employeeId, domain },
      {
        studentName,
        score,
        totalQuestions,
        percentage,
        completedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      score,
      totalQuestions,
      percentage
    });
  } catch (error: any) {
    console.error("[SUBMIT TEST ERROR] Error:", error);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}