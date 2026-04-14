import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
admin.initializeApp({
  projectId: firebaseConfig.projectId
});
const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);

async function check() {
  const users = await db.collection("users").get();
  console.log(`Found ${users.size} users`);
  users.forEach(doc => {
    const data = doc.data();
    console.log(`User ${doc.id}: fcmToken exists? ${!!data.fcmToken}`);
    if (data.fcmToken) {
      console.log(`Token: ${data.fcmToken.substring(0, 20)}...`);
    }
  });
}
check().catch(console.error);
