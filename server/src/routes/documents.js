const express = require('express');
const multer = require('multer');
const Document = require('../models/Document');
const auth = require('../middleware/auth');
const communityMember = require('../middleware/communityMember');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Accepted: PDF, DOC, DOCX, PNG, JPEG'));
    }
  }
});

// List documents
router.get('/:communityId/documents', auth, communityMember, async (req, res) => {
  try {
    const documents = await Document.findByCommunity(req.params.communityId);
    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Download document
router.get('/:communityId/documents/:documentId/download', auth, communityMember, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.documentId);
    if (!doc || doc.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.setHeader('Content-Length', doc.file_size);
    res.send(doc.file_data);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Upload document (admin only)
router.post('/:communityId/documents', auth, communityMember, upload.single('file'), async (req, res) => {
  try {
    if (req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const name = req.body.name || req.file.originalname;
    const document = await Document.create(req.params.communityId, req.user.id, {
      name,
      filename: req.file.originalname,
      mime_type: req.file.mimetype,
      file_data: req.file.buffer,
      file_size: req.file.size
    });
    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Delete document (admin only)
router.delete('/:communityId/documents/:documentId', auth, communityMember, async (req, res) => {
  try {
    if (req.communityRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const doc = await Document.findById(req.params.documentId);
    if (!doc || doc.community_id !== parseInt(req.params.communityId)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    await Document.delete(req.params.documentId);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('File type not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
