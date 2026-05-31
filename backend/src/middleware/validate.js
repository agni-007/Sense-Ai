export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    // Map zod errors to standard structured error array or simple message
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.validatedBody = result.data;
  next();
};
