const errorHandler = (err, req, res, next) => {
  console.error('[API Error]', JSON.stringify({ message: err.message, stack: err.stack }));

  if (err.isJoi) {
    return res.status(400).json({
      error: 'Invalid input',
      details: err.details.map((d) => d.message).join(', '),
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
};


module.exports = errorHandler;
