import express from 'express';
const router = express.Router();
import User from '../models/User.js';
import Exercise from '../models/Exercise.js';

// Route to create a new user
router.post('/users', async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Mongoose will automatically generate an _id for newUser
  const newUser = new User({ username: username });

  try {
    const data = await newUser.save();
    res.json({ username: data.username, _id: data._id });
  } catch (err) {
    console.error('Error saving user:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: 'Failed to save user' });
  }
});

// Route to add an exercise
router.post('/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res
      .status(400)
      .json({ error: 'Description and duration are required' });
  }

  // Find the user by ID to confirm existence and get username
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const exerciseDate = date ? new Date(date) : new Date();

  // Create a new Exercise document
  const newExercise = new Exercise({
    // Assign the _id to the 'userId' field in the Exercise schema
    userId: user._id,
    description: description,
    duration: parseInt(duration, 10),
    date: exerciseDate,
  });

  try {
    const savedExercise = await newExercise.save();

    res.json({
      username: user.username, // Get username from the found user object
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (error) {
    console.error('Error saving exercise:', error);
    return res.status(500).json({ error: 'Failed to save exercise' });
  }
});

// Route to get a user's exercise log
router.get('/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // Initialize the query object with the required userId
  const query = { userId: userId };

  // Set the date range if either from or to is provided
  if (from || to) {
    query.date = {}; // Initialize date as an object
    if (from) {
      query.date.$gte = new Date(from);
    }
    if (to) {
      query.date.$lte = new Date(to);
    }
  }

  // Set the options object for find()
  const options = {};
  if (limit) {
    options.limit = parseInt(limit, 10);
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find exercises based on the query and options
    const exercises = await Exercise.find(query, null, options);

    // Map the exercises to the desired format
    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));

    // Count the number of exercises
    const count = log.length;

    const response = {
      username: user.username,
      count: count,
      _id: user._id,
      log: log,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching logs:', error);
    // Explicitly check for CastError and return 404
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Invalid user ID' });
    }
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
