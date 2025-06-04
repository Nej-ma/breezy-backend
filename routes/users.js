var express = require('express');
var router = express.Router();
var controllers = require('../controllers/users.controllers');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a list of users
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *   post:
 *     summary: Create a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               displayName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User account created successfully
 *       400:
 *         description: Bad request
 */
router.post('/', controllers.createAccount);

/**
 * @swagger
 * /users/activate/{token}:
 *   post:
 *     summary: Activate user account with verification token
 *     description: This endpoint allows users to activate their account using a verification token sent via email.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: The verification token sent to the user's email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User account activated successfully
 *       400:
 *         description: Bad request, invalid or expired token
 */
router.post("/activate/:token", controllers.validateEmail);

module.exports = router;
