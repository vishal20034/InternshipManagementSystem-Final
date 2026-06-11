
import { Task, User } from '../types';

export const MOCK_TASKS: Task[] = [
  {
    id: 'p1',
    domain: "Python Development",
    durationType: "3months",
    weekNumber: 1,
    taskTitle: "Python Basics",
    taskDescription: "Write 10 Python programs covering variables, data types, and input/output",
    videoUrl: "https://youtu.be/_uQrJ0TkZlc",
    coinReward: 20,
    difficultyLevel: "easy"
  },
  {
    id: 'p2',
    domain: "Python Development",
    durationType: "3months",
    weekNumber: 2,
    taskTitle: "Control Flow",
    taskDescription: "Build a number guessing game using loops, conditionals, and functions",
    videoUrl: "https://youtu.be/t8pPdKYpowI",
    coinReward: 20,
    difficultyLevel: "easy"
  },
  {
    id: 'p3',
    domain: "Python Development",
    durationType: "3months",
    weekNumber: 3,
    taskTitle: "Data Structures",
    taskDescription: "Build a contact book application using lists and dictionaries",
    videoUrl: "https://youtu.be/W8KRzm-HUcc",
    coinReward: 25,
    difficultyLevel: "easy"
  },
  {
    id: 'p4',
    domain: "Python Development",
    durationType: "3months",
    weekNumber: 4,
    taskTitle: "File Handling",
    taskDescription: "Build a student grade tracker that reads and writes to files",
    videoUrl: "https://youtu.be/Uh2ebFW8OYM",
    coinReward: 25,
    difficultyLevel: "medium"
  },
  {
    id: 'w1',
    domain: "Web Development",
    durationType: "3months",
    weekNumber: 1,
    taskTitle: "HTML & CSS Basics",
    taskDescription: "Create a responsive landing page for a personal portfolio using semantic HTML and CSS Grid/Flexbox.",
    videoUrl: "https://youtu.be/mU6anWqZJcc",
    coinReward: 20,
    difficultyLevel: "easy"
  },
  {
    id: 'w2',
    domain: "Web Development",
    durationType: "3months",
    weekNumber: 2,
    taskTitle: "JavaScript Fundamentals",
    taskDescription: "Implement a dynamic To-Do list with local storage persistence and event delegation.",
    videoUrl: "https://youtu.be/hdI2bqOjy7U",
    coinReward: 25,
    difficultyLevel: "easy"
  },
  {
    id: 'w3',
    domain: "Web Development",
    durationType: "3months",
    weekNumber: 3,
    taskTitle: "React Introduction",
    taskDescription: "Build a simple weather dashboard that fetches data from an external API using React hooks.",
    videoUrl: "https://youtu.be/LDB4uaJ87e0",
    coinReward: 30,
    difficultyLevel: "medium"
  },
  {
    id: 'd1',
    domain: "Data Science",
    durationType: "3months",
    weekNumber: 1,
    taskTitle: "Pandas & NumPy",
    taskDescription: "Analyze a real-world dataset and produce insights using Pandas and Matplotlib.",
    videoUrl: "https://youtu.be/vmEHCJofslg",
    coinReward: 40,
    difficultyLevel: "hard"
  },
  {
    id: 'm1',
    domain: "App Development",
    durationType: "3months",
    weekNumber: 1,
    taskTitle: "Flutter UI",
    taskDescription: "Build a responsive food delivery UI using Flutter widgets.",
    videoUrl: "https://youtu.be/p6fXz-D_V-A",
    coinReward: 35,
    difficultyLevel: "medium"
  }
];

export const MOCK_USER: User = {
  id: 'user123',
  name: 'Vishal Pawar',
  email: 'vishal@example.com',
  role: 'student',
  domain: 'Python Development',
  durationType: '3months',
  coins: 45,
  completedTasks: ['p1', 'p2'],
  joinedDate: '2024-01-15'
};
