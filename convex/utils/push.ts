export async function sendPushNotification(token: string, title: string, body: string) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.error("FCM_SERVER_KEY manquante");
    return;
  }

  try {
    await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: { title, body },
      }),
    });
  } catch (err) {
    console.error("Erreur envoi push:", err);
  }
}