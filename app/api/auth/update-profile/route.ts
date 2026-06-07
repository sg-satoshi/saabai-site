/**
 * Update Profile API
 *
 * Accepts full user profile data and saves to the Redis directory
 * under the user's `profile` field.
 */
import { type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { loadClients } from "../../../../lib/clients";
import { listDirectoryUsers, saveDirectoryUser, type UserProfile } from "../../../../lib/user-directory";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return Response.json({ error: "Invalid session." }, { status: 401 });
    }

    const { clientId } = session;
    const body = await req.json();

    // Env-var clients can not be updated via the API
    const envClient = loadClients().find((c) => c.id === clientId);
    if (envClient) {
      return Response.json(
        { error: "Your profile is managed through environment variables. Contact hello@saabai.ai to make changes." },
        { status: 400 }
      );
    }

    // Find the user in Redis directory
    const allUsers = await listDirectoryUsers();
    const dirUser = allUsers.find((u) => u.id === clientId);
    if (!dirUser) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    // Update name if provided
    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return Response.json({ error: "Name is required." }, { status: 400 });
      }
      dirUser.name = body.name.trim();
    }

    // Build the profile object from submitted fields (only include non-null values)
    const profile: UserProfile = { ...(dirUser.profile || {}) };

    if (body.phone !== undefined) profile.phone = body.phone;
    if (body.mobile !== undefined) profile.mobile = body.mobile;
    if (body.gender !== undefined) profile.gender = body.gender;
    if (body.dateOfBirth !== undefined) profile.dateOfBirth = body.dateOfBirth;
    if (body.businessName !== undefined) profile.businessName = body.businessName;
    if (body.businessType !== undefined) profile.businessType = body.businessType;
    if (body.interests !== undefined) profile.interests = body.interests;
    if (body.favouriteBrands !== undefined) profile.favouriteBrands = body.favouriteBrands;
    if (body.favouriteProducts !== undefined) profile.favouriteProducts = body.favouriteProducts;
    if (body.referralSource !== undefined) profile.referralSource = body.referralSource;
    if (body.marketingConsent !== undefined) profile.marketingConsent = body.marketingConsent;
    if (body.notes !== undefined) profile.notes = body.notes;

    // Address fields
    if (body.address !== undefined || body.street || body.suburb || body.city || body.state || body.postcode) {
      profile.address = {
        ...(profile.address || {}),
        ...(body.street !== undefined ? { street: body.street } : {}),
        ...(body.suburb !== undefined ? { suburb: body.suburb } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.state !== undefined ? { state: body.state } : {}),
        ...(body.postcode !== undefined ? { postcode: body.postcode } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
      };
    }

    dirUser.profile = profile;
    await saveDirectoryUser(dirUser);

    return Response.json({ ok: true, name: dirUser.name, profile });
  } catch (e) {
    console.error("[Update Profile] Error:", e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
