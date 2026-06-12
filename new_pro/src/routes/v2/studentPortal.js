// NEW FEATURE: Student Portal V2 API Routes
"use strict";

const express      = require("express");
const router       = express.Router();
const Student      = require("../../../models/Student");

const mongoose = require("mongoose");
if (!Student.schema.path("v2Onboarded"))           Student.schema.add({ v2Onboarded:           { type: Boolean, default: false } });
if (!Student.schema.path("v2DurationType"))        Student.schema.add({ v2DurationType:        { type: String,  default: null  } });
if (!Student.schema.path("onboardingPopupSeen"))   Student.schema.add({ onboardingPopupSeen:   { type: Boolean, default: false } });
if (!Student.schema.path("joinerTypeSelected"))    Student.schema.add({ joinerTypeSelected:    { type: Boolean, default: false } });
if (!Student.schema.path("joinerType"))            Student.schema.add({ joinerType:            { type: String,  default: null  } });

const StudentTaskProgress = require("../../../models/new/StudentTaskProgress");
const DomainTask   = require("../../../models/new/DomainTask");
const taskEngine   = require("../../../services/v2/taskEngine");
const coinService  = require("../../../services/v2/coinService");

// FEATURE 7 — Fallback video map (domain → week → YouTube URL)
const FALLBACK_VIDEOS = {
    "Python Development": {
        1: "https://www.youtube.com/watch?v=rfscVS0vtbw",
        2: "https://www.youtube.com/watch?v=t8pPdKYpowI",
        3: "https://www.youtube.com/watch?v=HGOBQPFzWKo",
        4: "https://www.youtube.com/watch?v=kqtD5dpn9C8"
    },
    "Web Development": {
        1: "https://www.youtube.com/watch?v=mU6anWqZJcc",
        2: "https://www.youtube.com/watch?v=G3e-cpL7ofc",
        3: "https://www.youtube.com/watch?v=Oe421EPjeBE",
        4: "https://www.youtube.com/watch?v=EerdGm-ehJQ"
    },
    "MERN Stack Development": {
        1: "https://www.youtube.com/watch?v=7CqJlxBYj-M",
        2: "https://www.youtube.com/watch?v=mrHNSanmqQ4",
        3: "https://www.youtube.com/watch?v=98BzS5Oz5E4",
        4: "https://www.youtube.com/watch?v=Oe421EPjeBE"
    },
    "Java Development": {
        1: "https://www.youtube.com/watch?v=eIrMbAQSU34",
        2: "https://www.youtube.com/watch?v=GoXwIVyNvX0",
        3: "https://www.youtube.com/watch?v=grEKMHGYyns",
        4: "https://www.youtube.com/watch?v=UmnCZ7-9yDY"
    },
    "DevOps with AWS": {
        1: "https://www.youtube.com/watch?v=9psmcSEWGGU",
        2: "https://www.youtube.com/watch?v=k1RI5locZE4",
        3: "https://www.youtube.com/watch?v=RLTfFyVe6u4",
        4: "https://www.youtube.com/watch?v=XrX5GFt468s"
    },
    "Artificial Intelligence": {
        1: "https://www.youtube.com/watch?v=a0_lo_GDcFw",
        2: "https://www.youtube.com/watch?v=JMUxmLyrhSk",
        3: "https://www.youtube.com/watch?v=GwIo3gDZCVQ",
        4: "https://www.youtube.com/watch?v=I74ymkoNTnw"
    },
    "Data Science": {
        1: "https://www.youtube.com/watch?v=ua-CiDNNj30",
        2: "https://www.youtube.com/watch?v=vmEHCJofslg",
        3: "https://www.youtube.com/watch?v=GPVsHOlRBBI",
        4: "https://www.youtube.com/watch?v=7eh4d6sabA0"
    },
    "Cyber Security": {
        1: "https://www.youtube.com/watch?v=inWWhr5tnEA",
        2: "https://www.youtube.com/watch?v=qiQR5rTSshw",
        3: "https://www.youtube.com/watch?v=3Kq1MIfTWCE",
        4: "https://www.youtube.com/watch?v=Dk-ZqQ-bfy4"
    },
    "Software Engineering": {
        1: "https://www.youtube.com/watch?v=O753uuutqH8",
        2: "https://www.youtube.com/watch?v=FkHjG759ab8",
        3: "https://www.youtube.com/watch?v=I6jB0nM9SKU",
        4: "https://www.youtube.com/watch?v=WpkDN78P884"
    },
    "Flutter Development": {
        1: "https://www.youtube.com/watch?v=1ukSR1GRtMU",
        2: "https://www.youtube.com/watch?v=C-fKAzdTrLU",
        3: "https://www.youtube.com/watch?v=x0uinJvhNxI",
        4: "https://www.youtube.com/watch?v=IfUjHNODRoM"
    },
    "HR Management": {
        1: "https://www.youtube.com/watch?v=XcFABjHIxtI",
        2: "https://www.youtube.com/watch?v=9wMDVSzMqoU",
        3: "https://www.youtube.com/watch?v=TDH0zHKtHOU",
        4: "https://www.youtube.com/watch?v=kN7g0cjyNFE"
    },
    "Venture Capital": {
        1: "https://www.youtube.com/watch?v=TpTt6LMSACs",
        2: "https://www.youtube.com/watch?v=GvZ03MEzH5Q",
        3: "https://www.youtube.com/watch?v=i94LMpDkjO4",
        4: "https://www.youtube.com/watch?v=xF_UiVFq2dU"
    },
    "Vibe Coding": {
        1: "https://www.youtube.com/watch?v=gd1lqiPNxWI",
        2: "https://www.youtube.com/watch?v=Oe421EPjeBE",
        3: "https://www.youtube.com/watch?v=G3e-cpL7ofc",
        4: "https://www.youtube.com/watch?v=EerdGm-ehJQ"
    },
    "Space Research": {
        1: "https://www.youtube.com/watch?v=lizvFTYXX3E",
        2: "https://www.youtube.com/watch?v=vkgZHMSbIAs",
        3: "https://www.youtube.com/watch?v=StwE0jj3bD4",
        4: "https://www.youtube.com/watch?v=N_c9pD1BdLU"
    },
    "Business Analyst": {
        1: "https://www.youtube.com/watch?v=yalIhONmXaY",
        2: "https://www.youtube.com/watch?v=s3euyoMZP1E",
        3: "https://www.youtube.com/watch?v=obhBuH3XCUQ",
        4: "https://www.youtube.com/watch?v=ZC3xT8W7Rbk"
    },
    "HR": {
        1: "https://www.youtube.com/watch?v=XcFABjHIxtI",
        2: "https://www.youtube.com/watch?v=9wMDVSzMqoU",
        3: "https://www.youtube.com/watch?v=TDH0zHKtHOU",
        4: "https://www.youtube.com/watch?v=kN7g0cjyNFE"
    }
};

// FEATURE 2 — Auth middleware using x-employee-id or token
async function requireStudent(req, res, next) {
    try {
        const employeeId = req.headers["x-employee-id"] || req.body.employeeId || req.query.employeeId;
        if (!employeeId) return res.status(401).json({ success: false, message: "Authentication required" });
        const student = await Student.findOne({ employeeId: String(employeeId) });
        if (!student) return res.status(401).json({ success: false, message: "Student not found" });
        req.student = student;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: "Auth error" });
    }
}

// ────────────────────────────────────────────────
// FEATURE 2 — GET /api/v2/student/me
// Validates the student session (used for auto-login)
// ────────────────────────────────────────────────
router.get("/student/me", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const { totalCoins, rupeeValue } = await coinService.getBalance(student._id);
        const me = student;
        // Compute internship end date same as login route
        let meEndDate = null;
        if (me.joiningDate) {
            const jd = new Date(me.joiningDate);
            if (!isNaN(jd.getTime())) {
                const t = String(me.tenure || "").toLowerCase();
                const days = t.includes("6") ? 180 : t.includes("3") ? 90 : 30;
                const end = new Date(jd); end.setDate(end.getDate() + days);
                meEndDate = end.toISOString();
            }
        }
        res.json({
            success: true,
            student: {
                name:               `${me.firstName || ""} ${me.lastName || ""}`.trim(),
                firstName:          me.firstName,
                lastName:           me.lastName,
                email:              me.email || "",
                phone:              me.whatsapp || me.phone || "",
                college:            me.collegeName || me.college || "",
                collegeName:        me.collegeName || me.college || "",
                employeeId:         me.employeeId,
                domain:             me.domain,
                tenure:             me.tenure,
                joiningDate:        me.joiningDate,
                internshipEnd:      meEndDate,
                endDate:            meEndDate,
                linkedDomains:      me.linkedDomains || [],
                onboardingPopupSeen: me.onboardingPopupSeen || false,
                joinerTypeSelected:  me.joinerTypeSelected  || false,
                joinerType:          me.joinerType           || null
            },
            totalCoins,
            rupeeValue
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// FEATURE 1 — POST /api/v2/student/mark-onboarding-seen
// Marks onboarding popup as seen — never shows again
// ────────────────────────────────────────────────
router.post("/student/mark-onboarding-seen", requireStudent, async (req, res) => {
    try {
        await Student.updateOne(
            { _id: req.student._id },
            { $set: { onboardingPopupSeen: true } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// FEATURE 1 — POST /api/v2/student/set-joiner-type
// Saves joiner type selection — never shows again
// ────────────────────────────────────────────────
router.post("/student/set-joiner-type", requireStudent, async (req, res) => {
    try {
        const { joinerType } = req.body;
        if (!["new", "whatsapp"].includes(joinerType)) {
            return res.status(400).json({ success: false, message: "Invalid joiner type" });
        }
        await Student.updateOne(
            { _id: req.student._id },
            { $set: { joinerTypeSelected: true, joinerType } }
        );
        res.json({ success: true, joinerType });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// FEATURE 7 — POST /api/v2/student/report-broken-video
// Auto-replaces broken YouTube video with fallback
// ────────────────────────────────────────────────
router.post("/student/report-broken-video", requireStudent, async (req, res) => {
    try {
        const { taskId, domain, weekNumber, taskTitle } = req.body;
        if (!taskId) return res.status(400).json({ success: false, message: "taskId required" });

        const week = parseInt(weekNumber) || 1;
        const domainFallbacks = FALLBACK_VIDEOS[domain] || {};
        const fallbackUrl = domainFallbacks[week];

        if (fallbackUrl) {
            await DomainTask.updateOne(
                { _id: taskId },
                { $set: { videoUrl: fallbackUrl, fallbackVideoUrl: fallbackUrl } }
            );
            return res.json({ success: true, newVideoUrl: fallbackUrl, replaced: true });
        }

        // No fallback in map — return YouTube search link
        const searchQuery = encodeURIComponent(`${domain || ""} ${taskTitle || "tutorial"} tutorial`);
        const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
        return res.json({ success: true, searchUrl, replaced: false });
    } catch (err) {
        console.error("[V2] report-broken-video error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// FEATURE 6 — POST /api/v2/student/generate-quiz
// Returns 5 MCQ questions for domain+week (with fallback bank)
// ────────────────────────────────────────────────
const QUIZ_FALLBACK_BANK = {
    "Python Development": {
        1: [
            { question: "Which of the following is the correct way to declare a variable in Python?", options: ["var x = 5", "x = 5", "int x = 5", "declare x = 5"], answer: 1 },
            { question: "What is the output of print(type(3.14))?", options: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'number'>"], answer: 2 },
            { question: "Which keyword is used to define a function in Python?", options: ["function", "define", "def", "func"], answer: 2 },
            { question: "What does len('hello') return?", options: ["4", "5", "6", "hello"], answer: 1 },
            { question: "Which of these is a valid Python comment?", options: ["// comment", "/* comment */", "# comment", "-- comment"], answer: 2 }
        ],
        2: [
            { question: "Which data structure in Python is immutable?", options: ["List", "Dictionary", "Set", "Tuple"], answer: 3 },
            { question: "What does the range(1, 5) produce?", options: ["1,2,3,4,5", "1,2,3,4", "0,1,2,3,4", "1,2,3,4,5,6"], answer: 1 },
            { question: "How do you open a file in Python?", options: ["openfile('x')", "file.open('x')", "open('x', 'r')", "read('x')"], answer: 2 },
            { question: "What is a lambda function in Python?", options: ["A loop", "An anonymous function", "A class method", "A module"], answer: 1 },
            { question: "Which method adds an element to a list?", options: ["add()", "insert()", "append()", "push()"], answer: 2 }
        ],
        3: [
            { question: "What does OOP stand for?", options: ["Object Oriented Programming", "Open Output Process", "Ordered Object Protocol", "Online Object Platform"], answer: 0 },
            { question: "Which keyword creates a class in Python?", options: ["object", "class", "struct", "define"], answer: 1 },
            { question: "What is inheritance in Python?", options: ["Copying a file", "One class using methods of another", "Deleting an object", "Creating a loop"], answer: 1 },
            { question: "What does __init__ do?", options: ["Deletes an object", "Initialises an object", "Returns a value", "Imports a module"], answer: 1 },
            { question: "Which Python library is used for data manipulation?", options: ["NumPy", "Pandas", "Matplotlib", "Flask"], answer: 1 }
        ]
    },
    "Web Development": {
        1: [
            { question: "What does HTML stand for?", options: ["HyperText Markup Language", "HighTech Markup Language", "HyperText Machine Language", "HyperText Making Language"], answer: 0 },
            { question: "Which tag creates a hyperlink?", options: ["<link>", "<a>", "<href>", "<url>"], answer: 1 },
            { question: "What does CSS stand for?", options: ["Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"], answer: 2 },
            { question: "Which property changes text color in CSS?", options: ["font-color", "text-color", "color", "foreground"], answer: 2 },
            { question: "What is the correct HTML element for the largest heading?", options: ["<h6>", "<head>", "<heading>", "<h1>"], answer: 3 }
        ],
        2: [
            { question: "Which JavaScript function is used to print to console?", options: ["print()", "console.log()", "log()", "output()"], answer: 1 },
            { question: "What does DOM stand for?", options: ["Document Object Model", "Data Object Model", "Document Oriented Model", "Dynamic Object Model"], answer: 0 },
            { question: "Which CSS property controls the layout type?", options: ["layout", "display", "position", "float"], answer: 1 },
            { question: "What does === mean in JavaScript?", options: ["Assignment", "Equality (loose)", "Equality (strict)", "Not equal"], answer: 2 },
            { question: "Which HTML tag embeds JavaScript?", options: ["<js>", "<script>", "<javascript>", "<code>"], answer: 1 }
        ],
        3: [
            { question: "What is a REST API?", options: ["A database", "An architectural style for APIs", "A programming language", "A web browser"], answer: 1 },
            { question: "What does async/await do in JavaScript?", options: ["Creates loops", "Handles asynchronous operations", "Deletes variables", "Imports modules"], answer: 1 },
            { question: "Which method sends data to a server in fetch?", options: ["GET only", "POST", "SEND", "TRANSFER"], answer: 1 },
            { question: "What is Flexbox used for?", options: ["Database queries", "Animations", "Layout alignment", "Server requests"], answer: 2 },
            { question: "Which framework is built on top of React?", options: ["Angular", "Vue", "Next.js", "Ember"], answer: 2 }
        ]
    },
    "MERN Stack Development": {
        1: [
            { question: "What does MERN stand for?", options: ["MongoDB, Express, React, Node", "MySQL, Express, React, Node", "MongoDB, Electron, React, Node", "MongoDB, Express, Ruby, Node"], answer: 0 },
            { question: "Which language does Node.js use?", options: ["Python", "Java", "JavaScript", "C#"], answer: 2 },
            { question: "What is npm?", options: ["Node Package Manager", "New Programming Method", "Node Project Manager", "Network Protocol Module"], answer: 0 },
            { question: "What is MongoDB?", options: ["A SQL database", "A NoSQL document database", "A cloud service", "A programming language"], answer: 1 },
            { question: "What does Express.js provide?", options: ["A database", "A UI framework", "A web application framework for Node", "A testing tool"], answer: 2 }
        ],
        2: [
            { question: "Which React hook manages state?", options: ["useEffect", "useContext", "useState", "useRef"], answer: 2 },
            { question: "What is JSX?", options: ["A database query language", "JavaScript XML syntax for React", "A CSS framework", "A Node module"], answer: 1 },
            { question: "What does useEffect do in React?", options: ["Manages state", "Creates components", "Handles side effects", "Styles components"], answer: 2 },
            { question: "Which HTTP method retrieves data?", options: ["POST", "PUT", "DELETE", "GET"], answer: 3 },
            { question: "What is a Mongoose schema?", options: ["A CSS layout", "A MongoDB document structure", "A React component", "An Express route"], answer: 1 }
        ],
        3: [
            { question: "What is JWT used for?", options: ["Database queries", "Authentication tokens", "CSS animations", "File uploads"], answer: 1 },
            { question: "Which middleware parses JSON in Express?", options: ["express.json()", "express.parse()", "bodyParser.text()", "express.raw()"], answer: 0 },
            { question: "What is React Context used for?", options: ["Database connections", "Global state management", "HTTP requests", "File handling"], answer: 1 },
            { question: "Which Mongoose method finds all documents?", options: ["findAll()", "getAll()", "find()", "select()"], answer: 2 },
            { question: "What is CORS in web development?", options: ["A database", "Cross-Origin Resource Sharing", "A React hook", "A MongoDB feature"], answer: 1 }
        ]
    },
    "Java Development": {
        1: [
            { question: "Which keyword is used to create a class in Java?", options: ["object", "class", "struct", "type"], answer: 1 },
            { question: "What is JVM?", options: ["Java Visual Machine", "Java Virtual Machine", "Java Variable Method", "Java Version Manager"], answer: 1 },
            { question: "Which data type stores true/false in Java?", options: ["int", "char", "String", "boolean"], answer: 3 },
            { question: "How do you print in Java?", options: ["print()", "console.log()", "System.out.println()", "echo()"], answer: 2 },
            { question: "What does OOP stand for?", options: ["Object Oriented Programming", "Open Output Process", "Online Object Protocol", "Ordered Object Platform"], answer: 0 }
        ],
        2: [
            { question: "What is inheritance in Java?", options: ["Copying a file", "A class using properties of another", "Creating a loop", "Deleting an object"], answer: 1 },
            { question: "Which keyword prevents method overriding?", options: ["static", "private", "final", "abstract"], answer: 2 },
            { question: "What is an interface in Java?", options: ["A class with no methods", "A contract of methods a class must implement", "A database", "A loop structure"], answer: 1 },
            { question: "What does ArrayList store?", options: ["Fixed size arrays", "Dynamic list of objects", "Only integers", "Only strings"], answer: 1 },
            { question: "What is a constructor?", options: ["A method that destroys objects", "A special method to initialise objects", "A loop", "An interface"], answer: 1 }
        ],
        3: [
            { question: "What is a try-catch block used for?", options: ["Loops", "Exception handling", "Creating classes", "Database queries"], answer: 1 },
            { question: "What does the 'static' keyword mean?", options: ["The variable changes", "Belongs to the class, not instances", "Creates a new object", "Is abstract"], answer: 1 },
            { question: "Which collection allows duplicate values?", options: ["Set", "HashSet", "TreeSet", "ArrayList"], answer: 3 },
            { question: "What is polymorphism?", options: ["One interface, many implementations", "Multiple inheritance", "A design pattern", "A database concept"], answer: 0 },
            { question: "What is multithreading in Java?", options: ["Multiple loops", "Running multiple threads simultaneously", "Multiple classes", "Database transactions"], answer: 1 }
        ]
    },
    "DevOps with AWS": {
        1: [
            { question: "What does DevOps stand for?", options: ["Development and Operations", "Device Operations", "Developer Options", "Dynamic Operations"], answer: 0 },
            { question: "What is CI/CD?", options: ["Continuous Integration/Continuous Deployment", "Cloud Infrastructure/Cloud Deployment", "Code Integration/Code Deployment", "Container Integration/Container Delivery"], answer: 0 },
            { question: "What is Docker used for?", options: ["Version control", "Containerization of applications", "Network monitoring", "Database management"], answer: 1 },
            { question: "What is AWS EC2?", options: ["A database service", "A virtual server service", "A storage service", "A DNS service"], answer: 1 },
            { question: "What is Git?", options: ["A programming language", "A version control system", "A cloud service", "A testing tool"], answer: 1 }
        ],
        2: [
            { question: "What is Kubernetes used for?", options: ["Writing code", "Container orchestration", "Database management", "UI design"], answer: 1 },
            { question: "What is an S3 bucket in AWS?", options: ["A server", "Object storage service", "A database", "A networking tool"], answer: 1 },
            { question: "What does IaC stand for?", options: ["Infrastructure as Code", "Integration and Continuity", "Internet as Cloud", "Instance and Container"], answer: 0 },
            { question: "What is Jenkins used for?", options: ["UI development", "CI/CD automation", "Database queries", "Cloud storage"], answer: 1 },
            { question: "What is an AWS Lambda function?", options: ["A serverless compute function", "A database query", "A networking protocol", "A storage bucket"], answer: 0 }
        ],
        3: [
            { question: "What is Terraform used for?", options: ["Testing", "Infrastructure provisioning as code", "UI design", "Database management"], answer: 1 },
            { question: "What is a VPC in AWS?", options: ["Virtual Private Cloud", "Virtual Public Container", "Virtual Processor Core", "Very Private Computer"], answer: 0 },
            { question: "What is the purpose of Ansible?", options: ["UI framework", "Configuration management and automation", "Database admin", "Version control"], answer: 1 },
            { question: "What is blue-green deployment?", options: ["A CSS color scheme", "A deployment strategy with zero downtime", "A Docker feature", "An AWS storage class"], answer: 1 },
            { question: "What does EKS stand for in AWS?", options: ["Elastic Kubernetes Service", "Elastic Key Store", "Elastic Kernel System", "Extended Kubernetes Service"], answer: 0 }
        ]
    },
    "Artificial Intelligence": {
        1: [
            { question: "What is Machine Learning?", options: ["Programming computers explicitly", "Systems that learn from data", "Manual data entry", "A type of database"], answer: 1 },
            { question: "What is a neural network?", options: ["A computer network", "A model inspired by the human brain", "A database", "An internet protocol"], answer: 1 },
            { question: "What does NLP stand for?", options: ["Network Layer Protocol", "Natural Language Processing", "Neural Learning Program", "Node Learning Platform"], answer: 1 },
            { question: "What is supervised learning?", options: ["Learning without labels", "Learning from labelled data", "Learning from rewards", "Unsupervised training"], answer: 1 },
            { question: "What is overfitting in ML?", options: ["Model performs well on test data", "Model memorizes training data, poor on new data", "Model has too few parameters", "Model trains too quickly"], answer: 1 }
        ],
        2: [
            { question: "What is a training dataset used for?", options: ["Testing the model", "Teaching the model", "Deploying the model", "Cleaning data"], answer: 1 },
            { question: "What does CNN stand for?", options: ["Computer Neural Network", "Convolutional Neural Network", "Contextual Network Node", "Central Neural Node"], answer: 1 },
            { question: "What is the purpose of activation functions?", options: ["Load data", "Introduce non-linearity", "Store weights", "Reduce parameters"], answer: 1 },
            { question: "What is gradient descent?", options: ["A data storage method", "An optimization algorithm", "A type of neural network", "A dataset format"], answer: 1 },
            { question: "What is transfer learning?", options: ["Sending files between servers", "Using a pre-trained model for a new task", "Training from scratch", "Copying neural networks"], answer: 1 }
        ],
        3: [
            { question: "What is a transformer model?", options: ["An electrical component", "An attention-based deep learning architecture", "A decision tree", "A clustering algorithm"], answer: 1 },
            { question: "What does GAN stand for?", options: ["Generative Adversarial Network", "General Artificial Node", "Global AI Network", "Generative Analysis Node"], answer: 0 },
            { question: "What is reinforcement learning?", options: ["Learning from labelled data", "Learning through rewards and penalties", "Learning from images", "Supervised classification"], answer: 1 },
            { question: "What is precision in ML classification?", options: ["True positives / total positives predicted", "All correct predictions / total", "True negatives / negatives predicted", "Recall score"], answer: 0 },
            { question: "What is feature engineering?", options: ["Designing hardware features", "Creating input variables for ML models", "Setting model hyperparameters", "Deploying models"], answer: 1 }
        ]
    },
    "Data Science": {
        1: [
            { question: "What is the primary language used in Data Science?", options: ["Java", "C++", "Python", "PHP"], answer: 2 },
            { question: "What does EDA stand for?", options: ["Exploratory Data Analysis", "Extended Data Access", "External Data Algorithm", "Effective Data Aggregation"], answer: 0 },
            { question: "Which Python library is used for data visualisation?", options: ["NumPy", "Pandas", "Matplotlib", "Scikit-learn"], answer: 2 },
            { question: "What is a DataFrame in Pandas?", options: ["A list", "A 2D tabular data structure", "A dictionary", "A database"], answer: 1 },
            { question: "What does mean() calculate?", options: ["Most common value", "Middle value", "Average value", "Maximum value"], answer: 2 }
        ],
        2: [
            { question: "What is a correlation coefficient?", options: ["The sum of values", "A measure of relationship between variables", "The count of values", "A data cleaning step"], answer: 1 },
            { question: "What is missing data imputation?", options: ["Deleting rows", "Filling missing values", "Adding new columns", "Sorting data"], answer: 1 },
            { question: "What is a histogram used for?", options: ["Comparing categories", "Showing distribution of data", "Tracking trends over time", "Showing relationships"], answer: 1 },
            { question: "What is feature scaling?", options: ["Increasing dataset size", "Normalizing feature ranges", "Removing features", "Adding features"], answer: 1 },
            { question: "What does train-test split mean?", options: ["Splitting code files", "Dividing data for training and evaluation", "Creating databases", "Cleaning data"], answer: 1 }
        ],
        3: [
            { question: "What is a decision tree?", options: ["A data structure", "A tree-based ML algorithm for classification/regression", "A database query", "A sorting algorithm"], answer: 1 },
            { question: "What is cross-validation?", options: ["Checking code", "Technique to evaluate model performance on unseen data", "Data cleaning", "Feature selection"], answer: 1 },
            { question: "What is SQL used for in data science?", options: ["Machine learning", "Querying and managing databases", "Data visualisation", "Model deployment"], answer: 1 },
            { question: "What is dimensionality reduction?", options: ["Adding more features", "Reducing number of variables while preserving information", "Increasing dataset size", "Normalizing data"], answer: 1 },
            { question: "What is the purpose of a confusion matrix?", options: ["Data cleaning", "Evaluating classification model performance", "Feature engineering", "Data imputation"], answer: 1 }
        ]
    },
    "Cyber Security": {
        1: [
            { question: "What is a firewall?", options: ["A physical wall", "A network security system", "An operating system", "A programming language"], answer: 1 },
            { question: "What does SSL/TLS provide?", options: ["Faster internet", "Encrypted communication", "Data storage", "User authentication"], answer: 1 },
            { question: "What is phishing?", options: ["A sport", "A social engineering attack to steal credentials", "A firewall rule", "A type of malware"], answer: 1 },
            { question: "What is a VPN used for?", options: ["Speeding up internet", "Secure, encrypted connection over internet", "Virus protection", "Data backup"], answer: 1 },
            { question: "What is SQL Injection?", options: ["A database backup", "An attack that manipulates SQL queries", "A SQL command", "A database type"], answer: 1 }
        ],
        2: [
            { question: "What is penetration testing?", options: ["Speed testing", "Authorised simulated cyberattack to find vulnerabilities", "Network monitoring", "Code review"], answer: 1 },
            { question: "What is a zero-day exploit?", options: ["A bug fixed immediately", "An unknown vulnerability with no patch", "A scheduled attack", "A daily security check"], answer: 1 },
            { question: "What does XSS stand for?", options: ["Extended Security System", "Cross-Site Scripting", "External Security Scanner", "Cross-System Security"], answer: 1 },
            { question: "What is multi-factor authentication?", options: ["Using only a password", "Using multiple verification methods", "Storing passwords", "Bypassing login"], answer: 1 },
            { question: "What is a DDoS attack?", options: ["A malware", "Distributed Denial of Service attack", "A phishing attack", "A SQL attack"], answer: 1 }
        ],
        3: [
            { question: "What is ethical hacking?", options: ["Illegal system access", "Authorised testing of security systems", "Creating malware", "Monitoring networks"], answer: 1 },
            { question: "What is encryption?", options: ["Deleting data", "Converting data to unreadable format", "Backing up data", "Compressing data"], answer: 1 },
            { question: "What is a digital certificate?", options: ["An academic certificate", "A document verifying the identity of a website", "A password", "A security camera"], answer: 1 },
            { question: "What is network forensics?", options: ["Building networks", "Capturing and analysing network traffic for investigation", "Network design", "Speed testing"], answer: 1 },
            { question: "What is a honeypot in cybersecurity?", options: ["A food storage", "A decoy system to attract and detect attackers", "A firewall rule", "An encryption key"], answer: 1 }
        ]
    },
    "Software Engineering": {
        1: [
            { question: "What is SDLC?", options: ["Software Design Language Cycle", "Software Development Life Cycle", "System Development Language Code", "Software Deployment Language Cycle"], answer: 1 },
            { question: "What is Agile methodology?", options: ["A waterfall process", "Iterative, flexible software development", "A programming language", "A testing framework"], answer: 1 },
            { question: "What is version control?", options: ["Database versioning", "Tracking and managing code changes", "User interface updates", "Hardware upgrades"], answer: 1 },
            { question: "What is a software requirement?", options: ["Hardware spec", "Description of what the software must do", "A code library", "A testing checklist"], answer: 1 },
            { question: "What does API stand for?", options: ["Application Programming Interface", "Automated Program Input", "Advanced Programming Integration", "Application Process Interface"], answer: 0 }
        ],
        2: [
            { question: "What is unit testing?", options: ["Testing the whole system", "Testing individual functions or modules", "Performance testing", "Security testing"], answer: 1 },
            { question: "What is refactoring?", options: ["Rewriting from scratch", "Restructuring code without changing behaviour", "Deleting old code", "Adding new features"], answer: 1 },
            { question: "What is a design pattern?", options: ["A UI design", "A reusable solution to common software problems", "A database schema", "A network topology"], answer: 1 },
            { question: "What is continuous integration?", options: ["Merging code changes frequently", "Continuous monitoring", "Continuous testing only", "Continuous deployment only"], answer: 0 },
            { question: "What does MVC stand for?", options: ["Multiple View Controller", "Model View Controller", "Module View Component", "Model Variable Class"], answer: 1 }
        ],
        3: [
            { question: "What is technical debt?", options: ["Money owed for software", "Cost of not fixing suboptimal code now", "Hardware costs", "Team salary"], answer: 1 },
            { question: "What is a microservices architecture?", options: ["One large application", "Small, independently deployable services", "A database type", "A UI pattern"], answer: 1 },
            { question: "What is test-driven development (TDD)?", options: ["Writing tests after code", "Writing tests before code", "Skipping tests", "Automated deployment"], answer: 1 },
            { question: "What is a code review?", options: ["Reviewing requirements", "Examining code for quality and issues", "Customer review", "Performance testing"], answer: 1 },
            { question: "What is scalability?", options: ["Code readability", "System's ability to handle growing load", "Database size", "Team size"], answer: 1 }
        ]
    },
    "Flutter Development": {
        1: [
            { question: "What language does Flutter use?", options: ["Java", "Swift", "Dart", "JavaScript"], answer: 2 },
            { question: "What is a Widget in Flutter?", options: ["A database", "The basic building block of Flutter UI", "A server", "A test framework"], answer: 1 },
            { question: "What does StatelessWidget mean?", options: ["Has mutable state", "No mutable state", "Connects to internet", "Has animations"], answer: 1 },
            { question: "What is Flutter used for?", options: ["Backend only", "Cross-platform mobile app development", "Database management", "Web servers only"], answer: 1 },
            { question: "What is pubspec.yaml?", options: ["A Dart file", "Flutter project configuration and dependencies", "A database file", "An asset folder"], answer: 1 }
        ],
        2: [
            { question: "What is setState() used for?", options: ["Fetching data", "Triggering UI rebuild with new state", "Creating widgets", "Routing pages"], answer: 1 },
            { question: "What is a FutureBuilder in Flutter?", options: ["A layout widget", "A widget that builds based on async operations", "A navigation tool", "A state manager"], answer: 1 },
            { question: "Which widget creates a scrollable list?", options: ["Container", "Column", "ListView", "Stack"], answer: 2 },
            { question: "What is Navigator in Flutter?", options: ["A GPS tool", "The routing/navigation system", "A database connector", "A state manager"], answer: 1 },
            { question: "What is Provider used for?", options: ["Network requests", "State management", "Database queries", "Animations"], answer: 1 }
        ],
        3: [
            { question: "What is Bloc pattern in Flutter?", options: ["A UI widget", "Business Logic Component for state management", "A database", "A navigation pattern"], answer: 1 },
            { question: "What does hot reload do in Flutter?", options: ["Restarts the app", "Updates UI without losing state", "Clears the database", "Rebuilds from scratch"], answer: 1 },
            { question: "What is a Stream in Flutter?", options: ["Video streaming", "Async sequence of data", "A list widget", "A navigation tool"], answer: 1 },
            { question: "Which widget is used for HTTP requests in Flutter?", options: ["FutureBuilder with http package", "ListView", "Column", "Stack"], answer: 0 },
            { question: "What is the purpose of keys in Flutter widgets?", options: ["Accessing APIs", "Uniquely identifying widgets and preserving state", "Styling widgets", "Creating animations"], answer: 1 }
        ]
    }
};

// Generic fallback questions for domains not in the bank
function getGenericQuestions(domain, week) {
    return [
        { question: `What is the primary goal of ${domain}?`, options: ["Code writing", "Problem solving through technology", "Database management", "Network design"], answer: 1 },
        { question: `Which skill is most important in ${domain}?`, options: ["Typing speed", "Analytical thinking", "Memorization", "Physical strength"], answer: 1 },
        { question: "What is version control?", options: ["Controlling app versions", "Tracking and managing code changes", "Hardware versioning", "Database backups"], answer: 1 },
        { question: "What does debugging mean?", options: ["Adding features", "Finding and fixing errors in code", "Writing documentation", "Deploying apps"], answer: 1 },
        { question: "What is an algorithm?", options: ["A computer program", "A step-by-step procedure to solve a problem", "A hardware component", "A database"], answer: 1 }
    ];
}

router.post("/student/generate-quiz", requireStudent, async (req, res) => {
    try {
        const { taskId, domain, weekNumber } = req.body;
        const week = parseInt(weekNumber) || 1;

        // Try to get domain-specific questions
        const domainBank = QUIZ_FALLBACK_BANK[domain] || {};
        const weekQuestions = domainBank[week] || domainBank[1] || getGenericQuestions(domain, week);

        // Pick 5 questions
        const questions = weekQuestions.slice(0, 5);

        res.json({
            success: true,
            questions,
            quizSettings: {
                questionCount: 5,
                durationMinutes: 10,
                passScore: 3
            }
        });
    } catch (err) {
        console.error("[V2] generate-quiz error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/student/onboard
// ────────────────────────────────────────────────
router.post("/student/onboard", requireStudent, async (req, res) => {
    try {
        const { durationType } = req.body;
        const student = req.student;

        const validDurations = ["45days", "1month", "3months", "6months"];
        if (!validDurations.includes(durationType)) {
            return res.status(400).json({ success: false, message: "Invalid duration type" });
        }

        await Student.updateOne(
            { _id: student._id },
            { $set: { v2Onboarded: true, v2DurationType: durationType } }
        );
        student.v2Onboarded    = true;
        student.v2DurationType = durationType;

        const result = await taskEngine.assignTasksForStudent(student);
        const coinResult = await coinService.awardCoins(student._id, "ONBOARD_BONUS");

        res.json({
            success: true,
            message: "Onboarding complete",
            tasksAssigned: result.total || 0,
            coinsAwarded:  coinResult.awarded,
            totalCoins:    coinResult.totalCoins
        });
    } catch (err) {
        console.error("[V2] onboard error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/student/status
// ────────────────────────────────────────────────
router.get("/student/status", requireStudent, async (req, res) => {
    try {
        const student = req.student;

        const [progressStats, sampleProgress, coinData] = await Promise.all([
            StudentTaskProgress.aggregate([
                { $match: { studentId: student._id } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            StudentTaskProgress.findOne({ studentId: student._id }).populate("taskId", "durationType").lean(),
            coinService.getBalance(student._id)
        ]);

        const v2Onboarded  = !!sampleProgress;
        const durationType = (sampleProgress?.taskId?.durationType) || taskEngine.tenureToDurationType(student.tenure);

        const stats = {};
        for (const s of progressStats) stats[s._id] = s.count;

        res.json({
            success:       true,
            v2Onboarded,
            domain:        student.domain,
            durationType,
            totalCoins:    coinData.totalCoins,
            rupeeValue:    coinData.rupeeValue || (coinData.totalCoins * 0.5).toFixed(2),
            onboardingPopupSeen: student.onboardingPopupSeen || false,
            joinerTypeSelected:  student.joinerTypeSelected  || false,
            joinerType:          student.joinerType           || null,
            taskStats: {
                locked:      stats.locked      || 0,
                available:   stats.available   || 0,
                in_progress: stats.in_progress || 0,
                submitted:   stats.submitted   || 0,
                approved:    stats.approved    || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/tasks/my-tasks
// ────────────────────────────────────────────────
router.get("/tasks/my-tasks", requireStudent, async (req, res) => {
    try {
        const student = req.student;

        if (!student.v2Onboarded) {
            await taskEngine.assignTasksForStudent(student);
        }

        const data = await taskEngine.getStudentTasks(student);
        const { totalCoins, rupeeValue } = await coinService.getBalance(student._id);

        res.json({ success: true, ...data, totalCoins, rupeeValue });
    } catch (err) {
        console.error("[V2] my-tasks error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:taskId/start
// ────────────────────────────────────────────────
router.post("/tasks/:taskId/start", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const taskId  = req.params.taskId;

        const progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
        if (!progress) return res.status(404).json({ success: false, message: "Task not assigned" });
        if (!["available"].includes(progress.status)) {
            return res.json({ success: true, status: progress.status });
        }

        progress.status    = "in_progress";
        progress.startedAt = new Date();
        await progress.save();

        res.json({ success: true, status: "in_progress" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:taskId/submit
// ────────────────────────────────────────────────
router.post("/tasks/:taskId/submit", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const taskId  = req.params.taskId;
        const { submissionUrl, submissionNotes } = req.body;

        if (!submissionUrl && !submissionNotes) {
            return res.status(400).json({ success: false, message: "Submission URL or notes required" });
        }

        const progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
        if (!progress) return res.status(404).json({ success: false, message: "Task not assigned to you" });
        if (!["available", "in_progress", "rejected"].includes(progress.status)) {
            return res.status(400).json({ success: false, message: `Cannot submit: task is ${progress.status}` });
        }

        progress.status          = "submitted";
        progress.submissionUrl   = submissionUrl  || progress.submissionUrl;
        progress.submissionNotes = submissionNotes || progress.submissionNotes;
        progress.submittedAt     = new Date();
        if (!progress.startedAt) progress.startedAt = new Date();
        await progress.save();

        res.json({ success: true, message: "Task submitted successfully", status: "submitted" });
    } catch (err) {
        console.error("[V2] submit error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// PATCH /api/v2/tasks/:taskId/video-progress
// ────────────────────────────────────────────────
router.patch("/tasks/:taskId/video-progress", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const taskId  = req.params.taskId;
        const percent = Math.min(100, Math.max(0, parseInt(req.body.percent) || 0));

        const progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
        if (!progress) return res.status(404).json({ success: false, message: "Task not assigned" });

        const wasWatched = progress.videoWatchedPercent >= 90;
        progress.videoWatchedPercent = Math.max(progress.videoWatchedPercent, percent);

        let coinsAwarded = 0;
        if (!wasWatched && progress.videoWatchedPercent >= 90) {
            const result = await coinService.awardCoins(student._id, "VIDEO_WATCHED");
            coinsAwarded = result.awarded;
        }

        await progress.save();
        res.json({ success: true, videoWatchedPercent: progress.videoWatchedPercent, coinsAwarded });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:progressId/approve  (coordinator)
// ────────────────────────────────────────────────
router.post("/tasks/:progressId/approve", async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Coordinator auth required" });
        }

        const { feedback, studentEmployeeId } = req.body;
        if (!studentEmployeeId) return res.status(400).json({ success: false, message: "studentEmployeeId required" });

        const student = await Student.findOne({ employeeId: studentEmployeeId });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const result = await taskEngine.approveTask(student, req.params.progressId, null, feedback);
        if (result.error) return res.status(400).json({ success: false, message: result.error });

        res.json({ success: true, ...result });
    } catch (err) {
        console.error("[V2] approve error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:progressId/reject  (coordinator)
// ────────────────────────────────────────────────
router.post("/tasks/:progressId/reject", async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Coordinator auth required" });
        }

        const { feedback, studentEmployeeId } = req.body;
        if (!studentEmployeeId) return res.status(400).json({ success: false, message: "studentEmployeeId required" });

        const student = await Student.findOne({ employeeId: studentEmployeeId });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const progress = await StudentTaskProgress.findById(req.params.progressId);
        if (!progress) return res.status(404).json({ success: false, message: "Progress not found" });
        if (progress.studentId.toString() !== student._id.toString()) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        progress.status              = "rejected";
        progress.coordinatorFeedback = feedback || "";
        await progress.save();

        res.json({ success: true, message: "Task rejected" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/coordinator/submissions
// ────────────────────────────────────────────────
router.get("/coordinator/submissions", async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Coordinator auth required" });
        }
        const domain = req.query.domain;
        if (!domain) return res.status(400).json({ success: false, message: "domain query param required" });

        const tasks = await DomainTask.find({ domain }).lean();
        const taskIds = tasks.map(t => t._id);
        const taskMap = {};
        for (const t of tasks) taskMap[t._id.toString()] = t;

        const submissions = await StudentTaskProgress.find({
            taskId: { $in: taskIds },
            status: "submitted"
        }).populate("studentId", "firstName lastName employeeId email domain").lean();

        const result = submissions.map(s => ({
            progressId:      s._id,
            studentName:     s.studentId ? `${s.studentId.firstName} ${s.studentId.lastName}`.trim() : "Unknown",
            employeeId:      s.studentId ? s.studentId.employeeId : "",
            studentEmail:    s.studentId ? s.studentId.email : "",
            taskTitle:       taskMap[s.taskId.toString()]?.taskTitle || "Unknown Task",
            weekNumber:      taskMap[s.taskId.toString()]?.weekNumber || 0,
            coinReward:      taskMap[s.taskId.toString()]?.coinReward || 0,
            submissionUrl:   s.submissionUrl,
            submissionNotes: s.submissionNotes,
            submittedAt:     s.submittedAt
        }));

        res.json({ success: true, submissions: result });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/coins/balance
// ────────────────────────────────────────────────
router.get("/coins/balance", requireStudent, async (req, res) => {
    try {
        const data = await coinService.getBalance(req.student._id);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/coins/history
// ────────────────────────────────────────────────
router.get("/coins/history", requireStudent, async (req, res) => {
    try {
        const data = await coinService.getBalance(req.student._id);
        res.json({ success: true, history: data.coinsHistory, totalCoins: data.totalCoins, rupeeValue: data.rupeeValue });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/leaderboard
// ────────────────────────────────────────────────
router.get("/leaderboard", async (req, res) => {
    try {
        const top = await require("../../../models/new/StudentCoin").find()
            .sort({ totalCoins: -1 })
            .limit(20)
            .populate("studentId", "firstName lastName domain")
            .lean();

        const board = top.map((entry, i) => ({
            rank:       i + 1,
            name:       entry.studentId ? `${entry.studentId.firstName} ${entry.studentId.lastName}`.trim() : "Anonymous",
            domain:     entry.studentId?.domain || "",
            totalCoins: entry.totalCoins,
            rupeeValue: (entry.totalCoins * 0.5).toFixed(2)
        }));

        res.json({ success: true, leaderboard: board });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/student/quiz-result
// Called from quiz-portal.html after submission
// ────────────────────────────────────────────────
router.post("/student/quiz-result", requireStudent, async (req, res) => {
    try {
        const { taskId, score, total, passed, coins, violations, autoSubmit } = req.body;
        const student = req.student;

        // Award coins if passed
        let awarded = 0;
        if (passed && coins > 0) {
            const result = await coinService.awardCoins(
                student._id,
                coins === 50 ? "QUIZ_PASSED_FIRST" : "QUIZ_PASSED_RETRY"
            );
            awarded = result.awarded;
        }

        // Mark task as approved if passed and taskId provided
        if (passed && taskId) {
            try {
                await StudentTaskProgress.updateOne(
                    { studentId: student._id, taskId },
                    { $set: { status: "approved", quizPassed: true, approvedAt: new Date(), coinsAwarded: coins || 0 } }
                );
            } catch(e) { /* silent */ }
        }

        const { totalCoins, rupeeValue } = await coinService.getBalance(student._id);
        res.json({ success: true, awarded, totalCoins, rupeeValue });
    } catch (err) {
        console.error("[V2] quiz-result error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
