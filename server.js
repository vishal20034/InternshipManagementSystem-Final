
require("dotenv").config();

const path = require("path");
const cors = require("cors");
const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");

const Student = require("./models/Student");
const Notice = require("./models/Notice");
const Notification = require("./models/Notification");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

const upload = multer({ dest: "uploads/" });

// ================= MAIL =================

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error)=>{
    if(error){ console.log(error); }
    else{ console.log("Email Server Ready"); }
});

// ================= MONGODB =================

mongoose.connect("mongodb://nagbishal07_db_user:_DXMzR6bkF!7Bc9@ac-kbv0ma9-shard-00-00.dtg7de6.mongodb.net:27017,ac-kbv0ma9-shard-00-01.dtg7de6.mongodb.net:27017,ac-kbv0ma9-shard-00-02.dtg7de6.mongodb.net:27017/?ssl=true&replicaSet=atlas-ekamxn-shard-0&authSource=admin&appName=Cluster0")
.then(()=>console.log("MongoDB Connected"))
.catch((err)=>console.log(err));

// ================= SCHEMAS =================

const submissionSchema = new mongoose.Schema({
    employeeId: String,
    domain: String,
    task: String,
    githubLink: String,
    note: String,
    image: String,
    pdf: String,
    feedback: { type: String, default: "No Feedback Yet" },
    status: { type: String, default: "Pending" },
    reviewedOnce: { type: Boolean, default: false },
    attendanceAllowed: { type: Boolean, default: false },
    attendanceGiven: { type: Boolean, default: false },
    attendanceCount: { type: Number, default: 0 },
    internshipDuration: { type: String, default: "1 Month" },
    monthlyAttendance: {
        month1: { type: Number, default: 0 },
        month2: { type: Number, default: 0 },
        month3: { type: Number, default: 0 },
        month4: { type: Number, default: 0 },
        month5: { type: Number, default: 0 },
        month6: { type: Number, default: 0 }
    },
    meetingsJoined: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    performance: { type: String, default: "B" },
    submittedAt: { type: Date, default: Date.now }
});

const Submission = mongoose.model("Submission", submissionSchema);

// ================= TEST SCHEMAS =================

const testQuestionSchema = new mongoose.Schema({
    domain: { type: String, required: true },
    question: { type: String, required: true },
    options: [String],
    correctAnswer: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const TestQuestion = mongoose.model("TestQuestion", testQuestionSchema);

const testResultSchema = new mongoose.Schema({
    employeeId: { type: String, required: true },
    studentName: { type: String, required: true },
    domain: { type: String, required: true },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
});

const TestResult = mongoose.model("TestResult", testResultSchema);

// ================= ROUTES =================

app.get("/dashboard", (req,res)=>{ res.sendFile(path.join(__dirname,"public","dashboard.html")); });
app.get("/groups", (req,res)=>{ res.sendFile(path.join(__dirname,"public","groups.html")); });
app.get("/edit.html", (req,res)=>{ res.sendFile(path.join(__dirname,"public","edit.html")); });
app.get("/hr-portal", (req,res)=>{ res.sendFile(path.join(__dirname,"public","hr-portal.html")); });
app.get("/hr-login", (req,res)=>{ res.sendFile(path.join(__dirname,"public","hr-login.html")); });

// ================= EMPLOYEE ID =================

async function generateEmployeeId(domain){
    const domainShortCodes = {
        "DevOps with AWS":          "DEVOPS",
        "Python Development":       "PY",
        "Java Development":         "JAVA",
        "Web Development":          "WEB",
        "MERN Stack Development":   "MERN",
        "Artificial Intelligence":  "AI",
        "Data Science":             "DS",
        "Cyber Security":           "CYBER",
        "Software Engineering":     "SDE",
        "Flutter Development":      "FLUTTER"
    };
    const shortCode = domainShortCodes[domain] || domain.toUpperCase();
    const totalStudents = await Student.countDocuments();
    const sequenceNumber = 1001 + totalStudents;
    return `TEN/${shortCode}/${sequenceNumber}`;
}

// ================= REGISTER =================

app.post("/register", async(req,res)=>{
try{
const { firstName, lastName, domain, whatsapp, email, tenure, joiningDate } = req.body;

const existingStudent = await Student.findOne({ email });

if(existingStudent){
    return res.json({ success:false, already:true, employeeId:existingStudent.employeeId });
}

const employeeId = await generateEmployeeId(domain);
const password = crypto.randomBytes(4).toString("hex");

const newStudent = new Student({
    firstName, lastName,
    name: firstName + " " + lastName,
    domain, whatsapp, email,
    tenure, joiningDate,
    employeeId, password
});

await newStudent.save();

try{
    await transporter.sendMail({
        from:"TEN Internship Portal <ten.internshipportal@gmail.com>",
        to:email,
        subject:"Internship Registration Successful",
        text:`Hello ${firstName},\n\nYour Internship Registration is Successful 🚀\n\nEmployee ID: ${employeeId}\nPassword: ${password}\n\nLogin:\nhttp://13.235.150.76:5000/login.html\n\nThank You`
    });
}catch(mailError){ console.log("MAIL ERROR:", mailError); }

res.json({ success:true, employeeId });

}catch(error){ console.log(error); res.status(500).json({ success:false, message:"Server Error" }); }
});

// ================= LOGIN =================

app.post("/login", async(req,res)=>{
try{
    const { employeeId, password } = req.body;
    const student = await Student.findOne({ employeeId, password });
    if(!student){ return res.json({ success:false, message:"Invalid Employee ID or Password" }); }
    res.json({ success:true, student });
}catch(error){ res.status(500).json({ success:false, message:"Server Error" }); }
});

// ================= SUBMIT TASK =================

app.post("/submit-task", upload.fields([
    { name:"image", maxCount:1 },
    { name:"pdf", maxCount:1 }
]), async(req,res)=>{
try{
    const { employeeId, domain, githubLink, note, task } = req.body;
    const image = req.files["image"] ? "/" + req.files["image"][0].path : "";
    const pdf   = req.files["pdf"]   ? "/" + req.files["pdf"][0].path   : "";

    const student = await Student.findOne({ employeeId });
    let internshipDuration = "1 Month";
    if(student && student.tenure){
        const t = student.tenure.toLowerCase();
        if(t.includes("6")){ internshipDuration = "6 Months"; }
        else if(t.includes("3")){ internshipDuration = "3 Months"; }
        else { internshipDuration = "1 Month"; }
    }

    const submission = new Submission({
        employeeId, domain,
        task: task || "",
        githubLink, note,
        image, pdf,
        status: "Pending",
        reviewedOnce: false,
        attendanceAllowed: false,
        attendanceGiven: false,
        attendanceCount: 0,
        internshipDuration,
        monthlyAttendance: { month1:0, month2:0, month3:0, month4:0, month5:0, month6:0 },
        tasksCompleted: 0,
        meetingsJoined: 0,
        performance: "B"
    });

    await submission.save();
    res.json({ success:true, message:"Task Submitted Successfully" });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Submission Failed" });
}
});

// ================= STUDENT SUBMISSIONS =================

app.get("/student-submissions/:employeeId", async(req,res)=>{
try{
    const employeeId = decodeURIComponent(req.params.employeeId);
    const submissions = await Submission.find({ employeeId }).sort({ submittedAt:-1 });
    res.json({ success:true, submissions });
}catch(error){
    console.log(error);
    res.json({ success:false, submissions:[] });
}
});

// ================= COORDINATOR DOMAIN SUBMISSIONS =================

app.get("/all-submissions/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const submissions = await Submission.find({ domain }).sort({ submittedAt:-1 });
    res.json(submissions);
}catch(error){
    console.log(error);
    res.json([]);
}
});

// ================= UPDATE STATUS =================

app.post("/update-status", async(req,res)=>{
try{
    const { id, status, feedback } = req.body;

    const existing = await Submission.findById(id);
    if(!existing){
        return res.json({ success:false, message:"Submission not found" });
    }
    if(existing.reviewedOnce){
        return res.json({ success:false, message:"Already reviewed. Cannot change decision.", alreadyReviewed:true });
    }

    let performance = "B";
    if(status === "Approved"){ performance = "A+"; }

    await Submission.findByIdAndUpdate(id, {
        status,
        feedback,
        reviewedOnce: true,
        attendanceAllowed: status === "Approved",
        performance,
        tasksCompleted: status === "Approved" ? 1 : 0
    }, { new:true });

    // Fire notification to the student
    const submission = await Submission.findById(id);
    if(submission){
        const notif = new Notification({
            title: `Task ${status}`,
            message: `Your task submission has been ${status.toLowerCase()}. Feedback: ${feedback || "No feedback provided"}`,
            type: status === "Approved" ? "success" : "warning",
            from: "Coordinator",
            targetType: "student",
            targetEmployeeId: submission.employeeId,
            targetDomain: submission.domain
        });
        await notif.save();
        // SSE broadcast to student
        broadcastNotification(submission.domain, submission.employeeId, notif);
    }

    res.json({ success:true, message:"Status Updated Successfully" });
}catch(error){
    console.log(error);
    res.json({ success:false });
}
});

// ================= ATTENDANCE =================

app.post("/give-attendance", async(req,res)=>{
try{
    const { employeeId } = req.body;
    const submission = await Submission.findOne({ employeeId }).sort({ submittedAt:-1 });

    if(!submission){ return res.json({ success:false, message:"Submit task first" }); }
    if(submission.status === "Pending"){ return res.json({ success:false, message:"Coordinator has not responded yet" }); }
    if(submission.status === "Rejected"){ return res.json({ success:false, message:"Your task was rejected. Please resubmit." }); }
    if(submission.attendanceGiven){ return res.json({ success:false, message:"Attendance already submitted for today" }); }

    submission.attendanceGiven = true;
    submission.attendanceCount += 1;
    submission.meetingsJoined += 1;

    const dur = submission.internshipDuration;
    const ma = submission.monthlyAttendance;

    if(dur === "1 Month"){
        ma.month1 = Math.min(ma.month1 + 1, 20);
    }
    else if(dur === "3 Months"){
        if(ma.month1 < 20){ ma.month1 += 1; }
        else if(ma.month2 < 20){ ma.month2 += 1; }
        else if(ma.month3 < 20){ ma.month3 += 1; }
    }
    else if(dur === "6 Months"){
        if(ma.month1 < 20){ ma.month1 += 1; }
        else if(ma.month2 < 20){ ma.month2 += 1; }
        else if(ma.month3 < 20){ ma.month3 += 1; }
        else if(ma.month4 < 20){ ma.month4 += 1; }
        else if(ma.month5 < 20){ ma.month5 += 1; }
        else if(ma.month6 < 20){ ma.month6 += 1; }
    }

    submission.monthlyAttendance = ma;
    await submission.save();

    let totalDays = 20;
    let requiredDays = 15;
    if(dur === "3 Months"){ totalDays=60; requiredDays=45; }
    if(dur === "6 Months"){ totalDays=120; requiredDays=90; }

    const count = submission.attendanceCount;
    let thresholdMsg = "";
    if(count < requiredDays){
        thresholdMsg = `${requiredDays - count} more days needed to reach 75% attendance.`;
    } else {
        thresholdMsg = "✅ You have met the 75% attendance requirement!";
    }

    res.json({ success:true, message:"Attendance Submitted", thresholdMsg, attendanceCount: count });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Attendance Failed" });
}
});

// ================= SSE SYSTEM (Notifications + Notice) =================

// Map: key -> array of { res, employeeId, role }
// key for students: "student:employeeId"
// key for coordinators: "coord:domain"
// key for HR: "hr:all"
const sseClients = new Map();

function addSSEClient(key, res, meta = {}){
    if(!sseClients.has(key)) sseClients.set(key, []);
    sseClients.get(key).push({ res, ...meta });
}

function removeSSEClient(key, res){
    const arr = sseClients.get(key) || [];
    const idx = arr.findIndex(c => c.res === res);
    if(idx !== -1) arr.splice(idx, 1);
}

function sendSSE(res, data){
    try{ res.write(`data: ${JSON.stringify(data)}\n\n`); } catch(e){}
}

function broadcastNotification(domain, employeeId, notif){
    // to specific student
    if(employeeId){
        const key = `student:${employeeId}`;
        const clients = sseClients.get(key) || [];
        clients.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    }
    // to domain coordinator
    if(domain){
        const key = `coord:${domain}`;
        const clients = sseClients.get(key) || [];
        clients.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    }
}

// ================= STUDENT SSE =================

app.get("/student-events/:employeeId", (req,res)=>{
    const employeeId = decodeURIComponent(req.params.employeeId);
    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");
    res.flushHeaders();
    res.write("data: connected\n\n");

    const key = `student:${employeeId}`;
    addSSEClient(key, res);

    req.on("close",()=>{ removeSSEClient(key, res); });
});

// ================= COORDINATOR SSE =================

app.get("/coord-events/:domain", (req,res)=>{
    const domain = decodeURIComponent(req.params.domain);
    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");
    res.flushHeaders();
    res.write("data: connected\n\n");

    const key = `coord:${domain}`;
    addSSEClient(key, res, { domain });

    req.on("close",()=>{ removeSSEClient(key, res); });
});

// ================= NOTICE SSE (legacy kept for compat) =================

app.get("/notice-events/:domain", (req,res)=>{
    const domain = decodeURIComponent(req.params.domain);
    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");
    res.flushHeaders();
    res.write("data: connected\n\n");

    const key = `coord:${domain}`;
    addSSEClient(key, res, { domain });
    req.on("close",()=>{ removeSSEClient(key, res); });
});

// ================= UPDATE NOTICE =================

app.post("/update-notice", async(req,res)=>{
try{
    const { domain, morningMeeting, eveningMeeting, meetingLink, importantNotice } = req.body;

    await Notice.findOneAndUpdate(
        { domain },
        { domain, morningMeeting, eveningMeeting, meetingLink, importantNotice },
        { upsert:true, new:true }
    );

    // Broadcast SSE notice update to domain students
    const key = `coord:${domain}`;
    const clients = sseClients.get(key) || [];
    const payload = JSON.stringify({ event:"notice-updated", domain });
    clients.forEach(c => {
        try{ c.res.write(`data: ${payload}\n\n`); } catch(e){}
    });

    // Also notify students in this domain
    for(const [k, arr] of sseClients.entries()){
        if(k.startsWith("student:")){
            arr.forEach(c => {
                if(c.domain === domain){
                    try{ c.res.write(`data: ${JSON.stringify({ event:"notice-updated", domain })}\n\n`); } catch(e){}
                }
            });
        }
    }

    res.json({ success:true });
}catch(error){
    console.log(error);
    res.status(500).json({ success:false });
}
});

// ================= GET DOMAIN NOTICE =================

app.get("/get-notice/:domain", async(req,res)=>{
try{
    const notice = await Notice.findOne({ domain:req.params.domain });
    res.json(notice || {});
}catch(error){ res.json({ success:false }); }
});

// ================= NOTIFICATIONS - GET FOR STUDENT =================

app.get("/notifications/student/:employeeId", async(req,res)=>{
try{
    const { employeeId } = req.params;
    const student = await Student.findOne({ employeeId });
    const domain = student ? student.domain : "";
    
    const notifs = await Notification.find({
        $or: [
            { targetType: "all" },
            { targetType: "domain", targetDomain: domain },
            { targetType: "student", targetEmployeeId: employeeId }
        ]
    }).sort({ createdAt:-1 }).limit(50);
    
    // Mark unread count
    const unread = notifs.filter(n => !n.readBy.includes(employeeId)).length;
    
    res.json({ success:true, notifications:notifs, unread });
}catch(error){
    console.log(error);
    res.json({ success:false, notifications:[], unread:0 });
}
});

// ================= NOTIFICATIONS - GET FOR COORDINATOR =================

app.get("/notifications/coordinator/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    
    const notifs = await Notification.find({
        $or: [
            { targetType: "coordinator" },
            { targetType: "coordinator-domain", targetDomain: domain },
            // HR to all
            { targetType: "all", from: "HR" }
        ]
    }).sort({ createdAt:-1 }).limit(50);
    
    const unread = notifs.filter(n => !n.readBy.includes(`coord:${domain}`)).length;
    
    res.json({ success:true, notifications:notifs, unread });
}catch(error){
    console.log(error);
    res.json({ success:false, notifications:[], unread:0 });
}
});

// ================= NOTIFICATIONS - MARK READ =================

app.post("/notifications/mark-read", async(req,res)=>{
try{
    const { notifId, readerId } = req.body;
    await Notification.findByIdAndUpdate(notifId, {
        $addToSet: { readBy: readerId }
    });
    res.json({ success:true });
}catch(error){
    res.json({ success:false });
}
});

// ================= HR LOGIN =================

app.post("/hr-login", async(req,res)=>{
try{
    const { username, password } = req.body;
    // Default HR credentials (can be extended to DB)
    const hrAccounts = {
        "hr_admin": { password: "HR@TEN2026", name: "HR Administrator" },
        "hr_manager": { password: "HRMgr@2026", name: "HR Manager" }
    };
    const hr = hrAccounts[username];
    if(!hr || hr.password !== password){
        return res.json({ success:false, message:"Invalid HR credentials" });
    }
    res.json({ success:true, hr:{ username, name:hr.name, role:"hr" } });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Server Error" });
}
});

// ================= HR - SEND NOTIFICATION =================

app.post("/hr/send-notification", async(req,res)=>{
try{
    const { title, message, type, targetType, targetDomain, targetEmployeeId, targetUsername } = req.body;
    
    const notif = new Notification({
        title, message, type: type || "info",
        from: "HR",
        targetType: targetType || "all",
        targetDomain: targetDomain || "",
        targetEmployeeId: targetEmployeeId || "",
        targetUsername: targetUsername || ""
    });
    await notif.save();
    
    // SSE broadcast based on targetType
    if(targetType === "all"){
        // Broadcast to all students and coordinators
        for(const [key, arr] of sseClients.entries()){
            arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
        }
    } else if(targetType === "domain"){
        // All students of a domain + coordinator of that domain
        for(const [key, arr] of sseClients.entries()){
            if(key === `coord:${targetDomain}`){
                arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
            }
        }
        // Also need to notify students - broadcast to all SSE clients and they filter on client side
        for(const [key, arr] of sseClients.entries()){
            if(key.startsWith("student:")){
                arr.forEach(c => {
                    if(c.studentDomain === targetDomain){
                        sendSSE(c.res, { event:"notification", notification:notif });
                    }
                });
            }
        }
    } else if(targetType === "student"){
        const key = `student:${targetEmployeeId}`;
        const arr = sseClients.get(key) || [];
        arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    } else if(targetType === "coordinator"){
        // All coordinators
        for(const [key, arr] of sseClients.entries()){
            if(key.startsWith("coord:")){
                arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
            }
        }
    } else if(targetType === "coordinator-domain"){
        const key = `coord:${targetDomain}`;
        const arr = sseClients.get(key) || [];
        arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    }
    
    res.json({ success:true, message:"Notification sent successfully" });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Failed to send notification" });
}
});

// ================= HR - GET ALL STUDENTS =================

app.get("/hr/students", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const students = await Student.find().sort({ createdAt:-1 });
    res.json({ success:true, students });
}catch(error){ res.status(500).json({ message:"Error fetching students" }); }
});

// ================= HR - GET ALL SUBMISSIONS =================

app.get("/hr/submissions", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const submissions = await Submission.find().sort({ submittedAt:-1 });
    res.json({ success:true, submissions });
}catch(error){ res.status(500).json({ message:"Error" }); }
});

// ================= HR - GET STATS =================

app.get("/hr/stats", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const totalStudents = await Student.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    const approved = await Submission.countDocuments({ status:"Approved" });
    const rejected = await Submission.countDocuments({ status:"Rejected" });
    const pending = await Submission.countDocuments({ status:"Pending" });
    
    // Domain breakdown
    const domains = [
        "DevOps with AWS","Python Development","Java Development","Web Development",
        "MERN Stack Development","Artificial Intelligence","Data Science",
        "Cyber Security","Software Engineering","Flutter Development"
    ];
    const domainStats = [];
    for(const d of domains){
        const count = await Student.countDocuments({ domain:d });
        if(count > 0) domainStats.push({ domain:d, count });
    }
    
    const notifications = await Notification.find({ from:"HR" }).sort({ createdAt:-1 }).limit(10);
    
    res.json({ 
        success:true, 
        stats:{ totalStudents, totalSubmissions, approved, rejected, pending },
        domainStats,
        notifications
    });
}catch(error){ res.status(500).json({ message:"Error" }); }
});

// ================= HR - GET ALL NOTIFICATIONS SENT =================

app.get("/hr/notifications", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const notifs = await Notification.find().sort({ createdAt:-1 }).limit(100);
    res.json({ success:true, notifications:notifs });
}catch(error){ res.status(500).json({ success:false }); }
});

// ================= HR - DELETE NOTIFICATION =================

app.delete("/hr/notifications/:id", async(req,res)=>{
try{
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success:true });
}catch(error){ res.json({ success:false }); }
});

// ================= ALL STUDENTS (legacy admin) =================

app.get("/students", async(req,res)=>{
    const adminPassword = req.headers.authorization;
    if(adminPassword !== "Bearer mysecret123"){
        return res.status(401).json({ message:"Unauthorized" });
    }
    try{
        const students = await Student.find().sort({ createdAt:-1 });
        res.json(students);
    }catch(error){ res.status(500).json({ message:"Error fetching students" }); }
});

// ================= UPDATE STUDENT =================

app.put("/students/:id", async(req,res)=>{
try{
    await Student.findByIdAndUpdate(req.params.id, req.body, { new:true });
    res.json({ message:"Student Updated" });
}catch(error){ res.status(500).json({ message:"Update Failed" }); }
});

// ================= DELETE STUDENT =================

app.delete("/students/:id", async(req,res)=>{
try{
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message:"Student deleted" });
}catch(error){ res.status(500).json({ message:"Error deleting student" }); }
});

// ================= STUDENT LOGIN =================

app.post("/student-login", async(req,res)=>{
try{
    const { employeeId, password } = req.body;
    const student = await Student.findOne({ employeeId, password });
    if(!student){ return res.json({ success:false, message:"Invalid Employee ID or Password" }); }
    res.json({
        success:true,
        student:{
            name: student.firstName + " " + student.lastName,
            employeeId: student.employeeId,
            domain: student.domain
        }
    });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Server Error" });
}
});

// ================= COORDINATOR LOGIN =================

app.post("/coordinator-login", async(req,res)=>{
try{
    const { username, password } = req.body;
    const coordinators = {
        "devops_aws_admin":   { password:"DevOpsAWS@2026",  domain:"DevOps with AWS" },
        "python_admin":       { password:"Python@2026",     domain:"Python Development" },
        "java_admin":         { password:"Java@2026",       domain:"Java Development" },
        "web_admin":          { password:"Web@2026",        domain:"Web Development" },
        "mern_admin":         { password:"Mern@2026",       domain:"MERN Stack Development" },
        "ai_admin":           { password:"AI@2026",         domain:"Artificial Intelligence" },
        "datascience_admin":  { password:"DS@2026",         domain:"Data Science" },
        "cyber_admin":        { password:"Cyber@2026",      domain:"Cyber Security" },
        "software_admin":     { password:"Software@2026",   domain:"Software Engineering" },
        "flutter_admin":      { password:"Flutter@2026",    domain:"Flutter Development" }
    };
    const coordinator = coordinators[username];
    if(!coordinator || coordinator.password !== password){
        return res.json({ success:false });
    }
    res.json({ success:true, coordinator:{ username, domain:coordinator.domain } });
}catch(error){
    console.log(error);
    res.json({ success:false });
}
});

// ================= TEST: COORDINATOR SAVE QUESTIONS =================

app.post("/save-test-questions", async(req,res)=>{
try{
    const { domain, questions } = req.body;
    await TestQuestion.deleteMany({ domain });
    const docs = questions.map(q=>({ domain, question:q.question, options:q.options, correctAnswer:q.correctAnswer }));
    await TestQuestion.insertMany(docs);
    res.json({ success:true, message:"Test questions saved" });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Failed to save questions" });
}
});

// ================= TEST: GET QUESTIONS FOR STUDENT =================

app.get("/get-test-questions/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const questions = await TestQuestion.find({ domain }, { correctAnswer:0 });
    res.json({ success:true, questions });
}catch(error){
    console.log(error);
    res.json({ success:false, questions:[] });
}
});

// ================= TEST: SUBMIT TEST =================

app.post("/submit-test", async(req,res)=>{
try{
    const { employeeId, studentName, domain, answers } = req.body;

    const questions = await TestQuestion.find({ domain });
    if(questions.length === 0){
        return res.json({ success:false, message:"No test available" });
    }

    let score = 0;
    answers.forEach((ans, idx)=>{
        if(questions[idx] && ans === questions[idx].correctAnswer){ score++; }
    });

    const percentage = Math.round((score / questions.length) * 100);

    await TestResult.findOneAndUpdate(
        { employeeId, domain },
        { employeeId, studentName, domain, score, totalQuestions:questions.length, percentage, submittedAt:new Date() },
        { upsert:true, new:true }
    );

    res.json({ success:true, score, totalQuestions:questions.length, percentage });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Test submission failed" });
}
});

// ================= TEST: LEADERBOARD =================

app.get("/test-leaderboard/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const results = await TestResult.find({ domain }).sort({ percentage:-1, submittedAt:1 });
    res.json({ success:true, leaderboard:results });
}catch(error){
    console.log(error);
    res.json({ success:false, leaderboard:[] });
}
});


// ================= COORDINATOR TASK SCHEMA =================

const coordinatorTaskSchema = new mongoose.Schema({
    domain:    { type: String, required: true, unique: true },
    tasks:     [String],
    fileUrl:   { type: String, default: "" },
    fileName:  { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now }
});
const CoordinatorTask = mongoose.model("CoordinatorTask", coordinatorTaskSchema);

// ================= COORDINATOR TASKS - GET =================

app.get("/coordinator/tasks/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const ct = await CoordinatorTask.findOne({ domain });
    res.json({ success:true, tasks: ct?.tasks||[], fileUrl: ct?.fileUrl||"", fileName: ct?.fileName||"" });
}catch(e){ res.json({ success:true, tasks:[], fileUrl:"", fileName:"" }); }
});

// ================= COORDINATOR TASKS - SAVE =================

app.post("/coordinator/tasks", async(req,res)=>{
try{
    const { domain, tasks } = req.body;
    await CoordinatorTask.findOneAndUpdate(
        { domain },
        { domain, tasks, updatedAt: new Date() },
        { upsert:true, new:true }
    );
    res.json({ success:true });
}catch(e){ res.json({ success:false, message:"Failed to save tasks" }); }
});

// ================= COORDINATOR TASKS - UPLOAD FILE =================

app.post("/coordinator/tasks/upload-file", upload.single("taskFile"), async(req,res)=>{
try{
    const { domain } = req.body;
    if(!req.file){ return res.json({ success:false, message:"No file uploaded" }); }
    const fileUrl  = "/" + req.file.path;
    const fileName = req.file.originalname;
    await CoordinatorTask.findOneAndUpdate(
        { domain },
        { domain, fileUrl, fileName, updatedAt: new Date() },
        { upsert:true, new:true }
    );
    res.json({ success:true, fileUrl, fileName });
}catch(e){ res.json({ success:false, message:"Upload failed: " + e.message }); }
});

// ================= COORDINATOR TASKS - REMOVE FILE =================

app.post("/coordinator/tasks/remove-file", async(req,res)=>{
try{
    const { domain } = req.body;
    await CoordinatorTask.findOneAndUpdate({ domain }, { fileUrl:"", fileName:"" });
    res.json({ success:true });
}catch(e){ res.json({ success:false }); }
});

// ================= SERVER =================

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{ console.log(`Server running on port ${PORT}`); });
