import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth().verifyIdToken(idToken);

    // Check admin role in Firestore
    const adminDoc = await adminDb()
      .collection("roles_admin")
      .doc(decoded.uid)
      .get();

    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { name, email, password, judgeRegistryId } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
    }

    // Create the Firebase Auth user
    const userRecord = await adminAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // Write the judge role document
    await adminDb()
      .collection("roles_judge")
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email,
        displayName: name,
        role: "judge",
        judgeRegistryId: judgeRegistryId || null,
        createdAt: FieldValue.serverTimestamp(),
      });

    // If a registry record exists, link the uid back to it
    if (judgeRegistryId) {
      await adminDb()
        .collection("judges_registry")
        .doc(judgeRegistryId)
        .update({ uid: userRecord.uid, email });
    }

    return NextResponse.json({ uid: userRecord.uid, email, displayName: name });
  } catch (err: any) {
    console.error("Judge create error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create judge account" },
      { status: 500 }
    );
  }
}
