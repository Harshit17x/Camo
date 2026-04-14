// CampusMobility Backend - Mappls Proxy Version 1.0.1
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import cors from "cors";
import twilio from "twilio";
import rateLimit from "express-rate-limit";

dotenv.config({ path: '.env.local' });
dotenv.config(); // also load .env as fallback

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let firebaseConfig = { projectId: "", firestoreDatabaseId: "" };
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");

if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
} else {
  // Fallback to environment variables if config file is missing
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "(default)"
  };
}

try {
  if (admin.apps.length === 0) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountStr) {
      try {
        const serviceAccount = JSON.parse(serviceAccountStr);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log(`Firebase Admin initialized with Service Account for project: ${firebaseConfig.projectId}`);
      } catch (e) {
        console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT environment variable is not valid JSON!");
        admin.initializeApp();
      }
    } else {
      // Try default initialization (works on Cloud Run/Google Cloud)
      admin.initializeApp();
      console.log("Firebase Admin initialized with Default Credentials");
    }
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

// Initialize Firestore with the correct database ID and project ID
const db = admin.apps.length > 0 
  ? getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId)
  : null;
const messaging = admin.apps.length > 0 ? admin.messaging() : null;
const authAdmin = admin.apps.length > 0 ? admin.auth() : null;

// Middleware to verify Firebase ID Token
const authenticateFirebaseUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid Authorization header" });
  }

  if (!authAdmin) {
    console.error("Firebase Admin Auth is not initialized");
    return res.status(503).json({ error: "Authentication service unavailable" });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error("Error verifying ID token:", error.message);
    res.status(403).json({ error: "Forbidden: Failed to verify token" });
  }
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // Rate limiters
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    message: "Too many requests from this IP, please try again later."
  });
  
  const sosLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // Max 3 SOS requests per minute per IP
    message: { error: "Too many SOS requests. Rate limit exceeded." }
  });

  const notificationLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 15, 
    message: { error: "Too many notifications sent. Rate limit exceeded." }
  });

  // Apply general limiter to map routes
  app.use("/api/map/", apiLimiter);

  // API Routes
  app.get("/api/health", async (req, res) => {
    let firestoreStatus = "unknown";
    try {
      if (db) {
        // Try a simple read to check permissions
        await db.collection("health").doc("check").get();
        firestoreStatus = "ok";
      } else {
        firestoreStatus = "not initialized";
      }
    } catch (error: any) {
      console.error("Firestore health check failed:", error.message);
      firestoreStatus = `error: ${error.message}`;
    }
    res.json({ 
      status: "ok", 
      service: "CampusMobility API", 
      firestore: firestoreStatus,
      messaging: !!messaging ? "ok" : "not initialized",
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      messagingSenderId: (firebaseConfig as any).messagingSenderId
    });
  });

  // Twilio SOS Call Endpoint
  app.post("/api/sos-call", authenticateFirebaseUser, sosLimiter, async (req, res) => {
    const { userId, location, rideId, userName, phone } = req.body;
    const authUser = (req as any).user;

    console.log(`[SOS] Received SOS request from user: ${userId} (${userName})`);

    // Check if user is triggering for themselves or is an admin
    let isAdmin = authUser.role === 'admin';
    
    // If role not in token, check Firestore
    if (!isAdmin && db) {
      try {
        const userDoc = await db.collection("users").doc(authUser.uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'admin') {
          isAdmin = true;
        }
      } catch (e) {
        console.error("[SOS] Error checking admin role:", e);
      }
    }

    if (userId !== authUser.uid && !isAdmin) {
      console.warn(`[SOS] Forbidden: User ${authUser.uid} tried to trigger SOS for ${userId}`);
      return res.status(403).json({ error: "Forbidden: You can only trigger SOS for your own account" });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_FROM_PHONE;
    const toPhone = process.env.TWILIO_TO_PHONE;

    if (!accountSid || !authToken) {
      console.error("[SOS] Twilio credentials missing. TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set.");
      return res.status(503).json({ 
        error: "Twilio client not initialized", 
        details: "Administrator has not configured Twilio credentials (TWILIO_ACCOUNT_SID/AUTH_TOKEN)." 
      });
    }

    if (!fromPhone || !toPhone) {
      console.error("[SOS] Twilio phone numbers missing. TWILIO_FROM_PHONE or TWILIO_TO_PHONE not set.");
      return res.status(500).json({ 
        error: "Twilio phone numbers not configured",
        details: "Administrator has not configured Twilio phone numbers (FROM/TO)."
      });
    }

    try {
      console.log(`[SOS] Initiating Twilio call to ${toPhone} from ${fromPhone}`);
      const twilioClient = twilio(accountSid, authToken);
      const call = await twilioClient.calls.create({
        twiml: `<Response><Say>SOS Alert. Emergency triggered by user ${userName || userId}. Location coordinates: ${location?.lat || 'unknown'}, ${location?.lng || 'unknown'}. Ride ID: ${rideId || 'none'}. Please check the admin dashboard immediately.</Say></Response>`,
        to: toPhone,
        from: fromPhone,
      });

      console.log(`[SOS] Call initiated successfully. Call SID: ${call.sid}`);
      res.json({ success: true, callSid: call.sid });
    } catch (error: any) {
      console.error("[SOS] Error initiating Twilio call:", error);
      res.status(500).json({ 
        error: "Failed to initiate SOS call via Twilio", 
        details: error.message,
        code: error.code
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Ride-Request Overlay Endpoint
  // Sends a HIGH-PRIORITY DATA-ONLY FCM message to the driver's device so
  // the app (via push-notification listener / background handler) can launch
  // OverlayService and display the floating ride card over other apps.
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/api/send-ride-request-overlay", authenticateFirebaseUser, notificationLimiter, async (req, res) => {
    const { driverUserId, rideId, pickup, dropoff, fare, rideType, distance } = req.body;

    if (!driverUserId || !rideId) {
      return res.status(400).json({ error: "Missing required fields: driverUserId, rideId" });
    }

    try {
      if (!db || !messaging) {
        return res.status(503).json({ error: "Firebase Admin is not initialized" });
      }

      const driverDoc = await db.collection("users").doc(driverUserId).get();
      if (!driverDoc.exists) {
        return res.status(404).json({ error: "Driver user not found" });
      }

      const driverToken = driverDoc.data()?.fcmToken;
      if (!driverToken) {
        return res.status(200).json({ success: false, error: "Driver has no FCM token registered" });
      }

      // Data-only message — no 'notification' block so Android won't show
      // a system tray notification; the app handles the UI via OverlayService.
      const message: admin.messaging.Message = {
        token: driverToken,
        data: {
          type: "ride_request_overlay",
          rideId: String(rideId),
          pickup: String(pickup ?? ""),
          dropoff: String(dropoff ?? ""),
          fare: String(fare ?? "0"),
          rideType: String(rideType ?? "Ride"),
          distance: String(distance ?? ""),
        },
        android: {
          priority: "high",
          ttl: 30_000, // 30 s — matches overlay auto-dismiss timeout
          collapseKey: "ride_request",
        },
      };

      const response = await messaging.send(message);
      console.log(`[Overlay FCM] Data-only message sent to driver ${driverUserId}. ID: ${response}`);
      res.json({ success: true, messageId: response });
    } catch (error: any) {
      console.error("[Overlay FCM] Error:", error);
      res.status(500).json({ error: "Failed to send overlay data message", details: error.message });
    }
  });

  // Push Notification Endpoint
  app.post("/api/send-notification", authenticateFirebaseUser, notificationLimiter, async (req, res) => {
    const { recipientId, title, body, data } = req.body;

    if (!recipientId || !title || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      if (!db || !messaging) {
        console.error("Firebase Admin is not initialized. db:", !!db, "messaging:", !!messaging);
        return res.status(503).json({ error: "Firebase Admin is not initialized" });
      }

      const stringifiedData: Record<string, string> = {};
      if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }

      const createMessage = (token: string): admin.messaging.Message => ({
        notification: { title, body },
        data: stringifiedData,
        token,
        android: {
          priority: 'high',
          ttl: 3600 * 1000,
          notification: {
            title,
            body,
            channelId: 'high_importance_channel',
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
            sticky: true,
            visibility: 'public',
            priority: 'high',
            notificationCount: 1,
          }
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title,
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            renotify: true,
            tag: 'ride-request',
            actions: [{ action: 'open', title: 'Open App' }]
          },
          fcmOptions: { link: '/' }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1,
              alert: { title, body }
            }
          }
        }
      });

      // Special case for admin notifications
      if (recipientId === 'admin_sos') {
        console.log("Broadcasting SOS to all admins...");
        const adminDocs = await db.collection("users").where("role", "==", "admin").get();
        
        if (adminDocs.empty) {
          console.warn("No admin users found in Firestore.");
          return res.status(404).json({ error: "No admin users found to notify" });
        }

        const tokens = adminDocs.docs
          .map(doc => doc.data().fcmToken)
          .filter(token => !!token);

        if (tokens.length === 0) {
          console.warn("Admins found but none have registered FCM tokens.");
          return res.status(404).json({ error: "Admins have not registered for notifications (FCM tokens missing)" });
        }

        const multicastMessage: admin.messaging.MulticastMessage = {
          notification: { title, body },
          data: stringifiedData,
          tokens: tokens,
          // ... other platform specific settings could be added here too if needed
        };

        const response = await messaging.sendEachForMulticast(multicastMessage);
        console.log(`SOS broadcasted to ${tokens.length} admins. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        return res.json({ 
          success: true, 
          message: `SOS broadcasted to ${response.successCount} admins`,
          successCount: response.successCount,
          failureCount: response.failureCount
        });
      }

      // Standard single recipient notification
      console.log(`Sending notification to recipient: ${recipientId}`);
      const userDoc = await db.collection("users").doc(recipientId).get();
      
      if (!userDoc.exists) {
        console.warn(`User document not found for recipient: ${recipientId}`);
        return res.status(404).json({ error: "User profile not found in Firestore" });
      }

      const userData = userDoc.data();
      if (!userData || !userData.fcmToken) {
        console.warn(`FCM token not found in Firestore for user: ${recipientId}`);
        // Return 200 but with success: false to avoid triggering console errors on the frontend for expected missing tokens
        return res.status(200).json({ 
          success: false, 
          error: "User has not registered for notifications (FCM token missing)",
          recipientId
        });
      }

      console.log(`FCM Token found: ${userData.fcmToken.substring(0, 10)}...`);
      const message = createMessage(userData.fcmToken);
      const response = await messaging.send(message);
      console.log(`Notification sent successfully. Message ID: ${response}`);
      res.json({ success: true, messageId: response });
    } catch (error: any) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification", details: error.message, code: error.code });
    }
  });

  // Stripe Payment Intent (Mock for now, requires STRIPE_SECRET_KEY)
  app.post("/api/create-payment-intent", authenticateFirebaseUser, async (req, res) => {
    const { amount, currency } = req.body;
    // In a real app:
    // const paymentIntent = await stripe.paymentIntents.create({ amount, currency });
    // res.json({ clientSecret: paymentIntent.client_secret });
    res.json({ clientSecret: "mock_secret_" + Math.random().toString(36).substring(7) });
  });

  // ── Metered TURN Server Credentials Proxy ──────────────────────────────────
  // Returns dynamic ICE servers (STUN + TURN) from Metered.ca
  // Keeps the API key server-side. Caches for 12 hours.
  let cachedIceServers: { data: any; timestamp: number } | null = null;
  const ICE_CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours

  app.get("/api/turn-credentials", authenticateFirebaseUser, async (req, res) => {
    // Return cached if fresh
    if (cachedIceServers && Date.now() - cachedIceServers.timestamp < ICE_CACHE_TTL) {
      return res.json(cachedIceServers.data);
    }

    const meteredDomain = process.env.METERED_DOMAIN || "campusmobility.metered.live";
    const meteredApiKey = process.env.METERED_SECRET_KEY || "bTfAN_5bEHEXgXjSmztTGWggIMpj-PgngE3516xwUCRpXCjY";

    try {
      const response = await axios.get(
        `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
        { timeout: 8000 }
      );

      cachedIceServers = { data: response.data, timestamp: Date.now() };
      console.log(`[TURN] Fetched ${response.data.length} ICE servers from Metered`);
      res.json(response.data);
    } catch (error: any) {
      console.error("[TURN] Failed to fetch Metered credentials:", error.message);
      // Return a hardcoded fallback so calls still work (STUN-only, may fail behind NAT)
      res.json([
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
      ]);
    }
  });

  // Cloudinary Config Proxy
  // Returns Cloudinary keys securely from backend env to avoid needing them in frontend .env
  app.get("/api/config/cloudinary", (req, res) => {
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      return res.status(404).json({ error: "Cloudinary keys not configured on server" });
    }
    
    res.json({ cloudName, uploadPreset });
  });

  // Geoapify Autocomplete API Proxy
  app.get("/api/map/autosuggest", async (req, res) => {
    const { query } = req.query;
    
    const apiKey = process.env.GEOAPIFY_API_KEY_AUTOSUGGEST || process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.warn("GEOAPIFY_API_KEY_AUTOSUGGEST is missing. Please set it in your environment variables.");
      return res.json({ suggestedLocations: [] });
    }

    try {
      const response = await axios.get(`https://api.geoapify.com/v1/geocode/autocomplete`, {
        params: {
          text: query,
          limit: 10,
          filter: 'countrycode:in', // Filter to India
          apiKey: apiKey
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CampusMobility/1.0 (contact@campusmobility.app)'
        }
      });
      
      // Map Geoapify response to our format
      const suggestions = (response.data.features || [])
        .filter((item: any) => {
          const state = item.properties?.state || '';
          return state.toLowerCase().includes('gujarat');
        })
        .map((item: any) => {
          const props = item.properties;
          return {
            id: props.place_id,
            placeName: props.name || props.street || props.city || props.formatted.split(',')[0],
            placeAddress: props.formatted,
            center: [props.lon, props.lat],
            type: props.result_type
          };
        });
      
      res.json({ suggestedLocations: suggestions });
    } catch (error: any) {
      console.error(`Autosuggest Error for query "${query}":`, error.message);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Simple in-memory cache for routing to avoid rate limits
  const routeCache = new Map<string, { data: any, timestamp: number }>();
  const ROUTE_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
  const ROUTE_CACHE_MAX_SIZE = 1000;

  app.get("/api/map/route", async (req, res) => {
    const { start, end } = req.query;
    console.log(`Routing request from ${start} to ${end}`);
    
    if (!start || !end) {
      return res.status(400).json({ error: "Missing start or end coordinates" });
    }

    // Rounding coordinates to 4 decimal places (~11m accuracy) drastically increases
    // cache hits and mitigates rate-limiting for cars stationary or creeping forward.
    const roundCoord = (coordStr: string) => {
      return coordStr.split(',').map(n => parseFloat(n).toFixed(4)).join(',');
    };

    const roundedStart = roundCoord(start as string);
    const roundedEnd = roundCoord(end as string);
    const cacheKey = `${roundedStart}-${roundedEnd}`;

    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL) {
      console.log(`Returning cached route for ${cacheKey}`);
      return res.json(cached.data);
    }
    
    const osrmServers = [
      'https://router.project-osrm.org/route/v1/driving',
      'https://routing.openstreetmap.de/routed-car/route/v1/driving'
    ];

    for (const baseUrl of osrmServers) {
      try {
        console.log(`Trying OSRM server: ${baseUrl} for route ${roundedStart} to ${roundedEnd}`);
        const response = await axios.get(`${baseUrl}/${roundedStart};${roundedEnd}`, {
          params: {
            overview: 'full',
            geometries: 'geojson',
            steps: true
          },
          timeout: 5000 // 5 second timeout
        });
        
        if (response.data && response.data.routes && response.data.routes.length > 0) {
          console.log(`OSRM Success from ${baseUrl}: ${response.data.routes.length} routes found`);
          
          // Save to cache
          if (routeCache.size >= ROUTE_CACHE_MAX_SIZE) {
            const firstKey = routeCache.keys().next().value;
            if (firstKey) routeCache.delete(firstKey);
          }
          routeCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
          
          return res.json(response.data);
        }
      } catch (error: any) {
        console.error(`OSRM Error from ${baseUrl}: ${error.message}`);
        if (error.response) {
          console.error(`OSRM Response Status: ${error.response.status}`);
        }
      }
    }
    
    res.status(503).json({ 
      error: "All routing servers failed",
      message: "Could not connect to any OSRM server. Using mock route as fallback.",
      fallback: true
    });
  });

  app.get("/api/map/distance_matrix", async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: "Missing coordinates" });

    // Rounding coordinates natively for faster caching.
    const roundCoord = (coordStr: string) => coordStr.split(',').map(n => parseFloat(n).toFixed(4)).join(',');
    const roundedStart = roundCoord(start as string);
    const roundedEnd = roundCoord(end as string);

    // OSRM Public Node severely limits the `/table` endpoints but allows `/route` freely.
    // Given this route only fetches 1 source and 1 destination, we'll bypass table limits.
    const osrmServers = [
      'https://router.project-osrm.org/route/v1/driving',
      'https://routing.openstreetmap.de/routed-car/route/v1/driving'
    ];

    for (const baseUrl of osrmServers) {
      try {
        const response = await axios.get(`${baseUrl}/${roundedStart};${roundedEnd}`, {
          params: { overview: 'false', steps: false },
          timeout: 5000
        });

        if (response.data && response.data.routes && response.data.routes.length > 0) {
          const r = response.data.routes[0];
          return res.json({
            distances: [[0, r.distance]],
            durations: [[0, r.duration]]
          });
        }
      } catch (error: any) {
        console.error(`OSRM Matrix (Route via proxy) Error from ${baseUrl}: ${error.message}`);
      }
    }

    res.status(503).json({ error: "All routing servers failed for distance matrix mapping" });
  });

  // Simple in-memory cache for reverse geocoding to avoid rate limits and improve performance
  const reverseCache = new Map<string, { data: any, timestamp: number }>();
  const REVERSE_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours (addresses don't change often)
  const REVERSE_CACHE_MAX_SIZE = 2000;

  app.get("/api/map/reverse", async (req, res) => {
    const { lat, lon, lang } = req.query;
    if (!lat || !lon || lat === 'undefined' || lon === 'undefined') {
      return res.status(400).json({ error: "Missing or invalid coordinates" });
    }

    // Round coordinates to 5 decimal places (~1.1m accuracy) for better street-level precision
    const roundedLat = parseFloat(lat as string).toFixed(5);
    const roundedLon = parseFloat(lon as string).toFixed(5);
    const language = (lang as string) || 'en';
    const cacheKey = `${roundedLat},${roundedLon},${language}`;

    // Check cache
    const cached = reverseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < REVERSE_CACHE_TTL) {
      return res.json(cached.data);
    }

    const apiKey = process.env.GEOAPIFY_API_KEY_REVERSE || process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.warn("GEOAPIFY_API_KEY_REVERSE is missing. Please set it in your environment variables.");
      return res.json({
        display_name: "Location (Geoapify Key Missing)",
        address: { road: "Unknown", city: "Unknown" }
      });
    }

    try {
      const response = await axios.get(`https://api.geoapify.com/v1/geocode/reverse`, {
        params: {
          lat: roundedLat,
          lon: roundedLon,
          apiKey: apiKey,
          lang: language
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CampusMobility/1.0 (contact@campusmobility.app)'
        },
        timeout: 10000 // Increased to 10s
      });

      let displayName = "Unknown Location";
      let isGenericAddress = false;

      if (response.data && response.data.features && response.data.features.length > 0) {
        const props = response.data.features[0].properties;
        displayName = props.formatted || "Unknown Location";
        
        // Check if the address is too generic (missing street, building, and city)
        if (!props.street && !props.name && !props.city && !props.village && !props.suburb) {
          isGenericAddress = true;
        }
      } else {
        isGenericAddress = true;
      }

      // If Geoapify returns a very generic address (like just a postcode and state),
      // fallback to Nominatim (OpenStreetMap) which often has better rural/suburban coverage in India
      if (isGenericAddress) {
        try {
          console.log(`Geoapify address too generic (${displayName}), falling back to Nominatim...`);
          const nomResponse = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
              lat: roundedLat,
              lon: roundedLon,
              format: 'json',
              addressdetails: 1,
              'accept-language': language
            },
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CampusMobility/1.0 (contact@campusmobility.app)'
            },
            timeout: 10000 // Increased to 10s
          });

          if (nomResponse.data && nomResponse.data.display_name) {
            displayName = nomResponse.data.display_name;
            response.data = nomResponse.data; // Replace response data with Nominatim's richer data
          }
        } catch (nomError: any) {
          console.error("Nominatim fallback failed:", nomError.message);
          // Keep the generic Geoapify address if Nominatim fails
        }
      }

      const responseData = {
        ...response.data,
        display_name: displayName
      };

      // Save to cache
      if (reverseCache.size >= REVERSE_CACHE_MAX_SIZE) {
        const firstKey = reverseCache.keys().next().value;
        if (firstKey) reverseCache.delete(firstKey);
      }
      reverseCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

      res.json(responseData);
    } catch (error: any) {
      console.error(`Reverse Geocode Error for ${lat},${lon}:`, error.message);
      
      // If it's a rate limit error or unauthorized, return a friendly fallback instead of 429/401
      if (error.response?.status === 429 || error.response?.status === 401 || error.response?.status === 403) {
         console.warn("Geoapify rate limit exceeded or unauthorized. Returning fallback data.");
         return res.json({
           display_name: "Location (API Rate Limit)",
           address: { road: "Unknown Road", city: "Unknown City" },
           error: "Rate limit exceeded",
           status: error.response?.status
         });
      }
      
      // For timeouts or other errors, return a friendly fallback
      res.json({ 
        display_name: "Location (Service Busy)",
        address: { road: "Coordinates: " + roundedLat + ", " + roundedLon, city: "Campus" },
        error: error.message,
        status: error.response?.status || 500
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CampusMobility Server running on port ${PORT}`);
  });
}

startServer();
