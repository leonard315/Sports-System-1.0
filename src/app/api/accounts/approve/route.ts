import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth().verifyIdToken(idToken);

    // Must be admin
    const adminDoc = await adminDb().collection("roles_admin").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { requestId, action } = await req.json(); // action: "approve" | "reject"
    if (!requestId || !action) {
      return NextResponse.json({ error: "requestId and action required" }, { status: 400 });
    }

    const reqDoc = await adminDb().collection("account_requests").doc(requestId).get();
    if (!reqDoc.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const data = reqDoc.data()!;

    if (action === "reject") {
      await adminDb().collection("account_requests").doc(requestId).update({
        status: "rejected",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: decoded.uid,
      });
      return NextResponse.json({ success: true, action: "rejected" });
    }

    // Approve: create Firebase Auth user
    const userRecord = await adminAuth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
    });

    // Write role document based on requested role
    const role = data.role; // "judge" | "user"
    if (role === "judge") {
      await adminDb().collection("roles_judge").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: data.email,
        displayName: data.name,
        role: "judge",
        judgeRegistryId: null,
        createdAt: FieldValue.serverTimestamp(),
      });
      // Also add to judges_registry
      const judgeRef = adminDb().collection("judges_registry").doc();
      await judgeRef.set({
        id: judgeRef.id,
        name: data.name,
        email: data.email,
        uid: userRecord.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Regular user/viewer — write to app_users
      await adminDb().collection("app_users").doc(userRecord.uid).set({
        id: userRecord.uid,
        email: data.email,
        displayName: data.name,
        role: "viewer",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Mark request as approved
    await adminDb().collection("account_requests").doc(requestId).update({
      status: "approved",
      uid: userRecord.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: decoded.uid,
    });

    return NextResponse.json({ success: true, uid: userRecord.uid, action: "approved" });
  } catch (err: any) {
    console.error("Approve account error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
