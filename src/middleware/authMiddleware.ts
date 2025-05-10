import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

// Create OAuth client for token verification
const client = new OAuth2Client();

// Add user property to Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to verify Cloud Run tokens
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health endpoints if needed
  if (req.path === '/health') {
    next();
    return;
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ 
      error: 'Authentication required', 
      message: 'Missing or invalid authorization header' 
    });
    return;
  }

  // Extract token
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Verify token using Google's public keys
  client.verifyIdToken({
    idToken: token,
    audience: undefined, // No specific audience needed for prototype
  })
    .then(ticket => {
      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }
      
      // Add user info to request
      req.user = payload;
      
      // Continue to the next middleware/route handler
      next();
    })
    .catch(error => {
      console.error('Token verification error:', error);
      res.status(403).json({ 
        error: 'Authentication failed', 
        message: 'Invalid or expired token' 
      });
    });
}