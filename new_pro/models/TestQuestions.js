const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const testQuestionsSchema = new Schema({
    domain: { type: String, required: true },
    questions: [
        {
            question: { type: String, required: true },
            options: [String],
            correctAnswer: { type: Number, required: true }
        }
    ]
}, { timestamps: true });

module.exports = models.TestQuestions || model("TestQuestions", testQuestionsSchema);
