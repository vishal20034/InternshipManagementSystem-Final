const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/registerHubController");

router.post("/", ctrl.register);

module.exports = router;
