const express = require('express');
const ctrl = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.post('/', upload.array('files', 10), ctrl.createTicket);
router.get('/', ctrl.listTickets);
router.get('/:id', ctrl.getTicket);
router.patch('/:id', upload.array('files', 10), ctrl.updateTicket);
router.post('/:id/comments', upload.array('files', 5), ctrl.addComment);

module.exports = router;
