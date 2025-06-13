/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {VertexAI} = require("@google-cloud/vertexai");
const vertexai = new VertexAI({project: "aidemo-jayden-a3d67", location: "us-central1"});
admin.initializeApp();


const prompt = `請用繁體中文寫一句有象徵意義的短語（不超過20字），
主題與AI、學習、創造力或未來有關。
風格要像詩句、嚴言、或書法對聯那樣簡練而有畫面感，
讓人看完會引發思考，不要使用口號語氣或直白描述。
請只回一句話。`;

// 🔹核心產生邏輯：可被排程與手動呼叫共用
/**
 * Generates a daily whisper by using a generative AI model.
 * The result is stored in Firestore under the current date.
 */
async function generateDailyWhisper() {
  // Define the model to be used
  const model = "gemini-1.5-flash";

  // Configure the generative model with settings
  const generativeModel = vertexai.getGenerativeModel({
    model,
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0.9,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_LOW_AND_ABOVE",
      },
    ],
  });

  // Generate content using the model with the specified prompt
  const result = await generativeModel.generateContent({
    contents: [{role: "user", parts: [{text: prompt}]}],
  });

  let text = "(產生失敗)"; // Default text in case of failure
  try {
    // Attempt to extract the generated text
    text = result.response.candidates[0].content.parts[0].text || text;
  } catch (e) {
    console.warn("⚠️ 回應結構異常，使用預設語錄"); // Log a warning if the structure is unexpected
  }

  // Get the current date in YYYY-MM-DD format
  const date = new Date().toISOString().split("T")[0];

  // Save the generated text to Firestore with the current date
  await admin.firestore().collection("inspirations").doc(date).set({
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("✅ 成功儲存語錄：", text); // Log success message
}


// 🔹 自動排程（每天一次）
exports.dailyWhisperScheduler = onSchedule("every 24 hours", async () => {
  await generateDailyWhisper();
});


// 🔹 HTTP API - /dailyWhisper?action=...
exports.dailyWhisper = functions.https.onRequest(async (req, res) => {
  const action = req.query.action;

  if (action === "generate") {
    await generateDailyWhisper();
    return res.send("✅ 語錄已手動產生");
  }

  if (action === "view") {
    const date = new Date().toISOString().split("T")[0];
    const doc = await admin.firestore().collection("inspirations").doc(date).get();

    if (!doc.exists) return res.status(404).send("❗ 今日尚未有語錄");
    return res.send(`📖 今日語錄：${doc.data().text}`);
  }

  return res.send(`
    🤖 dailyWhisper API 使用方式：
    - /dailyWhisper?action=generate 👉 手動產生語錄
    - /dailyWhisper?action=view 👉 讀取今日語錄
  `);
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
