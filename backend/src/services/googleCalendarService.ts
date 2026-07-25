import { google } from 'googleapis';
import { User } from '../models/User';
import { Schedule } from '../models/Schedule';

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'fallback_google_client_id';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'fallback_google_client_secret';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const getGoogleAuthUrl = (userId: string): string => {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: userId,
  });
};

export const handleGoogleOAuthCallback = async (code: string, userId: string) => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const updatedTokens = {
    access_token: tokens.access_token || user.googleTokens?.access_token || null,
    refresh_token: tokens.refresh_token || user.googleTokens?.refresh_token || null,
    expiry_date: tokens.expiry_date || user.googleTokens?.expiry_date || null,
    token_type: tokens.token_type || user.googleTokens?.token_type || null,
  };

  user.googleTokens = updatedTokens;
  user.googleCalendarSyncEnabled = true;
  await user.save();

  // Perform initial 2-way sync
  await syncGoogleCalendar2Way(userId);

  return user;
};

export const getAuthenticatedCalendarClient = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || !user.googleTokens || !user.googleTokens.access_token) {
    throw new Error('User not authenticated with Google Calendar');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.googleTokens.access_token || undefined,
    refresh_token: user.googleTokens.refresh_token || undefined,
    expiry_date: user.googleTokens.expiry_date || undefined,
    token_type: user.googleTokens.token_type || undefined,
  });

  // Auto token refresh event listener
  oauth2Client.on('tokens', async (newTokens) => {
    if (user.googleTokens) {
      user.googleTokens = {
        access_token: newTokens.access_token || user.googleTokens.access_token,
        refresh_token: newTokens.refresh_token || user.googleTokens.refresh_token,
        expiry_date: newTokens.expiry_date || user.googleTokens.expiry_date,
        token_type: newTokens.token_type || user.googleTokens.token_type,
      };
      await user.save();
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

export const syncGoogleCalendar2Way = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || !user.googleCalendarSyncEnabled || !user.googleTokens) {
    return { message: 'Google Calendar sync is disabled or not configured.' };
  }

  try {
    const calendar = await getAuthenticatedCalendarClient(userId);

    // -------------------------------------------------------------
    // STEP 1: PUSH (Local MongoDB Schedules -> Google Calendar)
    // -------------------------------------------------------------
    const localSchedules = await Schedule.find({
      createdBy: userId,
      $or: [{ 'recurrence.type': { $exists: false } }, { 'recurrence.type': 'none' }],
    });

    for (const schedule of localSchedules) {
      const eventPayload = {
        summary: schedule.title,
        description: schedule.description || '',
        start: {
          dateTime: new Date(schedule.startTime).toISOString(),
        },
        end: {
          dateTime: new Date(schedule.endTime).toISOString(),
        },
      };

      if (!schedule.googleEventId) {
        // Insert new event into Google Calendar
        try {
          const createdGEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventPayload,
          });

          if (createdGEvent.data && createdGEvent.data.id) {
            schedule.googleEventId = createdGEvent.data.id;
            schedule.syncedWithGoogle = true;
            await schedule.save();
          }
        } catch (err: any) {
          console.error(`Failed to push schedule ${schedule._id} to Google:`, err.message);
        }
      } else if (!schedule.syncedWithGoogle) {
        // Update existing event on Google Calendar
        try {
          await calendar.events.patch({
            calendarId: 'primary',
            eventId: schedule.googleEventId,
            requestBody: eventPayload,
          });

          schedule.syncedWithGoogle = true;
          await schedule.save();
        } catch (err: any) {
          console.error(`Failed to update schedule ${schedule._id} on Google:`, err.message);
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 2: PULL (Google Calendar -> Local MongoDB Schedules)
    // -------------------------------------------------------------
    const syncTimeWindow = user.lastGoogleSyncAt
      ? new Date(user.lastGoogleSyncAt.getTime() - 5 * 60 * 1000).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const gEventsList = await calendar.events.list({
      calendarId: 'primary',
      updatedMin: syncTimeWindow,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleItems = gEventsList.data.items || [];

    for (const gEvent of googleItems) {
      if (!gEvent.id || gEvent.status === 'cancelled') {
        // Handle deletion if needed
        if (gEvent.id) {
          await Schedule.deleteMany({ createdBy: userId, googleEventId: gEvent.id });
        }
        continue;
      }

      const gStart = gEvent.start?.dateTime || gEvent.start?.date;
      const gEnd = gEvent.end?.dateTime || gEvent.end?.date;
      if (!gStart || !gEnd) continue;

      const startTime = new Date(gStart);
      const endTime = new Date(gEnd);

      const existingLocal = await Schedule.findOne({
        createdBy: userId,
        googleEventId: gEvent.id,
      });

      if (!existingLocal) {
        // Create new local schedule if not already present
        await Schedule.create({
          title: gEvent.summary || 'Google Event',
          description: gEvent.description || '',
          startTime,
          endTime,
          color: '#1890ff',
          category: 'Google Sync',
          createdBy: userId,
          googleEventId: gEvent.id,
          syncedWithGoogle: true,
        });
      } else {
        // Update local schedule if Google event changed
        existingLocal.title = gEvent.summary || existingLocal.title;
        existingLocal.description = gEvent.description || existingLocal.description || '';
        existingLocal.startTime = startTime;
        existingLocal.endTime = endTime;
        existingLocal.syncedWithGoogle = true;
        await existingLocal.save();
      }
    }

    user.lastGoogleSyncAt = new Date();
    await user.save();

    return {
      message: 'Đồng bộ 2 chiều với Google Calendar thành công!',
      pushedCount: localSchedules.length,
      pulledCount: googleItems.length,
    };
  } catch (error: any) {
    console.error(`Google Calendar 2-way sync error for user ${userId}:`, error.message);
    throw error;
  }
};
