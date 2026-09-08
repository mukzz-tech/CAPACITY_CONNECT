import { prisma } from '../src/prisma.js';
import { supabase, isSupabaseConfigured } from '../src/services/supabaseClient.js';

async function syncAllToSupabase() {
  console.log('--- SYNCING ALL LOCAL DATA DIRECTLY INTO SUPABASE ---');

  if (!isSupabaseConfigured) {
    console.error('Supabase is not configured!');
    return;
  }

  // 1. Sync Users
  const localUsers = await prisma.user.findMany({ include: { profile: true } });
  console.log(`Found ${localUsers.length} local users. Pushing to Supabase...`);

  for (const u of localUsers) {
    const { error: uErr } = await supabase.from('User').upsert({
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
      requestedRole: u.requestedRole,
      approvalStatus: u.approvalStatus,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }, { onConflict: 'email' });

    if (uErr) {
      console.error(`Failed to sync user ${u.email}:`, uErr.message);
    } else {
      console.log(`✅ Synced User: ${u.email} (${u.role})`);
    }

    if (u.profile) {
      const { error: pErr } = await supabase.from('Profile').upsert({
        id: u.profile.id,
        userId: u.id,
        fullName: u.profile.fullName,
        jobDesignation: u.profile.jobDesignation,
        department: u.profile.department,
        yearsExperience: u.profile.yearsExperience,
        languagePref: u.profile.languagePref,
        qualifications: u.profile.qualifications,
        skills: u.profile.skills,
      }, { onConflict: 'id' });

      if (pErr) {
        console.error(`Failed to sync profile for ${u.email}:`, pErr.message);
      } else {
        console.log(`   └─ ✅ Synced Profile: ${u.profile.fullName}`);
      }
    }
  }

  // 2. Sync Announcements
  const localAnnouncements = await prisma.announcement.findMany();
  for (const a of localAnnouncements) {
    await supabase.from('Announcement').upsert({
      id: a.id,
      title: a.title,
      content: a.content,
      isPublished: a.isPublished,
      priority: a.priority,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }, { onConflict: 'id' });
  }
  console.log(`✅ Synced ${localAnnouncements.length} announcements.`);

  console.log('--- SYNC COMPLETED SUCCESSFULLY ---');
}

syncAllToSupabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
