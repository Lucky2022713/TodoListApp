// src/notifications.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1) Create an Android channel for task reminders.
async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: true,
    });
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  await ensureChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  return true;
}

export async function scheduleTaskAlarm(task) {
  await ensureChannel();
  if (task.completed) return;

  const due = new Date(`${task.due_date}T${task.due_time}`);
  const now = Date.now();
  if (due.getTime() <= now) return;

  const schedule = ({ title, body }, trigger) =>
    Notifications.scheduleNotificationAsync({
      content: { title, body, channelId: 'task-reminders' },
      trigger,
    });

  const secondsUntilDue = (due.getTime() - now) / 1000;

  // 10 minutes before
  const sec10Before = secondsUntilDue - 10 * 60;
  if (sec10Before > 0) {
    await schedule(
      {
        title: 'Upcoming Task Due',
        body: `"${task.text}" is due in 10 minutes!`,
      },
      { seconds: sec10Before, repeats: false }
    );
  }

  // 5 minutes before
  const sec5Before = secondsUntilDue - 5 * 60;
  if (sec5Before > 0) {
    await schedule(
      {
        title: 'Last Reminder: 5 Minutes Left',
        body: `"${task.text}" is due in 5 minutes!`,
      },
      { seconds: sec5Before, repeats: false }
    );
  }

  // Exact due‐time
  await schedule(
    {
      title: 'Task Due Now',
      body: `"${task.text}" is due now!`,
    },
    { seconds: secondsUntilDue, repeats: false }
  );

  // Start repeating 10 min after due, then every 10 min
  await schedule(
    {
      title: 'Task Still Due',
      body: `"${task.text}" is still due. Please complete it ASAP!`,
    },
    { seconds: secondsUntilDue + 10 * 60, repeats: true }
  );
}

export async function cancelAllTaskAlarms() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
