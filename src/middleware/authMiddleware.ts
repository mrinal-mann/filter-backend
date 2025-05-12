import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import fetch from "node-fetch";

// Create OAuth client for token validation
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
export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip auth for health endpoints if needed
  if (req.path === "/health") {
    next();
    return;
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("Missing or invalid authorization header");
    res.status(401).json({
      error: "Authentication required",
      message: "Missing or invalid authorization header",
    });
    return;
  }

  // Extract token
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  console.log(
    "Received token (first 20 chars):",
    token.substring(0, 20) + "..."
  );
  console.log("Path:", req.path);
  console.log("Method:", req.method);

  // DEBUGGING OPTION: Bypass auth for development
  // Uncomment the next lines to bypass auth while developing
  /*
  console.log("⚠️ WARNING: Authentication bypassed for development");
  req.user = { email: 'dev@example.com' };
  next();
  return;
  */

  // Validate Cloud Run access token with Google's tokeninfo endpoint
  validateAccessToken(token)
    .then((userData) => {
      console.log(
        "✅ Token validated successfully. User info:",
        userData.email || userData.scope || "No specific user info"
      );

      // Add user info to request
      req.user = userData;

      // Continue to the next middleware/route handler
      next();
    })
    .catch((error) => {
      console.error("❌ Token validation error:", error);
      console.error(
        "Token details (first 30 chars):",
        token.substring(0, 30) + "..."
      );
      res.status(403).json({
        error: "Authentication failed",
        message: "Invalid or expired token",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    });
}

/**
 * Validates a Google Cloud access token using the tokeninfo endpoint
 * This works with access tokens, not ID tokens
 */
async function validateAccessToken(token: string): Promise<any> {
  try {
    console.log("Validating token with Google's tokeninfo endpoint...");

    // Use Google's tokeninfo endpoint to validate the token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token validation failed:", errorText);

      // Try to get more information in case it's an ID token instead of access token
      try {
        console.log("Attempting to validate as ID token instead...");
        const idTokenResponse = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
        );
        if (idTokenResponse.ok) {
          console.log("Token appears to be an ID token, not an access token");
          return await idTokenResponse.json();
        } else {
          console.error("Not a valid ID token either");
        }
      } catch (idTokenError) {
        console.error("Error checking ID token:", idTokenError);
      }

      throw new Error(`Invalid token: ${errorText}`);
    }

    const tokenInfo = await response.json();
    console.log(
      "Token info:",
      JSON.stringify(
        {
          type: tokenInfo.token_type,
          expires_in: tokenInfo.expires_in,
          scope: tokenInfo.scope,
        },
        null,
        2
      )
    );

    // Return the token information
    return tokenInfo;
  } catch (error) {
    console.error("Error validating access token:", error);
    throw error;
  }
}
