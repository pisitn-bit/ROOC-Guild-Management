import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { GuildState, Member, DEFAULT_JOB_CLASSES } from "./src/types.js";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Setup state filepath
const STATE_FILE = path.join(process.cwd(), "guild_state.json");

// Helper to seed initial data
const getInitialState = (): GuildState => {
  return {
    members: [
      { id: "1", name: "มหาเทพพริ้ง", role: "admin", participatedWarsCount: 15, hasReceivedInCycle: false, joinedAt: "2026-01-10" },
      { id: "2", name: "บอสใหญ่ใจดี", role: "admin", participatedWarsCount: 18, hasReceivedInCycle: true, joinedAt: "2026-01-12" },
      { id: "3", name: "ZenyCollector", role: "member", participatedWarsCount: 12, hasReceivedInCycle: false, joinedAt: "2026-01-15" },
      { id: "4", name: "SniperNo1", role: "member", participatedWarsCount: 14, hasReceivedInCycle: true, joinedAt: "2026-01-16" },
      { id: "5", name: "HealMePls", role: "member", participatedWarsCount: 16, hasReceivedInCycle: false, joinedAt: "2026-01-18" },
      { id: "6", name: "AssassinCross", role: "member", participatedWarsCount: 11, hasReceivedInCycle: false, joinedAt: "2026-01-20" },
      { id: "7", name: "LordKnight", role: "member", participatedWarsCount: 13, hasReceivedInCycle: false, joinedAt: "2026-01-22" },
      { id: "8", name: "HighPriest", role: "member", participatedWarsCount: 17, hasReceivedInCycle: false, joinedAt: "2026-01-25" },
    ],
    masterItems: [
      { id: "mi-1", name: "ขนนกขาว (White Feather)", itemType: "material" },
      { id: "mi-2", name: "ขนนกแดงดำ (Red-Black Feather)", itemType: "material" },
      { id: "mi-3", name: "เศษสมุด (Book Shard)", itemType: "material" },
      { id: "mi-4", name: "Puppet Card", itemType: "card" },
    ],
    events: [
      {
        id: "ev-1",
        title: "Guild League ประจำวันที่ 16/07/2026",
        type: "league",
        date: "2026-07-16",
        participants: ["1", "2", "3", "4", "5"],
        status: "active",
        drops: [
          {
            id: "dr-1",
            itemName: "ขนนกขาว (White Feather)",
            quantity: 3,
            assignedToMemberId: null,
            assignedToMemberName: null,
            bidAmount: 0
          },
          {
            id: "dr-2",
            itemName: "เศษสมุด (Book Shard)",
            quantity: 2,
            assignedToMemberId: null,
            assignedToMemberName: null,
            bidAmount: 0
          }
        ]
      },
      {
        id: "ev-2",
        title: "OverRun ประจำวันที่ 15/07/2026",
        type: "overrun",
        date: "2026-07-15",
        participants: ["2", "4", "6", "7", "8"],
        status: "completed",
        drops: [
          {
            id: "dr-3",
            itemName: "ขนนกแดงดำ (Red-Black Feather)",
            quantity: 2,
            assignedToMemberId: "2",
            assignedToMemberName: "บอสใหญ่ใจดี",
            bidAmount: 4500
          },
          {
            id: "dr-4",
            itemName: "Puppet Card",
            quantity: 1,
            assignedToMemberId: "4",
            assignedToMemberName: "SniperNo1",
            bidAmount: 12000
          }
        ]
      }
    ],
    rafflePrizes: [
      { id: "p-1", name: "Oridecon Box", quantity: 5 },
      { id: "p-2", name: "Elunium Box", quantity: 5 },
    ],
    raffleResults: [
      { id: "r-1", prizeName: "Oridecon Box", winnerName: "AssassinCross", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), itemType: "material" },
    ],
    discordConfig: {
      webhookUrl: "",
      botName: "บอทกิลด์ RO Classic",
      enabled: false,
    },
    systemPIN: "ro-classic-1234",
    adminPIN: "ro-admin-5678",
    guildGuidelines: "1. เข้าร่วมกิลด์วอทุกวันอังคารและเสาร์ เวลา 20.00 - 22.00 น. กรุณามาสแตนด์บายก่อนเวลา 15 นาที\n2. ลงทะเบียนเข้าร่วมกิจกรรมหรือแจ้งลาล่วงหน้าในระบบทุกครั้งก่อนกิจกรรมเริ่ม 1 ชั่วโมง\n3. การจัดสรรไอเทมดรอปจะใช้ระบบคิววนรอบ (Cycle Allocation) และแต้มสงครามเพื่อความโปร่งใสและเป็นธรรมที่สุด\n4. ห้ามลักลอบหรือแอบดีลไอเทมกิจกรรมโดยไม่ผ่านการจัดสรรจากผู้ดูแลระบบ\n5. สมาชิกทุกคนต้องมีส่วนร่วมในการช่วยเหลือเพื่อนร่วมกิลด์ และร่วมกิจกรรมต่าง ๆ ด้วยความเคารพซึ่งกันและกัน",
    lastUpdated: new Date().toISOString()
  };
};

// Initialize Firebase Admin
const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), "firebase-service-account.json");
let db: any = null;

try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully using process.env.FIREBASE_SERVICE_ACCOUNT.");
    } else if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, "utf-8"));
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully using service account file.");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
      // If running in Google Cloud or environment with default credentials
      initializeApp({
        projectId: "rooc-guild-management-c360c"
      });
      console.log("Firebase Admin initialized with project ID: rooc-guild-management-c360c");
    } else {
      console.warn("⚠️ [Warning]: Firebase service account not found in env or file. Firestore is disabled; falling back to local file storage.");
    }
  }

  if (getApps().length > 0) {
    db = getFirestore();
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

// Global state variable
let state: GuildState;

function loadLocalState(): GuildState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      const localState = JSON.parse(raw);
      if (!localState.adminPIN) {
        localState.adminPIN = "ro-admin-5678";
      }
      if (localState.guildGuidelines === undefined) {
        localState.guildGuidelines = "1. เข้าร่วมกิลด์วอทุกวันอังคารและเสาร์ เวลา 20.00 - 22.00 น. กรุณามาสแตนด์บายก่อนเวลา 15 นาที\n2. ลงทะเบียนเข้าร่วมกิจกรรมหรือแจ้งลาล่วงหน้าในระบบทุกครั้งก่อนกิจกรรมเริ่ม 1 ชั่วโมง\n3. การจัดสรรไอเทมดรอปจะใช้ระบบคิววนรอบ (Cycle Allocation) และแต้มสงครามเพื่อความโปร่งใสและเป็นธรรมที่สุด\n4. ห้ามลักลอบหรือแอบดีลไอเทมกิจกรรมโดยไม่ผ่านการจัดสรรจากผู้ดูแลระบบ\n5. สมาชิกทุกคนต้องมีส่วนร่วมในการช่วยเหลือเพื่อนร่วมกิลด์ และร่วมกิจกรรมต่าง ๆ ด้วยความเคารพซึ่งกันและกัน";
      }
      if (!localState.jobClasses) {
        localState.jobClasses = DEFAULT_JOB_CLASSES;
      }
      return localState;
    }
  } catch (e) {
    console.error("Error reading local state file:", e);
  }
  return getInitialState();
}

// Load state from Firestore or local fallback
async function loadStateFromFirestore(): Promise<GuildState> {
  if (db) {
    try {
      // Load members
      const membersSnap = await db.collection("members").get();
      const members = membersSnap.docs.map((doc: any) => doc.data() as Member);

      // If no members are found in Firestore, we seed from local JSON
      if (members.length === 0) {
        console.log("Firestore members collection is empty, seeding collections from local JSON...");
        state = loadLocalState();
        await saveStateToFirestore(state);
        return state;
      }

      const settingsDoc = await db.collection("config").doc("settings").get();
      const settingsData = settingsDoc.exists ? settingsDoc.data() : {};

      // Load jobClasses from masterData/jobClasses
      const jobClassesDoc = await db.collection("masterData").doc("jobClasses").get();
      let jobClasses: string[] = [];
      if (jobClassesDoc.exists) {
        jobClasses = jobClassesDoc.data()?.classes || [];
      } else {
        // Seed if missing
        jobClasses = DEFAULT_JOB_CLASSES;
        await db.collection("masterData").doc("jobClasses").set({ classes: jobClasses });
      }
      
      // Load masterItems
      const itemsSnap = await db.collection("masterItems").get();
      const masterItems = itemsSnap.docs.map((doc: any) => doc.data());
      
      // Load events
      const eventsSnap = await db.collection("events").get();
      const events = eventsSnap.docs.map((doc: any) => doc.data());
      
      // Load rafflePrizes
      const prizesSnap = await db.collection("rafflePrizes").get();
      const rafflePrizes = prizesSnap.docs.map((doc: any) => doc.data());
      
      // Load raffleResults
      const resultsSnap = await db.collection("raffleResults").get();
      const raffleResults = resultsSnap.docs.map((doc: any) => doc.data());

      state = {
        members,
        masterItems,
        events,
        rafflePrizes,
        raffleResults,
        discordConfig: settingsData.discordConfig || { webhookUrl: "", botName: "บอทกิลด์ RO Classic", enabled: false },
        systemPIN: settingsData.systemPIN || "ro-classic-1234",
        adminPIN: settingsData.adminPIN || "ro-admin-5678",
        guildGuidelines: settingsData.guildGuidelines || "",
        guildName: settingsData.guildName || "",
        jobClasses,
        lastUpdated: settingsData.lastUpdated || new Date().toISOString()
      };

      console.log("Loaded state from Firestore collections successfully.");
      return state;
    } catch (e) {
      console.error("Error reading from Firestore collections, falling back to local file:", e);
    }
  }
  state = loadLocalState();
  return state;
}

// Save state to Firestore and backup to local file
async function saveStateToFirestore(newState: GuildState) {
  newState.lastUpdated = new Date().toISOString();
  state = newState;
  
  // Try saving to Firestore
  if (db) {
    try {
      const batch = db.batch();

      // 1. Sync members
      const existingMembersSnap = await db.collection("members").get();
      const existingMemberIds = existingMembersSnap.docs.map((doc: any) => doc.id);
      const newMemberIds = newState.members.map(m => m.id);
      for (const id of existingMemberIds) {
        if (!newMemberIds.includes(id)) {
          batch.delete(db.collection("members").doc(id));
        }
      }
      for (const member of newState.members) {
        batch.set(db.collection("members").doc(member.id), member);
      }

      // 2. Sync masterItems
      const existingItemsSnap = await db.collection("masterItems").get();
      const existingItemIds = existingItemsSnap.docs.map((doc: any) => doc.id);
      const newItemIds = (newState.masterItems || []).map(item => item.id);
      for (const id of existingItemIds) {
        if (!newItemIds.includes(id)) {
          batch.delete(db.collection("masterItems").doc(id));
        }
      }
      for (const item of (newState.masterItems || [])) {
        batch.set(db.collection("masterItems").doc(item.id), item);
      }

      // 3. Sync events
      const existingEventsSnap = await db.collection("events").get();
      const existingEventIds = existingEventsSnap.docs.map((doc: any) => doc.id);
      const newEventIds = (newState.events || []).map(e => e.id);
      for (const id of existingEventIds) {
        if (!newEventIds.includes(id)) {
          batch.delete(db.collection("events").doc(id));
        }
      }
      for (const event of (newState.events || [])) {
        batch.set(db.collection("events").doc(event.id), event);
      }

      // 4. Sync rafflePrizes
      const existingPrizesSnap = await db.collection("rafflePrizes").get();
      const existingPrizeIds = existingPrizesSnap.docs.map((doc: any) => doc.id);
      const newPrizeIds = (newState.rafflePrizes || []).map(p => p.id);
      for (const id of existingPrizeIds) {
        if (!newPrizeIds.includes(id)) {
          batch.delete(db.collection("rafflePrizes").doc(id));
        }
      }
      for (const prize of (newState.rafflePrizes || [])) {
        batch.set(db.collection("rafflePrizes").doc(prize.id), prize);
      }

      // 5. Sync raffleResults
      const existingResultsSnap = await db.collection("raffleResults").get();
      const existingResultIds = existingResultsSnap.docs.map((doc: any) => doc.id);
      const newResultIds = (newState.raffleResults || []).map(r => r.id);
      for (const id of existingResultIds) {
        if (!newResultIds.includes(id)) {
          batch.delete(db.collection("raffleResults").doc(id));
        }
      }
      for (const result of (newState.raffleResults || [])) {
        batch.set(db.collection("raffleResults").doc(result.id), result);
      }

      // 6. Settings doc
      const settingsDocRef = db.collection("config").doc("settings");
      batch.set(settingsDocRef, {
        discordConfig: newState.discordConfig || { webhookUrl: "", botName: "บอทกิลด์ RO Classic", enabled: false },
        systemPIN: newState.systemPIN || "ro-classic-1234",
        adminPIN: newState.adminPIN || "ro-admin-5678",
        guildGuidelines: newState.guildGuidelines || "",
        guildName: newState.guildName || "",
        lastUpdated: newState.lastUpdated
      });

      // 7. Sync jobClasses to masterData/jobClasses
      const jobClassesDocRef = db.collection("masterData").doc("jobClasses");
      batch.set(jobClassesDocRef, {
        classes: newState.jobClasses || []
      });

      await batch.commit();
      console.log("Saved state to Firestore collections successfully.");
    } catch (e) {
      console.error("Failed to save state to Firestore collections:", e);
    }
  }

  // Always backup locally
  saveLocalBackup();
}

function saveLocalBackup() {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write local backup state file:", e);
  }
}

const app = express();

// Lazy database state initialization (essential for Serverless environment like Vercel)
let initPromise: Promise<GuildState> | null = null;
app.use(async (req, res, next) => {
  if (!initPromise) {
    initPromise = loadStateFromFirestore().catch((err) => {
      console.error("Database state initialization failed:", err);
      initPromise = null; // Reset to allow retry on next request
      throw err;
    });
  }
  try {
    await initPromise;
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Database initialization failed",
      message: err?.message || String(err),
      stack: err?.stack
    });
  }
  next();
});

// Middleware
app.use(express.json());

  // API 1: Get complete state
  app.get("/api/state", async (req, res) => {
    try {
      const currentState = await loadStateFromFirestore();
      res.json(currentState);
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: "Failed to load state" });
    }
  });

  // API 2: Update complete state
  app.post("/api/state", async (req, res) => {
    try {
      const incoming = req.body as GuildState;
      if (incoming && typeof incoming === "object") {
        const currentState = await loadStateFromFirestore();
        const updatedState = {
          ...currentState,
          ...incoming,
        };
        await saveStateToFirestore(updatedState);
        return res.json({ success: true, message: "State updated successfully", state: updatedState });
      }
      return res.status(400).json({ success: false, message: "Invalid payload format" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // --- CRUD API for Members ---
  app.get("/api/members", async (req, res) => {
    if (!db) return res.json(state.members || []);
    try {
      const snap = await db.collection("members").get();
      const members = snap.docs.map((doc: any) => doc.data() as Member);
      res.json(members);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/members", async (req, res) => {
    const member = req.body as Member;
    if (!member || !member.id) return res.status(400).json({ error: "Invalid member data" });
    state.members = (state.members || []).filter(m => m.id !== member.id);
    state.members.push(member);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("members").doc(member.id).set(member);
        return res.json({ success: true, member });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save member" });
      }
    }
    res.json({ success: true, member });
  });

  app.put("/api/members/:id", async (req, res) => {
    const { id } = req.params;
    const member = req.body as Member;
    if (!member) return res.status(400).json({ error: "Invalid member data" });
    member.id = id;
    state.members = (state.members || []).map(m => m.id === id ? member : m);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("members").doc(id).set(member, { merge: true });
        return res.json({ success: true, member });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update member" });
      }
    }
    res.json({ success: true, member });
  });

  app.delete("/api/members/:id", async (req, res) => {
    const { id } = req.params;
    state.members = (state.members || []).filter(m => m.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("members").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete member" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for MasterItems ---
  app.get("/api/masterItems", async (req, res) => {
    if (!db) return res.json(state.masterItems || []);
    try {
      const snap = await db.collection("masterItems").get();
      const items = snap.docs.map((doc: any) => doc.data());
      res.json(items);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch masterItems" });
    }
  });

  app.post("/api/masterItems", async (req, res) => {
    const item = req.body;
    if (!item || !item.id) return res.status(400).json({ error: "Invalid item data" });
    state.masterItems = (state.masterItems || []).filter(i => i.id !== item.id);
    state.masterItems.push(item);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("masterItems").doc(item.id).set(item);
        return res.json({ success: true, item });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save item" });
      }
    }
    res.json({ success: true, item });
  });

  app.put("/api/masterItems/:id", async (req, res) => {
    const { id } = req.params;
    const item = req.body;
    if (!item) return res.status(400).json({ error: "Invalid item data" });
    item.id = id;
    state.masterItems = (state.masterItems || []).map(i => i.id === id ? item : i);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("masterItems").doc(id).set(item, { merge: true });
        return res.json({ success: true, item });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update item" });
      }
    }
    res.json({ success: true, item });
  });

  app.delete("/api/masterItems/:id", async (req, res) => {
    const { id } = req.params;
    state.masterItems = (state.masterItems || []).filter(i => i.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("masterItems").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete item" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for Events ---
  app.get("/api/events", async (req, res) => {
    if (!db) return res.json(state.events || []);
    try {
      const snap = await db.collection("events").get();
      const events = snap.docs.map((doc: any) => doc.data());
      res.json(events);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    const event = req.body;
    if (!event || !event.id) return res.status(400).json({ error: "Invalid event data" });
    state.events = (state.events || []).filter(e => e.id !== event.id);
    state.events.push(event);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("events").doc(event.id).set(event);
        return res.json({ success: true, event });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save event" });
      }
    }
    res.json({ success: true, event });
  });

  app.put("/api/events/:id", async (req, res) => {
    const { id } = req.params;
    const event = req.body;
    if (!event) return res.status(400).json({ error: "Invalid event data" });
    event.id = id;
    state.events = (state.events || []).map(e => e.id === id ? event : e);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("events").doc(id).set(event, { merge: true });
        return res.json({ success: true, event });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update event" });
      }
    }
    res.json({ success: true, event });
  });

  app.delete("/api/events/:id", async (req, res) => {
    const { id } = req.params;
    state.events = (state.events || []).filter(e => e.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("events").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete event" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for RafflePrizes ---
  app.get("/api/rafflePrizes", async (req, res) => {
    if (!db) return res.json(state.rafflePrizes || []);
    try {
      const snap = await db.collection("rafflePrizes").get();
      const prizes = snap.docs.map((doc: any) => doc.data());
      res.json(prizes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch rafflePrizes" });
    }
  });

  app.post("/api/rafflePrizes", async (req, res) => {
    const prize = req.body;
    if (!prize || !prize.id) return res.status(400).json({ error: "Invalid prize data" });
    state.rafflePrizes = (state.rafflePrizes || []).filter(p => p.id !== prize.id);
    state.rafflePrizes.push(prize);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("rafflePrizes").doc(prize.id).set(prize);
        return res.json({ success: true, prize });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save prize" });
      }
    }
    res.json({ success: true, prize });
  });

  app.put("/api/rafflePrizes/:id", async (req, res) => {
    const { id } = req.params;
    const prize = req.body;
    if (!prize) return res.status(400).json({ error: "Invalid prize data" });
    prize.id = id;
    state.rafflePrizes = (state.rafflePrizes || []).map(p => p.id === id ? prize : p);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("rafflePrizes").doc(id).set(prize, { merge: true });
        return res.json({ success: true, prize });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update prize" });
      }
    }
    res.json({ success: true, prize });
  });

  app.delete("/api/rafflePrizes/:id", async (req, res) => {
    const { id } = req.params;
    state.rafflePrizes = (state.rafflePrizes || []).filter(p => p.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("rafflePrizes").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete prize" });
      }
    }
    res.json({ success: true });
  });

  // --- CRUD API for RaffleResults ---
  app.get("/api/raffleResults", async (req, res) => {
    if (!db) return res.json(state.raffleResults || []);
    try {
      const snap = await db.collection("raffleResults").get();
      const results = snap.docs.map((doc: any) => doc.data());
      res.json(results);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch raffleResults" });
    }
  });

  app.post("/api/raffleResults", async (req, res) => {
    const result = req.body;
    if (!result || !result.id) return res.status(400).json({ error: "Invalid result data" });
    state.raffleResults = (state.raffleResults || []).filter(r => r.id !== result.id);
    state.raffleResults.push(result);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("raffleResults").doc(result.id).set(result);
        return res.json({ success: true, result });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to save result" });
      }
    }
    res.json({ success: true, result });
  });

  app.put("/api/raffleResults/:id", async (req, res) => {
    const { id } = req.params;
    const result = req.body;
    if (!result) return res.status(400).json({ error: "Invalid result data" });
    result.id = id;
    state.raffleResults = (state.raffleResults || []).map(r => r.id === id ? result : r);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("raffleResults").doc(id).set(result, { merge: true });
        return res.json({ success: true, result });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update result" });
      }
    }
    res.json({ success: true, result });
  });

  // --- CRUD API for Config ---
  app.get("/api/config", async (req, res) => {
    if (!db) {
      return res.json({
        discordConfig: state.discordConfig,
        systemPIN: state.systemPIN,
        adminPIN: state.adminPIN,
        guildGuidelines: state.guildGuidelines,
        guildName: state.guildName,
        jobClasses: state.jobClasses,
        lastUpdated: state.lastUpdated
      });
    }
    try {
      const doc = await db.collection("config").doc("settings").get();
      if (doc.exists) {
        res.json(doc.data());
      } else {
        res.status(404).json({ error: "Config settings not found" });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch config settings" });
    }
  });

  app.post("/api/config", async (req, res) => {
    const incoming = req.body;
    if (!incoming) return res.status(400).json({ error: "Invalid config data" });
    state.discordConfig = incoming.discordConfig || state.discordConfig;
    state.systemPIN = incoming.systemPIN || state.systemPIN;
    state.adminPIN = incoming.adminPIN || state.adminPIN;
    state.guildGuidelines = incoming.guildGuidelines || state.guildGuidelines;
    state.guildName = incoming.guildName || state.guildName;
    state.jobClasses = incoming.jobClasses || state.jobClasses;
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("config").doc("settings").set(incoming, { merge: true });
        return res.json({ success: true, config: incoming });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to update config settings" });
      }
    }
    res.json({ success: true, config: incoming });
  });

  app.delete("/api/raffleResults/:id", async (req, res) => {
    const { id } = req.params;
    state.raffleResults = (state.raffleResults || []).filter(r => r.id !== id);
    saveLocalBackup();
    if (db) {
      try {
        await db.collection("raffleResults").doc(id).delete();
        return res.json({ success: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Failed to delete result" });
      }
    }
    res.json({ success: true });
  });


  // API 3: Dispatch notification to Discord webhook
  app.post("/api/discord-notify", async (req, res) => {
    const { title, message, fields, color, webhookUrlOverride, webhookType } = req.body;
    
    let webhookUrl = webhookUrlOverride;
    if (!webhookUrl) {
      if (webhookType === "leaves") {
        webhookUrl = state.discordConfig.webhookUrlLeaves || state.discordConfig.webhookUrl;
      } else if (webhookType === "events") {
        webhookUrl = state.discordConfig.webhookUrlEvents || state.discordConfig.webhookUrl;
      } else if (webhookType === "raffles") {
        webhookUrl = state.discordConfig.webhookUrlRaffles || state.discordConfig.webhookUrl;
      } else {
        webhookUrl = state.discordConfig.webhookUrl;
      }
    }
    
    const enabled = (webhookUrlOverride || webhookType) ? true : state.discordConfig.enabled;
    const botName = state.discordConfig.botName || "RO Classic Guild Bot";

    console.log(`[Discord Bot Log]: "${title}" - ${message}`);

    const discordPayload: any = {
      username: botName,
      avatar_url: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shield.png",
    };

    if (req.body.content) {
      discordPayload.content = req.body.content;
    } else {
      discordPayload.embeds = [
        {
          title: title || "📣 แจ้งเตือนจากกิลด์ RO Classic",
          description: message || "มีการอัปเดตใหม่ในระบบกิลด์",
          color: color || 15844367, // Default Gold-ish color (hex: #F1C40F)
          fields: fields || [],
          timestamp: new Date().toISOString(),
          footer: {
            text: "ระบบจัดการกิลด์ RO Classic - โปร่งใส ตรวจสอบได้",
          }
        }
      ];
    }

    // If webhook is disabled or empty, we simulate it
    if (!enabled || !webhookUrl) {
      return res.json({
        success: true,
        simulated: true,
        message: "จำลองการส่งข้อมูลเรียบร้อย (เนื่องจากยังไม่ได้ตั้งค่า Webhook URL หรือปิดการใช้งาน)",
        payload: discordPayload
      });
    }

    try {
      // Real fetch request to Discord Webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(discordPayload)
      });

      if (response.ok) {
        return res.json({ success: true, message: "ส่งข้อความไปยัง Discord เรียบร้อยแล้ว!" });
      } else {
        const errText = await response.text();
        return res.status(400).json({
          success: false,
          message: `Discord Webhook Error: ${response.status} ${errText}`
        });
      }
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        message: `ล้มเหลวในการเชื่อมต่อ Discord: ${e?.message || e}`
      });
    }
  });

// Global error handler middleware to catch and print production errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err?.message || String(err),
    stack: err?.stack
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const viteModuleName = "vite";
    const { createServer } = await import(viteModuleName);
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })().catch(err => {
    console.error("Failed to initialize Vite development server:", err);
  });
} else if (!process.env.VERCEL) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start local listener if not running in a Serverless environment like Vercel
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
